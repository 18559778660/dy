// 终端分析 · 客户端版本分布（柱形图 + 数据列表 + 导出）
// 数据源：conf/terminal-model-data_brand_client_version.json
//   顶层：terminalClientVersionDistribution[]
//   每日：clientVersions[]，字段 version / activeUsers / newUsers
//
// 全局状态（与机型、品牌独立）：
//   window._terminalClientVersionAppId      —— 'all' | appId   默认 'all'
//   window._terminalClientVersionModelView —— 'distribution' | 'table'
// 与机型/品牌共用：window._terminalCategory、时间范围 .user-terminal-section
//
// 对外：window.initTerminalClientVersionAnalysis()、window.updateTerminalClientVersionAnalysis(opts?)
//       window.exportTerminalClientVersionDistribution()
(function () {
  'use strict';

  const DATA_URL = './conf/terminal-model-data_brand_client_version.json';
  const CHART_KEY = 'terminalClientVersionChartInstance';

  if (typeof window._terminalClientVersionAppId === 'undefined') {
    window._terminalClientVersionAppId = 'all';
  }
  if (typeof window._terminalClientVersionModelView === 'undefined') {
    window._terminalClientVersionModelView = 'distribution';
  }

  let _dataCache = null;

  function clientVersionAppList(json) {
    if (!json) return [];
    return json.terminalClientVersionDistribution || [];
  }

  function loadData() {
    if (_dataCache) return Promise.resolve(_dataCache);
    return fetch(DATA_URL)
      .then(res => {
        if (!res.ok) throw new Error(`加载客户端版本数据失败: ${res.status}`);
        return res.json();
      })
      .then(json => {
        _dataCache = json;
        return json;
      });
  }

  function getCurrentRange() {
    const section = document.querySelector('.user-terminal-section');
    if (!section) return 'yesterday';
    if (section.querySelector('.time-range-30days.semi-dy-open-radio-addon-buttonRadio-checked')) return 30;
    if (section.querySelector('.time-range-7days.semi-dy-open-radio-addon-buttonRadio-checked')) return 7;
    return 'yesterday';
  }

  function pickApp(json, appId) {
    const list = clientVersionAppList(json);
    return list.find(a => a && a.appId === appId) || null;
  }

  function getAnchorDate(json) {
    let max = null;
    clientVersionAppList(json).forEach(app => {
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

  function pickDays(app, range, anchor) {
    if (!app || !Array.isArray(app.data) || !anchor) return [];
    let start;
    if (range === 30) start = shiftDate(anchor, -29);
    else if (range === 7) start = shiftDate(anchor, -6);
    else start = anchor;
    return app.data.filter(d => d && d.date && d.date >= start && d.date <= anchor);
  }

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

  function getVersionRows(json, appId, range, anchor) {
    if (!anchor) return [];
    let daySlices = [];
    if (appId === 'all') {
      clientVersionAppList(json).forEach(app => {
        if (!app || !app.appId) return;
        daySlices = daySlices.concat(pickDays(app, range, anchor));
      });
    } else {
      const app = pickApp(json, appId);
      daySlices = pickDays(app, range, anchor);
    }
    if (!daySlices.length) return [];
    return aggregateList(daySlices, 'clientVersions', 'version', ['activeUsers', 'newUsers']);
  }

  function versionRowsAsModelRows(rows) {
    return rows.map(r => ({
      model: r.version,
      activeUsers: r.activeUsers,
      newUsers: r.newUsers
    }));
  }

  function rowsToChartValues(rows, category) {
    const valueKey = category === 'new' ? 'newUsers' : 'activeUsers';
    const list = rows.map(r => ({
      model: r.model,
      value: Number(r[valueKey]) || 0
    })).filter(x => x.value > 0);
    const total = list.reduce((s, x) => s + x.value, 0);
    list.forEach(x => { x.ratio = total ? x.value / total : 0; });
    list.sort((a, b) => b.value - a.value);
    return { list, total };
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeCsvCell(val) {
    const s = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function exportTerminalClientVersionDistribution() {
    loadData()
      .then(json => {
        const range = getCurrentRange();
        const anchor = getAnchorDate(json);
        const appId = window._terminalClientVersionAppId != null ? window._terminalClientVersionAppId : 'all';
        const category = window._terminalCategory === 'new' ? 'new' : 'active';
        const rows = versionRowsAsModelRows(getVersionRows(json, appId, range, anchor));
        const { list, total } = rowsToChartValues(rows, category);
        if (!list.length) {
          console.warn('[terminal-client-version] 暂无数据可导出');
          return;
        }
        const header = ['版本', '用户数', '占比'].map(escapeCsvCell).join(',');
        const lines = [header];
        list.forEach(r => {
          const pct = total ? ((r.value / total) * 100).toFixed(2) : '0.00';
          lines.push([
            escapeCsvCell(r.model),
            escapeCsvCell(Math.round(Number(r.value) || 0)),
            escapeCsvCell(`${pct}%`)
          ].join(','));
        });
        const csvContent = lines.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        link.href = url;
        link.download = `客户端版本分布_${dateStr}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('✅ 客户端版本分布已导出:', link.download);
      })
      .catch(err => {
        console.error('[terminal-client-version] 导出失败:', err);
      });
  }

  function bindTerminalClientVersionExportButton() {
    const btn = document.querySelector('.export-terminal-client-version-btn');
    if (!btn || btn.dataset.terminalClientVersionExportBound === '1') return;
    btn.dataset.terminalClientVersionExportBound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      exportTerminalClientVersionDistribution();
    });
  }

  function disconnectChartResize(container) {
    if (container && container._terminalClientVersionBarRo) {
      try { container._terminalClientVersionBarRo.disconnect(); } catch (e) { /* ignore */ }
      container._terminalClientVersionBarRo = null;
    }
  }

  function releaseChart(container) {
    disconnectChartResize(container);
    if (window[CHART_KEY]) {
      try { window[CHART_KEY].release(); } catch (e) { /* ignore */ }
      window[CHART_KEY] = null;
    }
    if (container) container.innerHTML = '';
  }

  function renderBarChart(container, values) {
    const ChartClass = window.VChart && (window.VChart.VChart || window.VChart);
    if (!ChartClass || !container) return;
    releaseChart(container);

    if (!values.length) {
      container.innerHTML =
        '<div style="height:288px;display:flex;align-items:center;justify-content:center;color:#86909c;font-size:13px;">暂无数据</div>';
      return;
    }

    const LEGEND_NAME = '用户数';
    const valuesWithSeries = values.map(d =>
      Object.assign({}, d, { metricLegend: LEGEND_NAME })
    );

    const barColor = 'rgb(73, 127, 252)';

    const spec = {
      type: 'bar',
      data: [{ id: 'clientVersionBar', values: valuesWithSeries }],
      xField: 'model',
      yField: 'value',
      seriesField: 'metricLegend',
      color: {
        type: 'ordinal',
        domain: [LEGEND_NAME],
        range: [barColor]
      },
      barMaxWidth: 22,
      bar: {
        style: {
          fill: barColor,
          cornerRadius: [4, 4, 0, 0]
        }
      },
      legends: {
        visible: true,
        orient: 'bottom',
        position: 'middle',
        layout: 'horizontal',
        padding: { top: 18, bottom: 4, left: 8, right: 8 },
        interactive: false
      },
      axes: [
        { orient: 'left', title: { visible: false } },
        {
          orient: 'bottom',
          sampling: false,
          label: {
            autoRotate: true,
            autoRotateAngle: -28,
            style: { fontSize: 11, fill: '#4e5969' }
          }
        }
      ],
      tooltip: {
        visible: true,
        dimension: {
          hasShape: true,
          content: [{ key: LEGEND_NAME, value: () => '' }]
        },
        mark: {
          hasShape: true,
          content: [{ key: LEGEND_NAME, value: () => '' }]
        }
      },
      animation: false
    };

    const w = container.offsetWidth || (container.parentElement && container.parentElement.offsetWidth) || 1128;
    const h = 288;
    const chart = new ChartClass(spec, {
      dom: container,
      width: w,
      height: h,
      theme: 'light'
    });
    chart.renderSync();
    window[CHART_KEY] = chart;

    const ro = new ResizeObserver(() => {
      if (!window[CHART_KEY] || !container.offsetWidth) return;
      try {
        window[CHART_KEY].resize(container.offsetWidth, h);
      } catch (e) { /* ignore */ }
    });
    ro.observe(container);
    container._terminalClientVersionBarRo = ro;
  }

  function renderClientVersionTable(wrap, modelRows, category) {
    const { list, total } = rowsToChartValues(modelRows, category);
    if (!list.length) {
      wrap.innerHTML =
        '<div style="min-height:200px;display:flex;align-items:center;justify-content:center;color:#86909c;font-size:13px;">暂无数据</div>';
      return;
    }
    const rowH = '36.9px';
    const cell =
      `box-sizing:border-box;height:${rowH};min-height:${rowH};max-height:${rowH};` +
      'padding:0 10px;line-height:36.9px;vertical-align:middle;' +
      'border-bottom:1px solid #e5e6eb;text-align:center;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const thSticky =
      'background:rgb(248,248,248);position:sticky;top:0;z-index:1;box-shadow:0 1px 0 #e5e6eb;' + cell;
    const body = list.map((r, i) => {
      const pct = total ? ((r.value / total) * 100).toFixed(2) : '0.00';
      const rank = i + 1;
      return (
        '<tr class="semi-dy-open-table-row" role="row">' +
        `<td class="semi-dy-open-table-row-cell terminal-client-version-td" style="${cell}">${rank}</td>` +
        `<td class="semi-dy-open-table-row-cell terminal-client-version-td" style="${cell}">${escapeHtml(r.model)}</td>` +
        `<td class="semi-dy-open-table-row-cell terminal-client-version-td" style="${cell}">${Number(r.value).toLocaleString('en-US')}</td>` +
        `<td class="semi-dy-open-table-row-cell terminal-client-version-td" style="${cell}">${pct}%</td>` +
        '</tr>'
      );
    }).join('');
    wrap.innerHTML =
      '<div class="semi-dy-open-table-wrapper">' +
      '<div class="semi-dy-open-table-body" style="max-height:288px;overflow-y:auto;overflow-x:auto;">' +
      '<table class="semi-dy-open-table terminal-client-version-fixed-table" ' +
      'style="width:100%;table-layout:fixed;border-collapse:collapse;">' +
      '<colgroup><col style="width:25%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup>' +
      '<thead class="semi-dy-open-table-thead"><tr role="row" class="semi-dy-open-table-row">' +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">序号</th>` +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">版本</th>` +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">用户数</th>` +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">占比</th>` +
      '</tr></thead>' +
      `<tbody class="semi-dy-open-table-tbody">${body}</tbody>` +
      '</table></div></div>';
  }

  function setTerminalClientVersionViewCheckedStyle(group, view) {
    group.querySelectorAll('label[data-view]').forEach(label => {
      const isTarget = label.getAttribute('data-view') === view;
      label.classList.toggle('semi-dy-open-radio-checked', isTarget);
      const inner = label.querySelector('.semi-dy-open-radio-inner');
      if (inner) inner.classList.toggle('semi-dy-open-radio-inner-checked', isTarget);
      const addon = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
      if (addon) addon.classList.toggle('semi-dy-open-radio-addon-buttonRadio-checked', isTarget);
      const innerInner = label.querySelector('.semi-dy-open-radio-inner > input + span');
      if (innerInner) {
        if (isTarget && !innerInner.querySelector('.semi-dy-open-icon-radio')) {
          innerInner.innerHTML = '<span role="img" aria-label="radio" '
            + 'class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-radio">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
            + 'width="1em" height="1em" focusable="false" aria-hidden="true">'
            + '<circle cx="12" cy="12" r="5" fill="currentColor"></circle></svg></span>';
        } else if (!isTarget) {
          innerInner.innerHTML = '';
        }
      }
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = isTarget;
    });
  }

  function initTerminalClientVersionModelViewRadio() {
    const group = document.querySelector('.terminal-client-version-view-radio');
    if (!group || group.dataset.viewBound === '1') return;
    group.dataset.viewBound = '1';

    if (window._terminalClientVersionModelView == null) {
      window._terminalClientVersionModelView = 'distribution';
    }
    setTerminalClientVersionViewCheckedStyle(group, window._terminalClientVersionModelView);

    group.querySelectorAll('label[data-view]').forEach(label => {
      label.addEventListener('click', function (e) {
        e.preventDefault();
        const view = this.getAttribute('data-view');
        if (!view || view === window._terminalClientVersionModelView) return;
        setTerminalClientVersionViewCheckedStyle(group, view);
        window._terminalClientVersionModelView = view;
        updateTerminalClientVersionAnalysis();
      });
    });
  }

  function updateTerminalClientVersionAnalysis(opts) {
    const chartWrap = document.getElementById('terminal-client-version-chart-wrap');
    const chartDom = document.getElementById('terminal-client-version-chart');
    const tableWrap = document.getElementById('terminal-client-version-table-wrap');
    if (!chartWrap || !chartDom || !tableWrap) {
      console.warn('[terminal-client-version] 未找到客户端版本分布容器');
      return;
    }

    const range = opts && opts.range !== undefined ? opts.range : getCurrentRange();

    loadData()
      .then(json => {
        const anchor = getAnchorDate(json);
        const appId = window._terminalClientVersionAppId != null ? window._terminalClientVersionAppId : 'all';
        const category = window._terminalCategory === 'new' ? 'new' : 'active';
        const view = window._terminalClientVersionModelView || 'distribution';

        const modelRows = versionRowsAsModelRows(getVersionRows(json, appId, range, anchor));

        if (view === 'table') {
          chartWrap.style.display = 'none';
          tableWrap.style.display = 'block';
          releaseChart(chartDom);
          renderClientVersionTable(tableWrap, modelRows, category);
          return;
        }

        chartWrap.style.display = 'block';
        tableWrap.style.display = 'none';
        tableWrap.innerHTML = '';
        const { list } = rowsToChartValues(modelRows, category);
        renderBarChart(chartDom, list);
      })
      .catch(err => {
        console.error('[terminal-client-version] 更新失败:', err);
        releaseChart(chartDom);
        chartDom.innerHTML =
          '<div style="height:288px;display:flex;align-items:center;justify-content:center;color:#f53f3f;font-size:13px;">数据加载失败</div>';
      });
  }

  function initTerminalClientVersionAnalysis() {
    initTerminalClientVersionModelViewRadio();
    updateTerminalClientVersionAnalysis();
    bindTerminalClientVersionExportButton();
    console.log('✅ 终端分析 · 客户端版本分布初始化完成');
  }

  window.updateTerminalClientVersionAnalysis = updateTerminalClientVersionAnalysis;
  window.initTerminalClientVersionAnalysis = initTerminalClientVersionAnalysis;
  window.exportTerminalClientVersionDistribution = exportTerminalClientVersionDistribution;
})();
