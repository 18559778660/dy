(function () {
  'use strict';

  const DATA_URL = 'conf/flow-rate-ad-data.json';
  let _adData = null;

  const APP_LABELS = {
    dy: '抖音',
    dyjz: '抖音极速版',
    xg: '西瓜视频',
    tt: '今日头条',
    ttjb: '头条极速版'
  };

  function loadAdData() {
    if (_adData) return Promise.resolve(_adData);
    return fetch(DATA_URL)
      .then(res => res.json())
      .then(json => {
        _adData = json;
        return json;
      });
  }

  function getDateRange(range) {
    const today = new Date();
    const dates = [];
    let days = 1;
    if (range === '7') days = 7;
    else if (range === '30') days = 30;
    for (let i = 1; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates.sort();
  }

  function filterRecords(data, filters) {
    const { dates, apps, os, attribution, adType } = filters;
    return data.flowRateAdData.filter(record => {
      if (!dates.includes(record.date)) return false;
      if (!apps.includes('all') && !apps.includes(record.appId)) return false;
      if (os !== 'all' && record.os !== os) return false;
      if (attribution !== 'all' && record.attribution !== attribution) return false;
      return true;
    }).map(record => {
      if (adType === 'all') return record;
      const filteredAdTypes = {};
      if (record.adTypes && record.adTypes[adType]) {
        filteredAdTypes[adType] = record.adTypes[adType];
      }
      return { ...record, adTypes: filteredAdTypes };
    });
  }

  function aggregateByDateAndApp(records) {
    const key = (date, appId) => `${date}|${appId}`;
    const map = {};

    records.forEach(record => {
      const k = key(record.date, record.appId);
      if (!map[k]) {
        map[k] = {
          date: record.date,
          appId: record.appId,
          adRequestPV: 0,
          exposurePV: 0,
          clickPV: 0,
          ecpmSum: 0,
          ecpmCount: 0,
          revenueBeforeSplit: 0,
          revenueAfterSplit: 0
        };
      }
      const adTypes = record.adTypes || {};
      Object.values(adTypes).forEach(ad => {
        map[k].adRequestPV += ad.adRequestPV || 0;
        map[k].exposurePV += ad.exposurePV || 0;
        map[k].clickPV += ad.clickPV || 0;
        map[k].revenueBeforeSplit += ad.revenueBeforeSplit || 0;
        map[k].revenueAfterSplit += ad.revenueAfterSplit || 0;
        if (ad.ecpm) {
          map[k].ecpmSum += ad.ecpm;
          map[k].ecpmCount++;
        }
      });
    });

    return Object.values(map).map(row => ({
      date: row.date,
      appId: row.appId,
      appName: APP_LABELS[row.appId] || row.appId,
      adRequestPV: row.adRequestPV,
      exposurePV: row.exposurePV,
      clickPV: row.clickPV,
      clickRate: row.exposurePV > 0 ? row.clickPV / row.exposurePV : 0,
      ecpm: row.ecpmCount > 0 ? row.ecpmSum / row.ecpmCount : 0,
      revenueBeforeSplit: row.revenueBeforeSplit,
      revenueAfterSplit: row.revenueAfterSplit
    })).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.appId.localeCompare(b.appId);
    });
  }

  function formatNumber(num, decimals) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    if (decimals !== undefined) {
      return num.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    return num.toLocaleString('zh-CN');
  }

  function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return (num * 100).toFixed(4) + '%';
  }

  function formatDate(dateStr) {
    return dateStr.replace(/-/g, '/');
  }

  function renderTable(rows) {
    const container = document.querySelector('.flow-rate-detail-table-wrap');
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无数据</div>';
      return;
    }

    const headerStyle = 'background: rgb(248, 248, 248);';
    const html = `
      <div class="omg-table-box">
        <div class="semi-dy-open-table-wrapper" data-column-fixed="false">
          <div class="semi-dy-open-table-scroll-position-left">
            <div class="semi-dy-open-table-container">
              <div class="semi-dy-open-table-body">
                <table role="grid" class="semi-dy-open-table">
                  <colgroup class="semi-dy-open-table-colgroup">
                    <col style="width: 120px; min-width: 120px;">
                    <col style="width: 100px; min-width: 100px;">
                    <col style="width: 120px; min-width: 120px;">
                    <col style="width: 100px; min-width: 100px;">
                    <col style="width: 100px; min-width: 100px;">
                    <col style="width: 100px; min-width: 100px;">
                    <col style="width: 80px; min-width: 80px;">
                    <col style="width: 140px; min-width: 140px;">
                    <col style="width: 140px; min-width: 140px;">
                  </colgroup>
                  <thead class="semi-dy-open-table-thead">
                    <tr role="row" class="semi-dy-open-table-row">
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">日期</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">APP</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">广告请求PV</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">曝光PV</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">点击PV</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">点击率</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">ECPM</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">分成前广告收入(元)</th>
                      <th class="semi-dy-open-table-row-head" style="${headerStyle}">分成后广告收入(元)</th>
                    </tr>
                  </thead>
                  <tbody class="semi-dy-open-table-tbody">
                    ${rows.map((row, idx) => `
                      <tr role="row" class="semi-dy-open-table-row" data-row-key="${idx}">
                        <td class="semi-dy-open-table-row-cell">${formatDate(row.date)}</td>
                        <td class="semi-dy-open-table-row-cell">${row.appName}</td>
                        <td class="semi-dy-open-table-row-cell">${formatNumber(row.adRequestPV)}</td>
                        <td class="semi-dy-open-table-row-cell">${formatNumber(row.exposurePV)}</td>
                        <td class="semi-dy-open-table-row-cell">${formatNumber(row.clickPV)}</td>
                        <td class="semi-dy-open-table-row-cell">${formatPercent(row.clickRate)}</td>
                        <td class="semi-dy-open-table-row-cell">${formatNumber(row.ecpm, 2)}</td>
                        <td class="semi-dy-open-table-row-cell">${formatNumber(row.revenueBeforeSplit, 2)}</td>
                        <td class="semi-dy-open-table-row-cell">${formatNumber(row.revenueAfterSplit, 2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
  }

  function updateFlowRateDetailTable() {
    const timeRange = window._flowRateTimeRange || 'yesterday';
    const apps = Array.isArray(window._flowRateAppSelected) && window._flowRateAppSelected.length > 0
      ? window._flowRateAppSelected
      : ['all'];
    const os = window._flowRateOs || 'all';
    const attribution = window._flowRateAttribution || 'all';
    const adType = window._flowRateTableAdType || 'all';

    const dates = getDateRange(timeRange);

    loadAdData().then(data => {
      const records = filterRecords(data, { dates, apps, os, attribution, adType });
      const rows = aggregateByDateAndApp(records);
      renderTable(rows);
      console.log('[flow-rate-table] 表格渲染完成, 行数:', rows.length);
    });
  }

  function initFlowRateDetailTable() {
    updateFlowRateDetailTable();
    console.log('✅ 流量主明细表格初始化完成');
  }

  function escapeCsvCell(val) {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportFlowRateDetailTable() {
    const timeRange = window._flowRateTimeRange || 'yesterday';
    const apps = Array.isArray(window._flowRateAppSelected) && window._flowRateAppSelected.length > 0
      ? window._flowRateAppSelected
      : ['all'];
    const os = window._flowRateOs || 'all';
    const attribution = window._flowRateAttribution || 'all';
    const adType = window._flowRateTableAdType || 'all';

    const dates = getDateRange(timeRange);

    loadAdData().then(data => {
      const records = filterRecords(data, { dates, apps, os, attribution, adType });
      const rows = aggregateByDateAndApp(records);

      if (!rows || rows.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      const headers = ['日期', 'APP', '广告请求PV', '曝光PV', '点击PV', '点击率', 'ECPM', '分成前广告收入(元)', '分成后广告收入(元)'];
      const csvRows = [headers.map(escapeCsvCell).join(',')];

      rows.forEach(row => {
        csvRows.push([
          escapeCsvCell(formatDate(row.date)),
          escapeCsvCell(row.appName),
          escapeCsvCell(formatNumber(row.adRequestPV)),
          escapeCsvCell(formatNumber(row.exposurePV)),
          escapeCsvCell(formatNumber(row.clickPV)),
          escapeCsvCell(formatPercent(row.clickRate)),
          escapeCsvCell(formatNumber(row.ecpm, 2)),
          escapeCsvCell(formatNumber(row.revenueBeforeSplit, 2)),
          escapeCsvCell(formatNumber(row.revenueAfterSplit, 2))
        ].join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '广告指标明细_' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[flow-rate-table] 导出完成, 行数:', rows.length);
    });
  }

  window.initFlowRateDetailTable = initFlowRateDetailTable;
  window.updateFlowRateDetailTable = updateFlowRateDetailTable;
  window.exportFlowRateDetailTable = exportFlowRateDetailTable;
})();
