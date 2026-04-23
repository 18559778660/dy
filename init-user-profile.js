// 用户画像页初始化
// 数据源：conf/user-profile-data.json
// 顶层大分类（独立于其它页面）：
//   window._profileAppId    —— 'dy' | 'dy_lite' | ...       默认 'dy'（不含"全部"）
//   window._profileCategory —— 'active' | 'new'             默认 'active'
//   range 时间范围           —— 'yesterday' | 7 | 30          读取 .user-gender-section 选中按钮，UI 默认"昨天"
//
// 对外 API：
//   window.initUserProfile()      页面加载时调一次
//   window.updateUserProfile(opts)顶层下拉 / 天数切换后调用，opts 可选 { range }
//
// 聚合规则（多天汇总）：
//   · 性别/年龄：按 label 或 range 分组，activeUsers / newUsers 直接相加
//   · 地域：按 province / city 分组，activeVisitors / newVisitors 直接相加（后续接入时用）
//
// 目前渲染：性别分布表 + 年龄分布表；地域 / 图表后续再接
(function () {
  'use strict';

  const DATA_URL = './conf/user-profile-data.json';

  if (typeof window._profileAppId === 'undefined') window._profileAppId = 'dy';
  if (typeof window._profileCategory === 'undefined') window._profileCategory = 'active';
  // 地域 tab 维度（省份 / 城市）—— 目前只做 UI 切换，数据渲染后续再接
  if (typeof window._profileRegionDim === 'undefined') window._profileRegionDim = 'province';

  let _dataCache = null;
  function loadData() {
    if (_dataCache) return Promise.resolve(_dataCache);
    return fetch(DATA_URL).then(res => {
      if (!res.ok) throw new Error(`加载用户画像数据失败: ${res.status}`);
      return res.json();
    }).then(json => {
      _dataCache = json;
      return json;
    });
  }

  // 读当前用户画像 section 选中的时间范围（'yesterday' | 7 | 30），默认 'yesterday'
  function getCurrentRange() {
    const section = document.querySelector('.user-gender-section');
    if (!section) return 'yesterday';
    if (section.querySelector('.time-range-30days.semi-dy-open-radio-addon-buttonRadio-checked')) return 30;
    if (section.querySelector('.time-range-7days.semi-dy-open-radio-addon-buttonRadio-checked')) return 7;
    return 'yesterday';
  }

  // 精确按 appId 匹配；找不到返回 null（表格会走"暂无数据"，不做 fallback，避免切其他 App 看起来"没变化"）
  function pickApp(json, appId) {
    const list = (json && json.userProfile) || [];
    return list.find(a => a && a.appId === appId) || null;
  }

  // 取所有 App 中最大的日期，作为"昨天"基准
  // —— 这样各 App 严格按同一天对齐：该 App 没有这一天时就显示空，而不是用自己最后一天充数
  function getAnchorDate(json) {
    let max = null;
    ((json && json.userProfile) || []).forEach(app => {
      (app.data || []).forEach(d => {
        if (d && d.date && (max === null || d.date > max)) max = d.date;
      });
    });
    return max;
  }

  function shiftDate(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(y, m - 1, d);
    t.setDate(t.getDate() + days);
    const ny = t.getFullYear();
    const nm = String(t.getMonth() + 1).padStart(2, '0');
    const nd = String(t.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  }

  // 以 anchor（全局"昨天"）为结束点，按 range 取该 App 覆盖范围内的日数据
  //   yesterday → date === anchor（0 或 1 条）
  //   7         → [anchor-6, anchor]
  //   30        → [anchor-29, anchor]
  // 某 APP 在区间里没有记录时，返回空数组，上层渲染走"暂无数据"
  function pickDays(app, range, anchor) {
    if (!app || !Array.isArray(app.data) || !anchor) return [];
    let start;
    if (range === 30) start = shiftDate(anchor, -29);
    else if (range === 7) start = shiftDate(anchor, -6);
    else start = anchor;
    return app.data.filter(d => d && d.date && d.date >= start && d.date <= anchor);
  }

  // 通用聚合：把 [{ [keyField]: 'xxx', activeUsers: .., newUsers: .. }] 这种同构列表跨天合并
  // 保留首次出现的顺序，相同 key 的数值字段累加
  function aggregateList(dayList, listKey, keyField, valueKeys) {
    const map = new Map();
    dayList.forEach(day => {
      const arr = (day && day[listKey]) || [];
      arr.forEach(item => {
        const k = item[keyField];
        if (k === undefined || k === null || k === '') return;
        if (!map.has(k)) {
          const seed = { [keyField]: k };
          valueKeys.forEach(vk => { seed[vk] = 0; });
          map.set(k, seed);
        }
        const target = map.get(k);
        valueKeys.forEach(vk => {
          target[vk] += Number(item[vk]) || 0;
        });
      });
    });
    return Array.from(map.values());
  }

  function formatNumber(n) {
    if (n === null || n === undefined || !Number.isFinite(Number(n))) return '- -';
    return Math.round(Number(n)).toLocaleString('en-US');
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderListTbody(tbody, rows, labelKey, valueKey) {
    if (!tbody) return;
    if (!rows || !rows.length) {
      tbody.innerHTML = `
        <tr role="row" aria-rowindex="1" class="semi-dy-open-table-row semi-dy-open-table-placeholder">
          <td role="gridcell" class="semi-dy-open-table-row-cell" colspan="2" style="text-align:center;">暂无数据</td>
        </tr>`;
      return;
    }
    const html = rows.map((r, i) => {
      const labelText = escapeHtml(r[labelKey]);
      const valueText = formatNumber(r[valueKey]);
      return `
        <tr role="row" aria-rowindex="${i + 1}" class="semi-dy-open-table-row" data-row-key="${i}">
          <td role="gridcell" aria-colindex="1" class="semi-dy-open-table-row-cell" title="${labelText}">${labelText}</td>
          <td role="gridcell" aria-colindex="2" class="semi-dy-open-table-row-cell">${valueText}</td>
        </tr>`;
    }).join('');
    tbody.innerHTML = html;
  }

  function renderGenderTable(days, category) {
    const tbody = document.querySelector('.user-profile-gender-tbody');
    if (!tbody) {
      console.warn('[user-profile] 未找到 .user-profile-gender-tbody');
      return;
    }
    const valueKey = category === 'new' ? 'newUsers' : 'activeUsers';
    const rows = aggregateList(days, 'gender', 'label', ['activeUsers', 'newUsers']);
    renderListTbody(tbody, rows, 'label', valueKey);
  }

  function renderAgeTable(days, category) {
    const tbody = document.querySelector('.user-profile-age-tbody');
    if (!tbody) {
      console.warn('[user-profile] 未找到 .user-profile-age-tbody');
      return;
    }
    const valueKey = category === 'new' ? 'newUsers' : 'activeUsers';
    const rows = aggregateList(days, 'age', 'range', ['activeUsers', 'newUsers']);
    renderListTbody(tbody, rows, 'range', valueKey);
  }

  // 把 aggregateList 出来的行转成 renderScenePieChart 期望的 { sceneId, sceneName, value } 结构
  // keyField：性别用 'label'，年龄用 'range'；value 取 activeUsers / newUsers
  function toPieData(rows, keyField, valueKey) {
    return (rows || [])
      .map(r => ({
        sceneId: String(r[keyField]),
        sceneName: String(r[keyField]),
        value: Number(r[valueKey]) || 0
      }))
      .filter(d => d.value > 0);
  }

  function renderPie(containerId, pieData, logPrefix, chartInstanceKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (typeof window.renderScenePieChart !== 'function') {
      console.warn('[user-profile] renderScenePieChart 未就绪');
      return;
    }
    // 不管新数据空不空：都先 release 旧 VChart 实例 + 清空容器
    // 原因：上一次可能塞过"暂无数据"占位 HTML，VChart 的 release 只清它自己的 DOM，不会清这段占位；
    // 切到"有数据"时新饼图会被挤到占位之后，看起来像"切 APP 后饼图不显示"
    if (window[chartInstanceKey]) {
      try { window[chartInstanceKey].release(); } catch (e) { /* ignore */ }
      window[chartInstanceKey] = null;
    }
    container.innerHTML = '';

    if (!pieData.length) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#86909c;font-size:13px;">暂无数据</div>';
      return;
    }
    // 调用来源分析那边的通用环形图（跳过白名单/选中过滤，避免受来源分析场景态影响）
    // 用户画像的饼图容器比来源分析窄（同一行两个并排），所以把环做小一点、label 字号也降一档，
    // 避免"数值 (xx.xx%)"被 VChart 自动按空格折成两行
    window.renderScenePieChart(containerId, pieData, '', 'yesterday', {
      seriesField: 'sceneId',
      nameField: 'sceneName',
      useWhitelist: false,
      skipSeriesFilter: true,
      chartInstanceKey: chartInstanceKey,
      logPrefix: logPrefix
    });
  }

  function renderGenderPieChart(days, category) {
    const valueKey = category === 'new' ? 'newUsers' : 'activeUsers';
    const rows = aggregateList(days, 'gender', 'label', ['activeUsers', 'newUsers']);
    const pieData = toPieData(rows, 'label', valueKey);
    renderPie('visactor_window_15', pieData, '用户画像-性别环形图', 'userProfileGenderPie');
  }

  function renderAgePieChart(days, category) {
    const valueKey = category === 'new' ? 'newUsers' : 'activeUsers';
    const rows = aggregateList(days, 'age', 'range', ['activeUsers', 'newUsers']);
    const pieData = toPieData(rows, 'range', valueKey);
    renderPie('visactor_window_16', pieData, '用户画像-年龄环形图', 'userProfileAgePie');
  }

  // 地域地图：聚合 region 列表的 activeVisitors / newVisitors，按 province 合并
  function renderRegionMap(days, category) {
    if (typeof window.renderUserProfileRegionMap !== 'function') {
      console.warn('[user-profile] renderUserProfileRegionMap 未就绪，跳过地图渲染');
      return;
    }
    const valueKey = category === 'new' ? 'newVisitors' : 'activeVisitors';
    const rows = aggregateList(days, 'region', 'province', ['activeVisitors', 'newVisitors']);
    const values = rows
      .map(r => ({ name: r.province, value: Number(r[valueKey]) || 0 }))
      .filter(r => r.value > 0);
    window.renderUserProfileRegionMap('visactor_window_17', values);
  }

  // 把所有省的 cities 摊平成一个城市数组，相同城市名跨省/跨天累加
  // （目前数据每个城市只属于一个省，但跨天/跨日聚合还是要靠这个）
  function aggregateCities(days, valueKeys) {
    const map = new Map();
    days.forEach(day => {
      ((day && day.region) || []).forEach(prov => {
        ((prov && prov.cities) || []).forEach(c => {
          if (!c || !c.city) return;
          if (!map.has(c.city)) {
            const seed = { city: c.city };
            valueKeys.forEach(vk => { seed[vk] = 0; });
            map.set(c.city, seed);
          }
          const target = map.get(c.city);
          valueKeys.forEach(vk => {
            target[vk] += Number(c[vk]) || 0;
          });
        });
      });
    });
    return Array.from(map.values());
  }

  // 地域分布表：根据 _profileRegionDim 切换"省份 / 城市"，按 visitors 倒序展示
  function renderRegionTable(days, category, dim) {
    const tbody = document.querySelector('.user-profile-region-tbody');
    if (!tbody) {
      console.warn('[user-profile] 未找到 .user-profile-region-tbody');
      return;
    }
    const headTh = document.querySelector('.user-profile-region-head-th');
    const valueKey = category === 'new' ? 'newVisitors' : 'activeVisitors';

    let rows;
    let labelKey;
    if (dim === 'city') {
      rows = aggregateCities(days, ['activeVisitors', 'newVisitors']);
      labelKey = 'city';
      if (headTh) {
        headTh.textContent = '城市';
        headTh.setAttribute('title', '城市');
      }
    } else {
      rows = aggregateList(days, 'region', 'province', ['activeVisitors', 'newVisitors']);
      labelKey = 'province';
      if (headTh) {
        headTh.textContent = '省份';
        headTh.setAttribute('title', '省份');
      }
    }

    rows.sort((a, b) => (Number(b[valueKey]) || 0) - (Number(a[valueKey]) || 0));
    renderListTbody(tbody, rows, labelKey, valueKey);
  }

  // 缓存最近一次 renderAll 拿到的 days/category，给 tab 切换时复用，避免再 fetch + filter
  let _lastDays = null;
  let _lastCategory = 'active';

  function renderAll(opts) {
    const appId = (opts && opts.appId) || window._profileAppId || 'dy';
    const category = (opts && opts.category) || window._profileCategory || 'active';
    const range = (opts && opts.range) || getCurrentRange();

    loadData().then(json => {
      const anchor = getAnchorDate(json);
      const app = pickApp(json, appId);
      const days = pickDays(app, range, anchor);
      _lastDays = days;
      _lastCategory = category;
      renderGenderTable(days, category);
      renderAgeTable(days, category);
      renderGenderPieChart(days, category);
      renderAgePieChart(days, category);
      renderRegionMap(days, category);
      renderRegionTable(days, category, window._profileRegionDim || 'province');
    }).catch(err => {
      console.error('[user-profile] 数据加载失败', err);
    });
  }

  // -----------------------------------------------------------------------------
  // 地域 tab（省份 / 城市）—— 只做 UI 切换
  // -----------------------------------------------------------------------------
  // Semi 风格的 "checked" 视觉由 3 层 class 驱动 + 1 个真实 svg 圆点：
  //   label 加 .semi-dy-open-radio-checked
  //   inner 加 .semi-dy-open-radio-inner-checked
  //   addon 加 .semi-dy-open-radio-addon-buttonRadio-checked
  //   圆点是 <span class="semi-dy-open-icon-radio"><svg>...</svg></span>，需要随选中态搬到对应 label
  const REGION_RADIO_ICON_HTML =
    '<span role="img" aria-label="radio" class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-radio">' +
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="5" fill="currentColor"></circle>' +
    '</svg></span>';

  function applyRegionDimChecked(targetLabel) {
    const group = targetLabel && targetLabel.closest('.user-profile-region-dim-group');
    if (!group) return;
    group.querySelectorAll('label[data-region-dim]').forEach(label => {
      const isTarget = label === targetLabel;
      label.classList.toggle('semi-dy-open-radio-checked', isTarget);
      const inner = label.querySelector('.semi-dy-open-radio-inner');
      if (inner) inner.classList.toggle('semi-dy-open-radio-inner-checked', isTarget);
      const addon = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
      if (addon) addon.classList.toggle('semi-dy-open-radio-addon-buttonRadio-checked', isTarget);
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = isTarget;
      // 圆点 icon 的 holder：inner 下、紧跟 input 后面的那个空 span
      const iconHolder = inner && inner.querySelector('input ~ span');
      if (iconHolder) iconHolder.innerHTML = isTarget ? REGION_RADIO_ICON_HTML : '';
    });
    window._profileRegionDim = targetLabel.getAttribute('data-region-dim') || 'province';
    console.log('[user-profile] 地域维度切换:', window._profileRegionDim);
    // 切 tab 时不重新拉数据，直接用 renderAll 缓存的 days 重渲表格
    if (_lastDays) {
      renderRegionTable(_lastDays, _lastCategory, window._profileRegionDim);
    }
  }

  function initRegionDimTabs() {
    const group = document.querySelector('.user-profile-region-dim-group');
    if (!group) return;
    if (group._regionDimBound) return;
    group._regionDimBound = true;
    group.querySelectorAll('label[data-region-dim]').forEach(label => {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        applyRegionDimChecked(label);
      });
    });
  }

  function initUserProfile(opts) {
    renderAll(opts || {});
    initRegionDimTabs();
  }

  function updateUserProfile(opts) {
    renderAll(opts || {});
  }

  window.initUserProfile = initUserProfile;
  window.updateUserProfile = updateUserProfile;
  window.renderUserProfileGenderTable = (opts) => renderAll(opts || {});
  window.renderUserProfileAgeTable = (opts) => renderAll(opts || {});
  window.initUserProfileRegionDimTabs = initRegionDimTabs;
})();
