// 转化分析页面初始化
// 数据源：conf/conversion-data.json
// 顶层大分类（独立于来源分析）：
//   window._conversionAppId  —— 'all' | 'dy' | 'dy_lite' | ...        默认 'all'
//   window._conversionOs     —— 'all' | 'ios' | 'android'             默认 'all'
//   range 时间范围            —— 'yesterday' | 7 | 30                 默认读取 .user-transformation-section 选中按钮，UI 默认"昨天"
//
// 对外 API：
//   window.initConversionAnalysis(opts)   页面加载时调一次（可不传 opts，用默认值）
//   window.updateConversionAnalysis(opts) 顶层下拉/时间切换后调用（读取全局状态重渲）
//
// 指标聚合规则（多 app / 多 os / 多日汇总共用）：
//   SUM_KEYS 字段（人数/次数/累计量）— 直接相加
//   其他字段（比率、人均）           — 算术平均
(function () {
  'use strict';

  const DATA_URL = './conf/conversion-data.json';
  const WEIGHTS_URL = './conf/hourly-weights.json';

  // 录屏数据指标配置
  const RECORD_METRICS = [
    { key: 'recordPublishClicks', label: '点击发布录屏次数', type: 'number' },
    { key: 'recordPublishUsers', label: '点击发布录屏人数', type: 'number' },
    { key: 'recordPublishRate', label: '点击发布录屏率', type: 'rate' },
    { key: 'recordSuccessRate', label: '录屏成功发布率', type: 'rate' },
    { key: 'avgSuccessVideos', label: '人均成功发布视频数', type: 'decimal' }
  ];

  // 互推数据指标配置
  // 指标值 = ios/android 分支下 overview.{nineGrid + fourGrid + singleGrid} 累加
  // （flattenBranch 已把 overview 三个 grid 合并后铺到分支顶层，这里直接按 key 取）
  const PROMOTION_METRICS = [
    { key: 'importDailyUsers', label: '导入-活跃用户数', type: 'number' },
    { key: 'importNewUsers', label: '导入-新增用户数', type: 'number' },
    { key: 'exportDailyUsers', label: '导出-活跃用户数', type: 'number' },
    { key: 'exportNewUsers', label: '导出-新增用户数', type: 'number' },
    { key: 'importAvgDuration', label: '导入用户人均游戏时长', type: 'duration' }
  ];

  // "累加型"字段：合并多个 os / 多个 app 时直接相加
  // 其它（比率、人均）按算术平均合并
  const SUM_KEYS = new Set([
    'recordPublishClicks',
    'recordPublishUsers',
    'importDailyUsers',
    'importNewUsers',
    'exportDailyUsers',
    'exportNewUsers'
  ]);

  // 默认全局状态
  if (typeof window._conversionAppId === 'undefined') window._conversionAppId = 'all';
  if (typeof window._conversionOs === 'undefined') window._conversionOs = 'all';
  // 录屏折线图当前选中的指标（默认第一个：点击发布录屏次数）
  if (typeof window._conversionRecordMetric === 'undefined') {
    window._conversionRecordMetric = RECORD_METRICS[0].key;
  }
  // 互推折线图当前选中的指标（默认第一个：导入-活跃用户数）
  if (typeof window._conversionPromotionMetric === 'undefined') {
    window._conversionPromotionMetric = PROMOTION_METRICS[0].key;
  }
  // 互推表格当前选中的"互推位类型"筛选值：'all' | 'nineGrid' | 'fourGrid' | 'singleGrid'
  if (typeof window._conversionPromotionGrid === 'undefined') {
    window._conversionPromotionGrid = 'all';
  }
  // 互推表格当前选中的"维度"：'overview' | 'import' | 'export'
  if (typeof window._conversionPromotionDim === 'undefined') {
    window._conversionPromotionDim = 'overview';
  }

  let _dataCache = null;
  let _weightsCache = null;

  function loadData() {
    if (_dataCache) return Promise.resolve(_dataCache);
    return fetch(DATA_URL).then(res => {
      if (!res.ok) throw new Error(`加载转化数据失败: ${res.status}`);
      return res.json();
    }).then(json => {
      _dataCache = json;
      return json;
    });
  }

  // 小时权重表：{ '00': 0.01, '01': 0.02, ..., '23': 0.05 }
  // 用于 yesterday 视角把"当日聚合值"按小时切成 24 个点，和来源分析/抖音视频图口径一致
  function loadHourlyWeights() {
    if (_weightsCache) return Promise.resolve(_weightsCache);
    return fetch(WEIGHTS_URL).then(res => {
      if (!res.ok) throw new Error(`加载权重失败: ${res.status}`);
      return res.json();
    }).then(cfg => {
      _weightsCache = (cfg && cfg.hourlyWeights) || {};
      return _weightsCache;
    });
  }

  // 选出参与计算的 apps
  function pickApps(json, appId) {
    const overview = (json && json.overview) || [];
    if (appId === 'all' || !appId) return overview;
    return overview.filter(a => a.appId === appId);
  }

  // 收集所有参与 apps 的日期（并集）升序排序
  function collectDates(apps) {
    const set = new Set();
    apps.forEach(app => (app.data || []).forEach(d => set.add(d.date)));
    return [...set].sort((a, b) => String(a).localeCompare(String(b)));
  }

  // 把一个 ios / android 分支"扁平化"：把 overview.{nineGrid, fourGrid, singleGrid}
  // 三个格子用同一份 aggregate 规则（SUM_KEYS 累加，其余取平均）合成后，补到分支顶层。
  // 互推 5 个指标就是在这里铺平的，取的时候和录屏指标同级，pickMetrics 无需区分。
  function flattenBranch(branch) {
    if (!branch || typeof branch !== 'object') return branch;
    const out = Object.assign({}, branch);
    const ov = branch.overview;
    if (ov && typeof ov === 'object') {
      const grids = [];
      ['nineGrid', 'fourGrid', 'singleGrid'].forEach(k => {
        if (ov[k] && typeof ov[k] === 'object') grids.push(ov[k]);
      });
      const merged = aggregate(grids);
      Object.keys(merged).forEach(k => { out[k] = merged[k]; });
    }
    return out;
  }

  // 从 day 项按 os 取分支：ios / android / all(两者都要)
  function pickOsBranches(dayItem, os) {
    if (!dayItem) return [];
    if (os === 'ios') return dayItem.ios ? [flattenBranch(dayItem.ios)] : [];
    if (os === 'android') return dayItem.android ? [flattenBranch(dayItem.android)] : [];
    const out = [];
    if (dayItem.ios) out.push(flattenBranch(dayItem.ios));
    if (dayItem.android) out.push(flattenBranch(dayItem.android));
    return out;
  }

  // 聚合若干份指标分支：SUM_KEYS 字段相加，其余字段算术平均
  function aggregate(branches) {
    const sums = {};
    const counts = {};
    branches.forEach(b => {
      if (!b) return;
      Object.keys(b).forEach(k => {
        const v = Number(b[k]);
        if (!Number.isFinite(v)) return;
        sums[k] = (sums[k] || 0) + v;
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    const out = {};
    Object.keys(sums).forEach(k => {
      out[k] = SUM_KEYS.has(k) ? sums[k] : sums[k] / counts[k];
    });
    return out;
  }

  // 给定日期列表，聚合这些日期下：目标 apps × 目标 os 的所有分支
  // 单日汇总（yesterday）= 单元素列表；多日汇总（7/30天）= 多元素列表
  function pickMetrics(apps, os, dateList) {
    const branches = [];
    dateList.forEach(date => {
      apps.forEach(app => {
        const day = (app.data || []).find(d => d.date === date);
        if (!day) return;
        pickOsBranches(day, os).forEach(b => branches.push(b));
      });
    });
    return aggregate(branches);
  }

  // 读取当前 section 选中的时间范围
  function getCurrentRange() {
    const section = document.querySelector('.user-transformation-section');
    if (!section) return 'yesterday';
    if (section.querySelector('.time-range-yesterday.semi-dy-open-radio-addon-buttonRadio-checked')) return 'yesterday';
    if (section.querySelector('.time-range-30days.semi-dy-open-radio-addon-buttonRadio-checked')) return 30;
    if (section.querySelector('.time-range-7days.semi-dy-open-radio-addon-buttonRadio-checked')) return 7;
    return 'yesterday';
  }

  // 根据 range 切出"当前窗口 / 对比窗口 / 文案"
  //   yesterday：当前 = 最新一天（即"昨天"口径）；对比 = 再往前一天（"前天"）
  //   7 天：    当前 = 最近 7 天；              对比 = 再往前 7 天（"前 7 天"）
  //   30 天：   当前 = 最近 30 天；             对比 = 再往前 30 天（"前 30 天"）
  function sliceWindow(dates, range) {
    if (range === 7 || range === 30) {
      const n = range;
      const currDates = dates.slice(-n);
      const prevDates = dates.length >= n * 2
        ? dates.slice(-n * 2, -n)
        : []; // 数据不足 2N 天，对比窗口留空 → 右下角显示 '-'
      const compareLabel = n === 7 ? '上周周期' : '上月周期';
      return { currDates, prevDates, compareLabel };
    }
    const last = dates.length > 0 ? dates[dates.length - 1] : null;
    const prev = dates.length > 1 ? dates[dates.length - 2] : null;
    return {
      currDates: last ? [last] : [],
      prevDates: prev ? [prev] : [],
      compareLabel: '前天'
    };
  }

  function formatValue(val, type) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
    const num = Number(val);
    if (type === 'rate') return num.toFixed(2) + '%';
    if (type === 'decimal') return num.toFixed(4);
    if (type === 'duration') {
      const s = Math.max(0, Math.round(num));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
    }
    return Math.round(num).toLocaleString('en-US');
  }

  function calcCompare(curr, prev) {
    const hasCurr = curr !== null && curr !== undefined && Number.isFinite(Number(curr));
    const hasPrev = prev !== null && prev !== undefined && Number.isFinite(Number(prev));
    if (!hasCurr || !hasPrev || Number(prev) === 0) {
      return { text: '-', cls: 'omg-compares-number-type-flat' };
    }
    const pct = ((Number(curr) - Number(prev)) / Number(prev)) * 100;
    const sign = pct > 0 ? '+' : '';
    const text = sign + pct.toFixed(2) + '%';
    let cls = 'omg-compares-number-type-flat';
    if (pct > 0) cls = 'omg-compares-number-type-up';
    else if (pct < 0) cls = 'omg-compares-number-type-down';
    return { text, cls };
  }

  function buildCardHtml(metric, valueText, compareLabel, compare, isChecked) {
    const checkedClass = isChecked ? 'omg-metric-card-bordered-checked' : '';
    return `
<div data-metric-key="${metric.key}">
  <div class="omg-flex omg-flex-col omg-metric-card omg-metric-card-solid omg-cursor-pointer omg-metric-card-checkable ${checkedClass}">
    <div class="omg-flex omg-items-center omg-justify-between ">
      <div class="omg-flex omg-items-center">
        <div class="omg-flex omg-flex-row omg-items-center omg-whitespace-nowrap omg-overflow-hidden omg-text-ellipsis omg-inline-flex">
          <div class="omg-flex omg-flex-row omg-items-center">
            <span class="semi-dy-open-typography semi-dy-open-typography-primary semi-dy-open-typography-normal" tabindex="0">
              <span class="omg-metric-card-solid-title omg-metric-card-solid-title-tooltip">${metric.label}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="omg-py-2">
      <span class="omg-text-2xl omg-leading-7 omg-metric-card-number">${valueText}</span>
    </div>
    <div class="omg-metric-card-compares">
      <div class="semi-dy-open-space omg-flex w-full justify-between false semi-dy-open-space-align-center semi-dy-open-space-horizontal" x-semi-prop="children" style="gap: 8px;">
        <span class="omg-metric-card-compares-label omg-text-xs">${compareLabel}</span>
        <div class="omg-flex omg-items-center omg-compares-number">
          <span class="${compare.cls} omg-text-xs omg-font-semibold">${compare.text}</span>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }

  // 点击事件委托：点卡片切换当前指标，同步折线图
  // 幂等：只绑定一次
  function bindRecordCardsClick(container) {
    if (container._recordClickBound) return;
    container._recordClickBound = true;
    container.addEventListener('click', (e) => {
      const cardEl = e.target.closest('[data-metric-key]');
      if (!cardEl || !container.contains(cardEl)) return;
      const key = cardEl.getAttribute('data-metric-key');
      if (!key || key === window._conversionRecordMetric) return;
      window._conversionRecordMetric = key;
      // 先把选中样式就地切过去，手感更快；随后触发重渲保证数据一致
      container.querySelectorAll('[data-metric-key] .omg-metric-card-bordered-checked')
        .forEach(el => el.classList.remove('omg-metric-card-bordered-checked'));
      const inner = cardEl.querySelector('.omg-metric-card');
      if (inner) inner.classList.add('omg-metric-card-bordered-checked');
      renderRecordChart();
    });
  }

  // 渲染"录屏数据"5 张卡片
  function renderRecordCards(opts) {
    const container = document.querySelector('.conversion-record-cards');
    if (!container) {
      console.warn('[conversion] 未找到 .conversion-record-cards 容器');
      return;
    }

    loadData().then(json => {
      const appId = (opts && opts.appId) || window._conversionAppId || 'all';
      const os = (opts && opts.os) || window._conversionOs || 'all';
      const range = (opts && opts.range) || getCurrentRange();
      const apps = pickApps(json, appId);

      if (apps.length === 0) {
        container.innerHTML = '<div class="p-4 text-text-2">暂无数据</div>';
        return;
      }

      const dates = collectDates(apps);
      if (dates.length === 0) {
        container.innerHTML = '<div class="p-4 text-text-2">暂无数据</div>';
        return;
      }

      const { currDates, prevDates, compareLabel } = sliceWindow(dates, range);
      const currMetrics = pickMetrics(apps, os, currDates);
      const prevMetrics = pickMetrics(apps, os, prevDates);
      const activeMetric = window._conversionRecordMetric || RECORD_METRICS[0].key;

      const html = RECORD_METRICS.map(m => {
        const valueText = formatValue(currMetrics[m.key], m.type);
        const compare = calcCompare(currMetrics[m.key], prevMetrics[m.key]);
        return buildCardHtml(m, valueText, compareLabel, compare, m.key === activeMetric);
      }).join('');

      container.innerHTML = html;
      bindRecordCardsClick(container);
      console.log(`[conversion] 录屏卡片已渲染，appId=${appId}, os=${os}, range=${range}, currDates=${currDates.join(',')}, metric=${activeMetric}`);
    }).catch(err => {
      console.error('[conversion] 数据加载失败', err);
      container.innerHTML = '<div class="p-4 text-text-2">数据加载失败</div>';
    });
  }

  // ==================== 互推数据卡片 ====================
  // 和录屏卡片同一套数据链路（pickApps → collectDates → sliceWindow → pickMetrics），
  // 只是指标清单换成 PROMOTION_METRICS；点击卡片会切换下方互推折线图的当前指标
  function bindPromotionCardsClick(container) {
    if (container._promotionClickBound) return;
    container._promotionClickBound = true;
    container.addEventListener('click', (e) => {
      const cardEl = e.target.closest('[data-metric-key]');
      if (!cardEl || !container.contains(cardEl)) return;
      const key = cardEl.getAttribute('data-metric-key');
      if (!key || key === window._conversionPromotionMetric) return;
      window._conversionPromotionMetric = key;
      container.querySelectorAll('[data-metric-key] .omg-metric-card-bordered-checked')
        .forEach(el => el.classList.remove('omg-metric-card-bordered-checked'));
      const inner = cardEl.querySelector('.omg-metric-card');
      if (inner) inner.classList.add('omg-metric-card-bordered-checked');
      renderPromotionChart();
    });
  }

  function renderPromotionCards(opts) {
    const container = document.querySelector('.conversion-promotion-cards');
    if (!container) {
      console.warn('[conversion] 未找到 .conversion-promotion-cards 容器');
      return;
    }

    loadData().then(json => {
      const appId = (opts && opts.appId) || window._conversionAppId || 'all';
      const os = (opts && opts.os) || window._conversionOs || 'all';
      const range = (opts && opts.range) || getCurrentRange();
      const apps = pickApps(json, appId);

      if (apps.length === 0) {
        container.innerHTML = '<div class="p-4 text-text-2">暂无数据</div>';
        return;
      }

      const dates = collectDates(apps);
      if (dates.length === 0) {
        container.innerHTML = '<div class="p-4 text-text-2">暂无数据</div>';
        return;
      }

      const { currDates, prevDates, compareLabel } = sliceWindow(dates, range);
      const currMetrics = pickMetrics(apps, os, currDates);
      const prevMetrics = pickMetrics(apps, os, prevDates);
      const activeMetric = window._conversionPromotionMetric || PROMOTION_METRICS[0].key;

      const html = PROMOTION_METRICS.map(m => {
        const valueText = formatValue(currMetrics[m.key], m.type);
        const compare = calcCompare(currMetrics[m.key], prevMetrics[m.key]);
        return buildCardHtml(m, valueText, compareLabel, compare, m.key === activeMetric);
      }).join('');

      container.innerHTML = html;
      bindPromotionCardsClick(container);
      console.log(`[conversion] 互推卡片已渲染，appId=${appId}, os=${os}, range=${range}, metric=${activeMetric}`);
    }).catch(err => {
      console.error('[conversion] 互推数据加载失败', err);
      container.innerHTML = '<div class="p-4 text-text-2">数据加载失败</div>';
    });
  }

  // ==================== 互推数据折线图 ====================
  // 复用 renderMultiLineChart，口径和录屏图完全一致：
  //   · yesterday → 当日聚合值 × 小时权重，24 个点
  //   · 7 / 30    → 每天一个点，取 N 天
  // 与录屏图的差异只在：容器 id / chartInstanceKey / 当前 metric 读 _conversionPromotionMetric
  function renderPromotionChart(opts) {
    const container = document.getElementById('visactor_window_14');
    if (!container) {
      console.warn('[conversion] 未找到图表容器 visactor_window_14');
      return;
    }
    if (typeof window.renderMultiLineChart !== 'function') {
      console.warn('[conversion] window.renderMultiLineChart 尚未加载，跳过图表渲染');
      return;
    }

    const appId = (opts && opts.appId) || window._conversionAppId || 'all';
    const os = (opts && opts.os) || window._conversionOs || 'all';
    const range = (opts && opts.range) || getCurrentRange();
    const metricKey = (opts && opts.metric) || window._conversionPromotionMetric || PROMOTION_METRICS[0].key;
    window._conversionPromotionMetric = metricKey;
    const metric = PROMOTION_METRICS.find(m => m.key === metricKey) || PROMOTION_METRICS[0];

    const loaders = range === 'yesterday'
      ? [loadData(), loadHourlyWeights()]
      : [loadData()];

    Promise.all(loaders).then(([json, weights]) => {
      const apps = pickApps(json, appId);
      if (apps.length === 0) {
        container.innerHTML = '<div class="p-4 text-text-2">暂无数据</div>';
        return;
      }

      const allDates = collectDates(apps);
      if (allDates.length === 0) return;

      let chartData;
      if (range === 'yesterday') {
        const latest = allDates[allDates.length - 1];
        chartData = buildChartSeriesHourly(apps, os, latest, metric, weights || {});
      } else {
        const n = range === 30 ? 30 : 7;
        chartData = buildChartSeriesDaily(apps, os, allDates.slice(-n), metric);
      }

      const renderOpts = {
        seriesField: 'metricKey',
        nameField: 'metricName',
        fixedOrder: [metric.key],
        useWhitelist: false,
        colors: ['rgb(73 127 252)'],
        chartInstanceKey: 'conversionPromotionChartInstance',
        logPrefix: '互推数据图表'
      };
      const formatter = getMetricFormatter(metric.type);
      if (formatter) renderOpts.valueFormatter = formatter;

      window.renderMultiLineChart(
        'visactor_window_14',
        chartData,
        `互推数据-${metric.label}`,
        range,
        renderOpts
      );
    }).catch(err => {
      console.error('[conversion] 互推图表数据加载失败', err);
    });
  }

  // ==================== 互推数据"详细数据"表格 ====================
  // 每条行 = (日期 × app × 互推位)，列结构随"维度"切换：
  //   · 转化总览（overview）→ dayItem.{ios|android}.overview[gridKey]
  //   · 导入分析（import）  → dayItem.{ios|android}.import[gridKey]  （多一列 导量来源）
  //   · 导出分析（export）  → dayItem.{ios|android}.export[gridKey]  （多一列 互推位置）
  // 合并规则：os='all' 时 ios + android 走 aggregate（SUM_KEYS 累加 / 其余平均）；
  //          字符串字段（导量来源 / 互推位置）aggregate 会跳过，取第一个非空分支的值补回。
  const PROMOTION_GRID_KEYS = ['nineGrid', 'fourGrid', 'singleGrid'];
  const PROMOTION_GRID_LABELS = {
    nineGrid: '九宫格',
    fourGrid: '四宫格',
    singleGrid: '单宫格'
  };

  // 三种维度的列配置：顺序即展示顺序；fixedLeft / fixedRight 用于 sticky 样式
  const DIMENSION_COLUMNS = {
    overview: [
      { key: 'date', label: '日期', type: 'text', width: 150, fixedLeft: true },
      { key: 'appName', label: 'App', type: 'text', width: 150 },
      { key: 'gridLabel', label: '互推位', type: 'text', width: 150 },
      { key: 'importDailyUsers', label: '导入-活跃用户数', type: 'number' },
      { key: 'importNewUsers', label: '导入-新增用户数', type: 'number' },
      { key: 'exportDailyUsers', label: '导出-活跃用户数', type: 'number' },
      { key: 'exportNewUsers', label: '导出-新增用户数', type: 'number' },
      { key: 'importAvgDuration', label: '导入用户人均游戏时长', type: 'duration', fixedRight: true }
    ],
    import: [
      { key: 'date', label: '日期', type: 'text', width: 150, fixedLeft: true },
      { key: 'appName', label: 'App', type: 'text', width: 150 },
      { key: 'gridLabel', label: '互推位', type: 'text', width: 150 },
      { key: 'sourceOfConductance', label: '导量来源', type: 'text' },
      { key: 'importDailyUsers', label: '导入-活跃用户数', type: 'number' },
      { key: 'importNewUsers', label: '导入-新增用户数', type: 'number' },
      { key: 'importAvgDuration', label: '导入用户人均游戏时长', type: 'duration', fixedRight: true }
    ],
    export: [
      { key: 'date', label: '日期', type: 'text', width: 150, fixedLeft: true },
      { key: 'appName', label: 'App', type: 'text', width: 150 },
      { key: 'gridLabel', label: '互推位', type: 'text', width: 150 },
      { key: 'reciprocalPushPosition', label: '互推位置', type: 'text' },
      { key: 'exportDailyUsers', label: '导出-活跃用户数', type: 'number' },
      { key: 'exportNewUsers', label: '导出-新增用户数', type: 'number', fixedRight: true }
    ]
  };
  const DIM_TO_SECTION = { overview: 'overview', import: 'import', export: 'export' };

  // 从 day 的 {ios|android}[section][gridKey] 合并出一行数据；字符串字段取第一个非空值
  function pickPromotionSectionRow(app, date, gridKey, os, section) {
    const day = (app.data || []).find(d => d.date === date);
    if (!day) return null;
    const branches = [];
    if (os === 'ios' || os === 'all') {
      const s = day.ios && day.ios[section] && day.ios[section][gridKey];
      if (s) branches.push(s);
    }
    if (os === 'android' || os === 'all') {
      const s = day.android && day.android[section] && day.android[section][gridKey];
      if (s) branches.push(s);
    }
    if (!branches.length) return null;
    const merged = aggregate(branches);
    // aggregate 只合并数值，字符串字段（导量来源 / 互推位置）这里补回
    branches.forEach(b => {
      Object.keys(b).forEach(k => {
        if (typeof b[k] === 'string' && b[k] !== '' && merged[k] === undefined) {
          merged[k] = b[k];
        }
      });
    });
    return merged;
  }

  function buildPromotionTableRows(apps, os, range, gridFilter, dim) {
    const allDates = collectDates(apps);
    if (!allDates.length) return [];
    const n = range === 30 ? 30 : range === 7 ? 7 : 1;
    const dates = allDates.slice(-n);
    const gridKeys = (gridFilter && gridFilter !== 'all' && PROMOTION_GRID_KEYS.includes(gridFilter))
      ? [gridFilter]
      : PROMOTION_GRID_KEYS;
    const section = DIM_TO_SECTION[dim] || 'overview';
    const rows = [];
    // 日期倒序（最新在上），同日期下按 app 顺序，每 app 展开筛选后的互推位
    dates.slice().reverse().forEach(date => {
      apps.forEach(app => {
        gridKeys.forEach(gk => {
          const m = pickPromotionSectionRow(app, date, gk, os, section);
          if (!m) return;
          rows.push(Object.assign({
            date,
            appName: app.appName || app.appId,
            gridLabel: PROMOTION_GRID_LABELS[gk]
          }, m));
        });
      });
    });
    return rows;
  }

  // 把一个 col 配置对象转成 th / td 的 class + style 片段（共用，保证左右 sticky 的三个 class 始终一致）
  function buildPromotionCellAttrs(col, isHead) {
    const baseCls = isHead ? 'semi-dy-open-table-row-head' : 'semi-dy-open-table-row-cell';
    const cls = [baseCls];
    // 统一禁止换行，列宽不够时出现横向滚动（外层已有 overflow: auto）
    const style = ['white-space: nowrap;'];
    if (col.fixedLeft) {
      cls.push('semi-dy-open-table-cell-fixed-left', 'semi-dy-open-table-cell-fixed-left-last');
      if (isHead) style.push('background: rgb(248, 248, 248);', 'position: sticky;', 'left: 0px;');
      else style.push('left: 0px;');
    } else if (col.fixedRight) {
      cls.push('semi-dy-open-table-cell-fixed-right', 'semi-dy-open-table-cell-fixed-right-first');
      if (isHead) style.push('background: rgb(248, 248, 248);', 'position: sticky;', 'right: 0px;');
      else style.push('right: 0px;');
    } else if (isHead) {
      style.push('background: rgb(248, 248, 248);');
    }
    return { cls: cls.join(' '), style: style.join(' ') };
  }

  function formatPromotionCell(val, type) {
    if (type === 'text') {
      if (val === null || val === undefined || val === '') return '- -';
      return String(val);
    }
    return formatTableCell(val, type);
  }

  function renderPromotionTable(opts) {
    const tableEl = document.querySelector('.conversion-promotion-table');
    if (!tableEl) {
      console.warn('[conversion] 未找到 .conversion-promotion-table');
      return;
    }
    // 互推表格不跟随顶部"APP"大下拉框，始终按全部 APP 汇总
    // （OS / 时间范围 / 互推位类型 / 维度 仍然生效）
    const appId = 'all';
    const os = (opts && opts.os) || window._conversionOs || 'all';
    const range = (opts && opts.range) || getCurrentRange();
    const gridFilter = (opts && opts.grid) || window._conversionPromotionGrid || 'all';
    const dim = (opts && opts.dim) || window._conversionPromotionDim || 'overview';
    const cols = DIMENSION_COLUMNS[dim] || DIMENSION_COLUMNS.overview;

    loadData().then(json => {
      const apps = pickApps(json, appId);
      const rows = buildPromotionTableRows(apps, os, range, gridFilter, dim);

      const colHtml = cols.map(c => c.width
        ? `<col class="semi-dy-open-table-col" style="width: ${c.width}px; min-width: ${c.width}px;">`
        : `<col class="semi-dy-open-table-col">`
      ).join('');

      const thHtml = cols.map((c, i) => {
        const { cls, style } = buildPromotionCellAttrs(c, true);
        const titleAttr = escapeAttr(c.label);
        const styleAttr = style ? ` style="${style}"` : '';
        return `<th role="columnheader" aria-colindex="${i + 1}" class="${cls}" colspan="1" title="${titleAttr}" rowspan="1"${styleAttr}>${c.label}</th>`;
      }).join('');

      const bodyHtml = rows.map((r, ri) => {
        const tds = cols.map((c, ci) => {
          const display = formatPromotionCell(r[c.key], c.type);
          const { cls, style } = buildPromotionCellAttrs(c, false);
          const styleAttr = style ? ` style="${style}"` : '';
          return `<td role="gridcell" aria-colindex="${ci + 1}" class="${cls}" title="${escapeAttr(display)}"${styleAttr}>${display}</td>`;
        }).join('');
        return `<tr role="row" aria-rowindex="${ri + 1}" class="semi-dy-open-table-row" data-row-key="${ri}">${tds}</tr>`;
      }).join('');

      tableEl.setAttribute('aria-colcount', String(cols.length));
      tableEl.innerHTML =
        `<colgroup class="semi-dy-open-table-colgroup">${colHtml}</colgroup>` +
        `<thead class="semi-dy-open-table-thead">` +
        `<tr role="row" aria-rowindex="1" class="semi-dy-open-table-row">${thHtml}</tr>` +
        `</thead>` +
        `<tbody class="semi-dy-open-table-tbody conversion-promotion-table-body">${bodyHtml}</tbody>`;

      console.log(`[conversion] 互推表格已渲染，dim=${dim}, os=${os}, range=${range}, grid=${gridFilter}, rows=${rows.length}`);
    }).catch(err => {
      console.error('[conversion] 互推表格数据加载失败', err);
    });
  }

  // ==================== 录屏数据折线图 ====================
  // 折线图沿用 window.renderMultiLineChart（来源分析同款），区别仅在：
  //   · seriesField='metricKey' + fixedOrder=[当前指标] —— 单条线
  //   · useWhitelist=false —— 关掉来源场景白名单
  //   · 数据源是 conversion-data.json，按日取

  // 生成折线图数据：每天一个点，按选中指标取值（日维度，7 / 30 天用）
  function buildChartSeriesDaily(apps, os, dates, metric) {
    return dates.map(date => {
      const dayMetrics = pickMetrics(apps, os, [date]);
      const raw = dayMetrics[metric.key];
      const v = Number(raw);
      return {
        date,
        value: Number.isFinite(v) ? v : 0,
        metricKey: metric.key,
        metricName: metric.label
      };
    });
  }

  // 昨天视角：把"昨天当日聚合值"按小时权重切成 24 个点
  // 与来源分析 / 抖音视频图的 yesterday 口径保持一致（复用同一份 hourly-weights.json）
  function buildChartSeriesHourly(apps, os, latestDate, metric, weights) {
    const dayMetrics = pickMetrics(apps, os, [latestDate]);
    const rawVal = Number(dayMetrics[metric.key]) || 0;
    const out = [];
    for (let h = 0; h < 24; h++) {
      const hs = String(h).padStart(2, '0');
      const w = Number(weights[hs]) || 0;
      const scaled = rawVal * w;
      let v;
      if (metric.type === 'rate') v = Number(scaled.toFixed(2));
      else if (metric.type === 'decimal') v = Number(scaled.toFixed(4));
      else v = Math.round(scaled);
      out.push({
        date: `${latestDate} ${hs}:00`,
        value: v,
        metricKey: metric.key,
        metricName: metric.label
      });
    }
    return out;
  }

  function getMetricFormatter(type) {
    if (type === 'rate') return v => (Number(v) || 0).toFixed(2) + '%';
    if (type === 'decimal') return v => (Number(v) || 0).toFixed(4);
    if (type === 'duration') return v => formatValue(v, 'duration');
    return null; // number 走 renderMultiLineChart 的默认（千分位）
  }

  function renderRecordChart(opts) {
    const container = document.getElementById('visactor_window_13');
    if (!container) {
      console.warn('[conversion] 未找到图表容器 visactor_window_13');
      return;
    }
    if (typeof window.renderMultiLineChart !== 'function') {
      console.warn('[conversion] window.renderMultiLineChart 尚未加载，跳过图表渲染');
      return;
    }

    const appId = (opts && opts.appId) || window._conversionAppId || 'all';
    const os = (opts && opts.os) || window._conversionOs || 'all';
    const range = (opts && opts.range) || getCurrentRange();
    const metricKey = (opts && opts.metric) || window._conversionRecordMetric || RECORD_METRICS[0].key;
    window._conversionRecordMetric = metricKey;
    const metric = RECORD_METRICS.find(m => m.key === metricKey) || RECORD_METRICS[0];

    // yesterday 需要 weights；7 / 30 不需要
    const loaders = range === 'yesterday'
      ? [loadData(), loadHourlyWeights()]
      : [loadData()];

    Promise.all(loaders).then(([json, weights]) => {
      const apps = pickApps(json, appId);
      if (apps.length === 0) {
        container.innerHTML = '<div class="p-4 text-text-2">暂无数据</div>';
        return;
      }

      const allDates = collectDates(apps);
      if (allDates.length === 0) return;

      let chartData;
      if (range === 'yesterday') {
        const latest = allDates[allDates.length - 1];
        chartData = buildChartSeriesHourly(apps, os, latest, metric, weights || {});
      } else {
        const n = range === 30 ? 30 : 7;
        chartData = buildChartSeriesDaily(apps, os, allDates.slice(-n), metric);
      }

      const renderOpts = {
        seriesField: 'metricKey',
        nameField: 'metricName',
        fixedOrder: [metric.key],
        useWhitelist: false,
        colors: ['rgb(73 127 252)'],
        chartInstanceKey: 'conversionRecordChartInstance',
        logPrefix: '录屏数据图表'
      };
      const formatter = getMetricFormatter(metric.type);
      if (formatter) renderOpts.valueFormatter = formatter;

      window.renderMultiLineChart(
        'visactor_window_13',
        chartData,
        `录屏数据-${metric.label}`,
        range,
        renderOpts
      );
    }).catch(err => {
      console.error('[conversion] 图表数据加载失败', err);
    });
  }

  // ==================== 录屏数据"详细数据"表格 ====================
  // 行数据口径与折线图完全一致：
  //   · yesterday → 24 行，时间列显示 HH:00:00（当日聚合 × 各小时权重）
  //   · 7 / 30    → N 行，时间列显示日期（每日聚合）
  // 每页 10 条，分页条沿用 Semi UI 的 DOM 结构

  const TABLE_PAGE_SIZE = 10;
  // chevron SVG 抠自原静态分页，保证和其它表格视觉一致
  const SVG_CHEVRON_LEFT = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.2782 4.23933C16.864 4.82511 16.864 5.77486 16.2782 6.36065L10.6213 12.0175L16.2782 17.6744C16.864 18.2601 16.864 19.2099 16.2782 19.7957C15.6924 20.3815 14.7426 20.3815 14.1569 19.7957L7.43934 13.0782C6.85355 12.4924 6.85355 11.5426 7.43934 10.9568L14.1569 4.23933C14.7426 3.65354 15.6924 3.65354 16.2782 4.23933Z" fill="currentColor"></path></svg>';
  const SVG_CHEVRON_RIGHT = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.43934 19.7957C6.85355 19.2099 6.85355 18.2601 7.43934 17.6744L13.0962 12.0175L7.43934 6.36065C6.85355 5.77486 6.85355 4.82511 7.43934 4.23933C8.02513 3.65354 8.97487 3.65354 9.56066 4.23933L16.2782 10.9568C16.864 11.5426 16.864 12.4924 16.2782 13.0782L9.56066 19.7957C8.97487 20.3815 8.02513 20.3815 7.43934 19.7957Z" fill="currentColor"></path></svg>';

  let _tableRows = [];   // 整份行数据；分页只切片不重新计算
  let _tablePage = 1;

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 单元格显示：rate → 'xx.xx%'，decimal → 'x.xxxx'，duration → 'HH:MM:SS'，number → 千分位整数
  function formatTableCell(val, type) {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '- -';
    const n = Number(val);
    if (type === 'rate') return n.toFixed(2) + '%';
    if (type === 'decimal') return n.toFixed(4);
    if (type === 'duration') return formatValue(n, 'duration');
    return Math.round(n).toLocaleString('en-US');
  }

  // 生成所有行（未分页）：
  //   row = { timeLabel: string, metrics: { [key]: rawNumber } }
  function buildTableRows(apps, os, range, weights) {
    const allDates = collectDates(apps);
    if (!allDates.length) return [];

    if (range === 'yesterday') {
      const latest = allDates[allDates.length - 1];
      const dayMetrics = pickMetrics(apps, os, [latest]);
      const out = [];
      for (let h = 0; h < 24; h++) {
        const hs = String(h).padStart(2, '0');
        const w = Number((weights || {})[hs]) || 0;
        const metrics = {};
        RECORD_METRICS.forEach(m => {
          const raw = Number(dayMetrics[m.key]) || 0;
          const scaled = raw * w;
          if (m.type === 'rate') metrics[m.key] = Number(scaled.toFixed(2));
          else if (m.type === 'decimal') metrics[m.key] = Number(scaled.toFixed(4));
          else metrics[m.key] = Math.round(scaled);
        });
        out.push({ timeLabel: `${hs}:00:00`, metrics });
      }
      return out;
    }

    const n = range === 30 ? 30 : 7;
    return allDates.slice(-n).map(date => {
      const dayMetrics = pickMetrics(apps, os, [date]);
      const metrics = {};
      RECORD_METRICS.forEach(m => {
        metrics[m.key] = dayMetrics[m.key];
      });
      return { timeLabel: date, metrics };
    });
  }

  // 只渲染表格 tbody（当前页）+ 分页条
  function renderRecordTableView() {
    const tbody = document.querySelector('.conversion-record-table-body');
    if (!tbody) return;

    const total = _tableRows.length;
    const totalPages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
    _tablePage = Math.min(Math.max(1, _tablePage), totalPages);

    const start = (_tablePage - 1) * TABLE_PAGE_SIZE;
    const end = start + TABLE_PAGE_SIZE;
    const pageRows = _tableRows.slice(start, end);

    tbody.innerHTML = pageRows.map((row, i) => {
      const tLabel = escapeAttr(row.timeLabel);
      const cells = [
        `<td role="gridcell" aria-colindex="1" class="semi-dy-open-table-row-cell semi-dy-open-table-cell-fixed-left semi-dy-open-table-cell-fixed-left-last" title="${tLabel}" style="left: 0px;">${row.timeLabel}</td>`
      ];
      RECORD_METRICS.forEach((m, ci) => {
        const text = formatTableCell(row.metrics[m.key], m.type);
        cells.push(`<td role="gridcell" aria-colindex="${ci + 2}" class="semi-dy-open-table-row-cell" title="${escapeAttr(text)}">${text}</td>`);
      });
      return `<tr role="row" aria-rowindex="${i + 1}" class="semi-dy-open-table-row" data-row-key="${start + i}">${cells.join('')}</tr>`;
    }).join('');

    renderRecordTablePagination(total, totalPages);
  }

  function renderRecordTablePagination(total, totalPages) {
    const infoEl = document.querySelector('.conversion-record-table-pagination-info');
    const ul = document.querySelector('.conversion-record-table-pagination');
    if (infoEl) {
      const from = total === 0 ? 0 : (_tablePage - 1) * TABLE_PAGE_SIZE + 1;
      const to = Math.min(_tablePage * TABLE_PAGE_SIZE, total);
      infoEl.textContent = `显示第 ${from} 条-第 ${to} 条，共 ${total} 条`;
    }
    if (!ul) return;

    const prevDisabled = _tablePage <= 1;
    const nextDisabled = _tablePage >= totalPages;
    const pageItems = [];
    for (let p = 1; p <= totalPages; p++) {
      const active = p === _tablePage;
      pageItems.push(`<li class="semi-dy-open-page-item${active ? ' semi-dy-open-page-item-active' : ''}" aria-label="Page ${p}" aria-current="${active ? 'page' : 'false'}">${p}</li>`);
    }

    ul.innerHTML = `
      <li role="button" aria-disabled="${prevDisabled}" aria-label="Previous" class="semi-dy-open-page-item semi-dy-open-page-prev${prevDisabled ? ' semi-dy-open-page-item-disabled' : ''}">
        <span role="img" aria-label="chevron_left" class="semi-dy-open-icon semi-dy-open-icon-large semi-dy-open-icon-chevron_left">${SVG_CHEVRON_LEFT}</span>
      </li>
      ${pageItems.join('')}
      <li role="button" aria-disabled="${nextDisabled}" aria-label="Next" class="semi-dy-open-page-item semi-dy-open-page-next${nextDisabled ? ' semi-dy-open-page-item-disabled' : ''}">
        <span role="img" aria-label="chevron_right" class="semi-dy-open-icon semi-dy-open-icon-large semi-dy-open-icon-chevron_right">${SVG_CHEVRON_RIGHT}</span>
      </li>
    `;

    bindTablePagination(ul);
  }

  // 事件委托挂在 ul 上（幂等）；totalPages 每次重新根据 _tableRows 计算，避免闭包过期
  function bindTablePagination(ul) {
    if (ul._paginationBound) return;
    ul._paginationBound = true;
    ul.addEventListener('click', (e) => {
      const li = e.target.closest('.semi-dy-open-page-item');
      if (!li || li.classList.contains('semi-dy-open-page-item-disabled')) return;
      const totalPages = Math.max(1, Math.ceil(_tableRows.length / TABLE_PAGE_SIZE));
      if (li.classList.contains('semi-dy-open-page-prev')) {
        if (_tablePage > 1) { _tablePage -= 1; renderRecordTableView(); }
      } else if (li.classList.contains('semi-dy-open-page-next')) {
        if (_tablePage < totalPages) { _tablePage += 1; renderRecordTableView(); }
      } else {
        const p = parseInt(li.textContent, 10);
        if (!Number.isNaN(p) && p !== _tablePage) { _tablePage = p; renderRecordTableView(); }
      }
    });
  }

  // 外层入口：读取最新 appId / os / range，重算 _tableRows，回到第 1 页再渲染
  function renderRecordTable(opts) {
    const tbody = document.querySelector('.conversion-record-table-body');
    if (!tbody) return;

    const appId = (opts && opts.appId) || window._conversionAppId || 'all';
    const os = (opts && opts.os) || window._conversionOs || 'all';
    const range = (opts && opts.range) || getCurrentRange();

    const loaders = range === 'yesterday' ? [loadData(), loadHourlyWeights()] : [loadData()];
    Promise.all(loaders).then(([json, weights]) => {
      const apps = pickApps(json, appId);
      _tableRows = buildTableRows(apps, os, range, weights);
      _tablePage = 1;
      renderRecordTableView();
    }).catch(err => {
      console.error('[conversion] 录屏表格数据加载失败', err);
    });
  }

  // 首次初始化（由 load-dashboard.js 在用户分析页加载完后调用）
  // opts: { appId, os, date, range, metric } —— 全部可选，缺省走全局状态/数据默认
  function initConversionAnalysis(opts) {
    renderRecordCards(opts || {});
    renderRecordChart(opts || {});
    renderRecordTable(opts || {});
    renderPromotionCards(opts || {});
    renderPromotionChart(opts || {});
    renderPromotionTable(opts || {});
    initPromotionDimensionRadio();
    bindExportButton();
    bindPromotionExportButton();
  }

  // 顶层下拉（APP / OS / 时间范围）切换后调用，读取全局状态重新渲染
  function updateConversionAnalysis(opts) {
    renderRecordCards(opts || {});
    renderRecordChart(opts || {});
    renderRecordTable(opts || {});
    renderPromotionCards(opts || {});
    renderPromotionChart(opts || {});
    renderPromotionTable(opts || {});
  }

  // ==================== 互推表格维度 radio（转化总览 / 导入分析 / 导出分析）====================
  // 当前仅切换视觉状态（和其它 button-radio 的三个 class 保持一致），数据联动后续再接
  function initPromotionDimensionRadio() {
    const group = document.querySelector('.promotion-dimension-group');
    if (!group || group._dimBound) return;
    group._dimBound = true;

    group.addEventListener('click', (e) => {
      const label = e.target.closest('label[data-dim]');
      if (!label || !group.contains(label)) return;

      // 切换 label / inner / addon 三处 checked 样式（与 Semi button-radio 的视觉规则保持一致）
      group.querySelectorAll('label[data-dim]').forEach(el => {
        el.classList.remove('semi-dy-open-radio-checked');
        const innerEl = el.querySelector('.semi-dy-open-radio-inner');
        if (innerEl) innerEl.classList.remove('semi-dy-open-radio-inner-checked');
        const addonEl = el.querySelector('.semi-dy-open-radio-addon-buttonRadio');
        if (addonEl) addonEl.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
      });

      label.classList.add('semi-dy-open-radio-checked');
      const innerEl = label.querySelector('.semi-dy-open-radio-inner');
      if (innerEl) innerEl.classList.add('semi-dy-open-radio-inner-checked');
      const addonEl = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
      if (addonEl) addonEl.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');

      const dim = label.getAttribute('data-dim');
      window._conversionPromotionDim = dim;
      console.log('[promotion-dim] 维度切换:', dim);
      renderPromotionTable();
    });
  }

  // ==================== 导出 ====================
  // 导出当前 APP / OS / 时间范围 维度下，录屏 5 个指标的明细：
  //   yesterday → 24 行（按小时权重切，与折线图口径一致）
  //   7 / 30   → N 行（每天聚合）

  function getAppLabel(appId) {
    if (!appId || appId === 'all') return '全部';
    const list = (window.SOURCE_APP_OPTIONS) || [];
    const found = list.find(o => o.value === appId);
    return found ? found.label : appId;
  }

  function getOsLabel(os) {
    if (!os || os === 'all') return '全部';
    return os;
  }

  function getRangeLabel(range) {
    if (range === 7) return '近7天';
    if (range === 30) return '近30天';
    return '昨天';
  }

  // 把数字格式化成"导出友好"的文本：rate 加 %，decimal 4 位，number 整数（无千分位，方便 Excel 识别为数值）
  function formatForCsv(val, type) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '';
    const n = Number(val);
    if (type === 'rate') return n.toFixed(2) + '%';
    if (type === 'decimal') return n.toFixed(4);
    return String(Math.round(n));
  }

  // CSV 单元格转义：含逗号/引号/换行就用双引号包裹，引号本身翻倍
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadCsv(rows, fileName) {
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportRecordData() {
    const appId = window._conversionAppId || 'all';
    const os = window._conversionOs || 'all';
    const range = getCurrentRange();

    const loaders = range === 'yesterday'
      ? [loadData(), loadHourlyWeights()]
      : [loadData()];

    Promise.all(loaders).then(([json, weights]) => {
      const apps = pickApps(json, appId);
      if (apps.length === 0) {
        console.warn('[conversion] 无可导出数据');
        return;
      }
      const allDates = collectDates(apps);
      if (allDates.length === 0) {
        console.warn('[conversion] 无可导出数据');
        return;
      }

      const headers = ['时间', ...RECORD_METRICS.map(m => m.label)];
      const rows = [headers];

      if (range === 'yesterday') {
        // 与图表完全相同：昨天聚合值 × 各小时权重
        const latest = allDates[allDates.length - 1];
        const dayMetrics = pickMetrics(apps, os, [latest]);
        for (let h = 0; h < 24; h++) {
          const hs = String(h).padStart(2, '0');
          const w = Number((weights || {})[hs]) || 0;
          const row = [`${latest} ${hs}:00`];
          RECORD_METRICS.forEach(m => {
            const raw = Number(dayMetrics[m.key]) || 0;
            const scaled = raw * w;
            let v;
            if (m.type === 'rate') v = Number(scaled.toFixed(2));
            else if (m.type === 'decimal') v = Number(scaled.toFixed(4));
            else v = Math.round(scaled);
            row.push(formatForCsv(v, m.type));
          });
          rows.push(row);
        }
      } else {
        const n = range === 30 ? 30 : 7;
        const dates = allDates.slice(-n);
        dates.forEach(date => {
          const dayMetrics = pickMetrics(apps, os, [date]);
          const row = [date];
          RECORD_METRICS.forEach(m => {
            row.push(formatForCsv(dayMetrics[m.key], m.type));
          });
          rows.push(row);
        });
      }

      const fileName = `录屏数据-${getRangeLabel(range)}.csv`;
      downloadCsv(rows, fileName);
      console.log(`✅ [conversion] 录屏数据已导出：${fileName}`);
    }).catch(err => {
      console.error('[conversion] 导出失败', err);
    });
  }

  // 页面切换/重渲后绑定按钮（幂等）
  function bindExportButton() {
    const btn = document.querySelector('.export-conversion-record-btn');
    if (!btn || btn._exportBound) return;
    btn._exportBound = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      exportRecordData();
    });
  }

  // 互推数据表格的 CSV 单元格格式：在 formatForCsv 的基础上补 text / duration
  function formatPromotionForCsv(val, type) {
    if (type === 'text') {
      if (val === null || val === undefined) return '';
      return String(val);
    }
    if (type === 'duration') {
      if (val === null || val === undefined || !Number.isFinite(Number(val))) return '';
      return formatValue(Number(val), 'duration');
    }
    return formatForCsv(val, type);
  }

  const PROMOTION_DIM_LABELS = {
    overview: '转化总览',
    import: '导入分析',
    export: '导出分析'
  };

  function exportPromotionData() {
    // 与页面表格保持一致：不受顶部 App 大下拉框影响，始终按 appId = 'all' 汇总；
    // OS / 时间范围 / 互推位类型 / 维度 均与当前页面状态一致
    const appId = 'all';
    const os = window._conversionOs || 'all';
    const range = getCurrentRange();
    const gridFilter = window._conversionPromotionGrid || 'all';
    const dim = window._conversionPromotionDim || 'overview';
    const cols = DIMENSION_COLUMNS[dim] || DIMENSION_COLUMNS.overview;

    loadData().then(json => {
      const apps = pickApps(json, appId);
      if (!apps.length) {
        console.warn('[conversion] 互推数据无可导出数据');
        return;
      }
      const rows = buildPromotionTableRows(apps, os, range, gridFilter, dim);
      if (!rows.length) {
        console.warn('[conversion] 互推数据无可导出数据');
        return;
      }

      const headers = cols.map(c => c.label);
      const csvRows = [headers];
      rows.forEach(r => {
        csvRows.push(cols.map(c => formatPromotionForCsv(r[c.key], c.type)));
      });

      const dimLabel = PROMOTION_DIM_LABELS[dim] || PROMOTION_DIM_LABELS.overview;
      const fileName = `互推数据.csv`;
      downloadCsv(csvRows, fileName);
      console.log(`✅ [conversion] 互推数据已导出：${fileName}`);
    }).catch(err => {
      console.error('[conversion] 互推导出失败', err);
    });
  }

  function bindPromotionExportButton() {
    const btn = document.querySelector('.export-conversion-promotion-btn');
    if (!btn || btn._exportBound) return;
    btn._exportBound = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      exportPromotionData();
    });
  }

  window.initConversionAnalysis = initConversionAnalysis;
  window.updateConversionAnalysis = updateConversionAnalysis;
  // 兼容老名字 / 给其他模块单独刷新某一块的入口
  window.renderConversionRecordCards = renderRecordCards;
  window.renderConversionRecordChart = renderRecordChart;
  window.renderConversionRecordTable = renderRecordTable;
  window.renderConversionPromotionCards = renderPromotionCards;
  window.renderConversionPromotionChart = renderPromotionChart;
  window.renderConversionPromotionTable = renderPromotionTable;
  window.initPromotionDimensionRadio = initPromotionDimensionRadio;
  window.exportConversionRecord = exportRecordData;
  window.bindConversionExportButton = bindExportButton;
  window.exportConversionPromotion = exportPromotionData;
  window.bindConversionPromotionExportButton = bindPromotionExportButton;
})();
