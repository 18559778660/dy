// 终端分析 · 品牌分布（UI 与机型分布区块一致；数据后续接 conf/terminal-model-data_brand.json）
//
// 全局状态（与机型分布独立，避免互相覆盖）：
//   window._terminalBrandAppId      —— 'all' | appId   默认 'all'
//   window._terminalBrandModelView  —— 'distribution' | 'table'
//
// 对外：window.initTerminalBrandAnalysis()、window.updateTerminalBrandAnalysis(opts?)
(function () {
  'use strict';

  if (typeof window._terminalBrandAppId === 'undefined') window._terminalBrandAppId = 'all';
  if (typeof window._terminalBrandModelView === 'undefined') window._terminalBrandModelView = 'distribution';

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

  /** 当前仅做布局占位：分布图 / 数据列表切换（接 brand JSON 后在此渲染图表与表格） */
  function updateTerminalBrandAnalysis(opts) {
    const chartWrap = document.getElementById('terminal-brand-chart-wrap');
    const chartDom = document.getElementById('terminal-brand-chart');
    const tableWrap = document.getElementById('terminal-brand-table-wrap');
    if (!chartWrap || !chartDom || !tableWrap) {
      console.warn('[terminal-brand] 未找到品牌分布容器');
      return;
    }

    const view = window._terminalBrandModelView || 'distribution';
    if (opts && opts.range !== undefined) {
      console.log('[terminal-brand] 时间范围变更（数据待接入）:', opts.range);
    }

    if (view === 'table') {
      chartWrap.style.display = 'none';
      tableWrap.style.display = 'block';
      tableWrap.innerHTML =
        '<div class="semi-dy-open-table-wrapper">' +
        '<div class="semi-dy-open-table-body" style="max-height:288px;overflow-y:auto;">' +
        '<div style="min-height:200px;display:flex;align-items:center;justify-content:center;color:#86909c;font-size:13px;">暂无数据</div>' +
        '</div></div>';
      return;
    }

    chartWrap.style.display = 'block';
    tableWrap.style.display = 'none';
    tableWrap.innerHTML = '';
    chartDom.innerHTML =
      '<div style="height:288px;display:flex;align-items:center;justify-content:center;color:#86909c;font-size:13px;">暂无数据</div>';
  }

  function initTerminalBrandAnalysis() {
    initTerminalBrandModelViewRadio();
    updateTerminalBrandAnalysis();
    console.log('✅ 终端分析 · 品牌分布 UI 初始化完成');
  }

  window.updateTerminalBrandAnalysis = updateTerminalBrandAnalysis;
  window.initTerminalBrandAnalysis = initTerminalBrandAnalysis;
})();
