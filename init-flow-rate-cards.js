(function () {
  'use strict';

  const DATA_URL = 'conf/flow-rate-ad-data.json';
  let _adData = null;

  function loadAdData() {
    if (_adData) return Promise.resolve(_adData);
    return fetch(DATA_URL)
      .then(res => res.json())
      .then(json => {
        _adData = json;
        return json;
      });
  }

  function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
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
    return dates;
  }

  function filterRecords(data, filters) {
    const { dates, apps, os, attribution } = filters;
    return data.flowRateAdData.filter(record => {
      if (!dates.includes(record.date)) return false;
      if (!apps.includes('all') && !apps.includes(record.appId)) return false;
      if (os !== 'all' && record.os !== os) return false;
      if (attribution !== 'all' && record.attribution !== attribution) return false;
      return true;
    });
  }

  function aggregateMetrics(records) {
    const result = {
      adRequestPV: 0,
      exposurePV: 0,
      clickPV: 0,
      ecpm: 0,
      revenueBeforeSplit: 0,
      revenueAfterSplit: 0
    };
    let ecpmCount = 0;

    records.forEach(record => {
      const adTypes = record.adTypes || {};
      Object.values(adTypes).forEach(ad => {
        result.adRequestPV += ad.adRequestPV || 0;
        result.exposurePV += ad.exposurePV || 0;
        result.clickPV += ad.clickPV || 0;
        result.revenueBeforeSplit += ad.revenueBeforeSplit || 0;
        result.revenueAfterSplit += ad.revenueAfterSplit || 0;
        if (ad.ecpm) {
          result.ecpm += ad.ecpm;
          ecpmCount++;
        }
      });
    });

    result.clickRate = result.exposurePV > 0 ? result.clickPV / result.exposurePV : 0;
    result.ecpm = ecpmCount > 0 ? result.ecpm / ecpmCount : 0;

    return result;
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

  function renderCards(metrics) {
    const container = document.querySelector('.flow-rate-overview-cards');
    if (!container) return;

    const mapping = {
      adRequestPV: formatNumber(metrics.adRequestPV),
      exposurePV: formatNumber(metrics.exposurePV),
      clickPV: formatNumber(metrics.clickPV),
      clickRate: formatPercent(metrics.clickRate),
      ecpm: formatNumber(metrics.ecpm, 2),
      revenueBeforeSplit: formatNumber(metrics.revenueBeforeSplit, 2),
      revenueAfterSplit: formatNumber(metrics.revenueAfterSplit, 2)
    };

    container.querySelectorAll('[data-metric]').forEach(card => {
      const key = card.getAttribute('data-metric');
      const valueEl = card.querySelector('.omg-metric-card-number');
      if (valueEl && mapping[key] !== undefined) {
        valueEl.textContent = mapping[key];
      }
    });
  }

  function updateFlowRateCards() {
    const timeRange = window._flowRateTimeRange || 'yesterday';
    const apps = Array.isArray(window._flowRateAppSelected) && window._flowRateAppSelected.length > 0
      ? window._flowRateAppSelected
      : ['all'];
    const os = window._flowRateOs || 'all';
    const attribution = window._flowRateAttribution || 'all';

    const dates = getDateRange(timeRange);

    loadAdData().then(data => {
      const records = filterRecords(data, { dates, apps, os, attribution });
      const metrics = aggregateMetrics(records);
      renderCards(metrics);
      console.log('[flow-rate-cards] 渲染完成, 筛选条件:', { timeRange, apps, os, attribution }, '匹配记录:', records.length);
    });
  }

  function initFlowRateCards() {
    updateFlowRateCards();
    console.log('✅ 流量主数据卡片初始化完成');
  }

  window.initFlowRateCards = initFlowRateCards;
  window.updateFlowRateCards = updateFlowRateCards;
})();
