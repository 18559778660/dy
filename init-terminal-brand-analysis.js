// 终端分析 · 品牌分布（柱形图 + 数据列表 + 导出）
// 数据源：conf/terminal-model-data_brand.json
//   顶层列表兼容：terminalbrandDistribution（当前文件）与 terminalBrandDistribution
//   每日：brands[]，字段 brand / activeUsers / newUsers
//
// 全局状态（与机型分布独立）：
//   window._terminalBrandAppId      —— 'all' | appId   默认 'all'
//   window._terminalBrandModelView  —— 'distribution' | 'table'
// 与机型共用：window._terminalCategory（活跃/新增）、时间范围 .user-terminal-section
//
// 对外：window.initTerminalBrandAnalysis()、window.updateTerminalBrandAnalysis(opts?)
//       window.exportTerminalBrandDistribution()
(function () {
  'use strict';

  const DATA_URL = './conf/terminal-model-data_brand.json';
  const CHART_KEY = 'terminalBrandChartInstance';

  if (typeof window._terminalBrandAppId === 'undefined') window._terminalBrandAppId = 'all';
  if (typeof window._terminalBrandModelView === 'undefined') window._terminalBrandModelView = 'distribution';

  let _dataCache = null;

  function brandAppList(json) {
    if (!json) return [];
    return json.terminalBrandDistribution || json.terminalbrandDistribution || [];
  }

  function loadData() {
    if (_dataCache) return Promise.resolve(_dataCache);
    return fetch(DATA_URL)
      .then(res => {
        if (!res.ok) throw new Error(`加载终端品牌数据失败: ${res.status}`);
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
    const list = brandAppList(json);
    return list.find(a => a && a.appId === appId) || null;
  }

  function getAnchorDate(json) {
    let max = null;
    brandAppList(json).forEach(app => {
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

  function getBrandRows(json, appId, range, anchor) {
    if (!anchor) return [];
    let daySlices = [];
    if (appId === 'all') {
      brandAppList(json).forEach(app => {
        if (!app || !app.appId) return;
        daySlices = daySlices.concat(pickDays(app, range, anchor));
      });
    } else {
      const app = pickApp(json, appId);
      daySlices = pickDays(app, range, anchor);
    }
    if (!daySlices.length) return [];
    return aggregateList(daySlices, 'brands', 'brand', ['activeUsers', 'newUsers']);
  }

  /** 聚合结果为 brand 字段，转成与机型相同的 { model, activeUsers, newUsers } 供图表/表复用逻辑 */
  function brandRowsAsModelRows(rows) {
    return rows.map(r => ({
      model: r.brand,
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

  function exportTerminalBrandDistribution() {
    loadData()
      .then(json => {
        const range = getCurrentRange();
        const anchor = getAnchorDate(json);
        const appId = window._terminalBrandAppId != null ? window._terminalBrandAppId : 'all';
        const category = window._terminalCategory === 'new' ? 'new' : 'active';
        const rows = brandRowsAsModelRows(getBrandRows(json, appId, range, anchor));
        const { list, total } = rowsToChartValues(rows, category);
        if (!list.length) {
          console.warn('[terminal-brand] 暂无数据可导出');
          return;
        }
        const header = ['品牌', '用户数', '占比'].map(escapeCsvCell).join(',');
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
        link.download = `品牌分布_${dateStr}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('✅ 品牌分布已导出:', link.download);
      })
      .catch(err => {
        console.error('[terminal-brand] 导出失败:', err);
      });
  }

  function bindTerminalBrandExportButton() {
    const btn = document.querySelector('.export-terminal-brand-btn');
    if (!btn || btn.dataset.terminalBrandExportBound === '1') return;
    btn.dataset.terminalBrandExportBound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      exportTerminalBrandDistribution();
    });
  }

  function disconnectChartResize(container) {
    if (container && container._terminalBrandBarRo) {
      try { container._terminalBrandBarRo.disconnect(); } catch (e) { /* ignore */ }
      container._terminalBrandBarRo = null;
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
      data: [{ id: 'brandBar', values: valuesWithSeries }],
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
    container._terminalBrandBarRo = ro;
  }

  function renderBrandTable(wrap, modelRows, category) {
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
        `<td class="semi-dy-open-table-row-cell terminal-brand-td" style="${cell}">${rank}</td>` +
        `<td class="semi-dy-open-table-row-cell terminal-brand-td" style="${cell}">${escapeHtml(r.model)}</td>` +
        `<td class="semi-dy-open-table-row-cell terminal-brand-td" style="${cell}">${Number(r.value).toLocaleString('en-US')}</td>` +
        `<td class="semi-dy-open-table-row-cell terminal-brand-td" style="${cell}">${pct}%</td>` +
        '</tr>'
      );
    }).join('');
    wrap.innerHTML =
      '<div class="semi-dy-open-table-wrapper">' +
      '<div class="semi-dy-open-table-body" style="max-height:288px;overflow-y:auto;overflow-x:auto;">' +
      '<table class="semi-dy-open-table terminal-brand-fixed-table" ' +
      'style="width:100%;table-layout:fixed;border-collapse:collapse;">' +
      '<colgroup><col style="width:25%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup>' +
      '<thead class="semi-dy-open-table-thead"><tr role="row" class="semi-dy-open-table-row">' +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">序号</th>` +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">品牌</th>` +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">用户数</th>` +
      `<th class="semi-dy-open-table-row-head" style="${thSticky}">占比</th>` +
      '</tr></thead>' +
      `<tbody class="semi-dy-open-table-tbody">${body}</tbody>` +
      '</table></div></div>';
  }

  function setTerminalBrandViewCheckedStyle(group, view) {
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

  function initTerminalBrandModelViewRadio() {
    const group = document.querySelector('.terminal-brand-view-radio');
    if (!group || group.dataset.viewBound === '1') return;
    group.dataset.viewBound = '1';

    if (window._terminalBrandModelView == null) {
      window._terminalBrandModelView = 'distribution';
    }
    setTerminalBrandViewCheckedStyle(group, window._terminalBrandModelView);

    group.querySelectorAll('label[data-view]').forEach(label => {
      label.addEventListener('click', function (e) {
        e.preventDefault();
        const view = this.getAttribute('data-view');
        if (!view || view === window._terminalBrandModelView) return;
        setTerminalBrandViewCheckedStyle(group, view);
        window._terminalBrandModelView = view;
        updateTerminalBrandAnalysis();
      });
    });
  }

  function updateTerminalBrandAnalysis(opts) {
    const chartWrap = document.getElementById('terminal-brand-chart-wrap');
    const chartDom = document.getElementById('terminal-brand-chart');
    const tableWrap = document.getElementById('terminal-brand-table-wrap');
    if (!chartWrap || !chartDom || !tableWrap) {
      console.warn('[terminal-brand] 未找到品牌分布容器');
      return;
    }

    const range = opts && opts.range !== undefined ? opts.range : getCurrentRange();

    loadData()
      .then(json => {
        const anchor = getAnchorDate(json);
        const appId = window._terminalBrandAppId != null ? window._terminalBrandAppId : 'all';
        const category = window._terminalCategory === 'new' ? 'new' : 'active';
        const view = window._terminalBrandModelView || 'distribution';

        const modelRows = brandRowsAsModelRows(getBrandRows(json, appId, range, anchor));

        if (view === 'table') {
          chartWrap.style.display = 'none';
          tableWrap.style.display = 'block';
          releaseChart(chartDom);
          renderBrandTable(tableWrap, modelRows, category);
          return;
        }

        chartWrap.style.display = 'block';
        tableWrap.style.display = 'none';
        tableWrap.innerHTML = '';
        const { list } = rowsToChartValues(modelRows, category);
        renderBarChart(chartDom, list);
      })
      .catch(err => {
        console.error('[terminal-brand] 更新失败:', err);
        releaseChart(chartDom);
        chartDom.innerHTML =
          '<div style="height:288px;display:flex;align-items:center;justify-content:center;color:#f53f3f;font-size:13px;">数据加载失败</div>';
      });
  }

  function initTerminalBrandAnalysis() {
    initTerminalBrandModelViewRadio();
    updateTerminalBrandAnalysis();
    bindTerminalBrandExportButton();
    console.log('✅ 终端分析 · 品牌分布初始化完成');
  }

  window.updateTerminalBrandAnalysis = updateTerminalBrandAnalysis;
  window.initTerminalBrandAnalysis = initTerminalBrandAnalysis;
  window.exportTerminalBrandDistribution = exportTerminalBrandDistribution;
})();
