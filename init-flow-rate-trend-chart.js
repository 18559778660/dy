(function () {
  'use strict';

  const DATA_URL = 'conf/flow-rate-ad-data.json';
  let _adData = null;
  let _chartInstance = null;

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

  function aggregateByDate(records, metric) {
    const dateMap = {};

    records.forEach(record => {
      const date = record.date;
      if (!dateMap[date]) {
        dateMap[date] = { sum: 0, count: 0, clickPV: 0, exposurePV: 0 };
      }
      const adTypes = record.adTypes || {};
      Object.values(adTypes).forEach(ad => {
        if (metric === 'clickRate') {
          dateMap[date].clickPV += ad.clickPV || 0;
          dateMap[date].exposurePV += ad.exposurePV || 0;
        } else if (metric === 'ecpm') {
          if (ad.ecpm) {
            dateMap[date].sum += ad.ecpm;
            dateMap[date].count++;
          }
        } else {
          dateMap[date].sum += ad[metric] || 0;
        }
      });
    });

    const result = [];
    Object.keys(dateMap).sort().forEach(date => {
      let value;
      if (metric === 'clickRate') {
        value = dateMap[date].exposurePV > 0 ? dateMap[date].clickPV / dateMap[date].exposurePV : 0;
      } else if (metric === 'ecpm') {
        value = dateMap[date].count > 0 ? dateMap[date].sum / dateMap[date].count : 0;
      } else {
        value = dateMap[date].sum;
      }
      result.push({ date, value });
    });

    return result;
  }

  function getMetricLabel(metric) {
    const labels = {
      adRequestPV: '广告请求PV',
      exposurePV: '曝光PV',
      clickPV: '点击PV',
      clickRate: '点击率',
      ecpm: 'ECPM',
      revenueBeforeSplit: '分成前广告收入(元)',
      revenueAfterSplit: '分成后广告收入(元)'
    };
    return labels[metric] || metric;
  }

  function formatValue(value, metric) {
    if (metric === 'clickRate') {
      return (value * 100).toFixed(4) + '%';
    }
    if (metric === 'ecpm' || metric === 'revenueBeforeSplit' || metric === 'revenueAfterSplit') {
      return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString('zh-CN');
  }

  function renderChart(chartData, metric) {
    const container = document.querySelector('.flow-rate-trend-chart-wrap');
    if (!container) return;

    if (_chartInstance) {
      _chartInstance.release();
      _chartInstance = null;
    }

    if (!chartData || chartData.length === 0) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">暂无数据</div>';
      return;
    }

    container.innerHTML = '';

    const metricLabel = getMetricLabel(metric);
    const isPercent = metric === 'clickRate';

    const spec = {
      type: 'line',
      data: [{
        id: 'trend',
        values: chartData.map(d => ({
          date: d.date,
          value: d.value,
          metric: metricLabel
        }))
      }],
      xField: 'date',
      yField: 'value',
      seriesField: 'metric',
      line: {
        style: {
          lineWidth: 2,
          curveType: 'monotone'
        }
      },
      point: {
        visible: true,
        style: {
          size: 6,
          fill: '#fff',
          stroke: '#1890ff',
          lineWidth: 2
        }
      },
      axes: [
        {
          orient: 'bottom',
          label: { visible: true }
        },
        {
          orient: 'left',
          label: {
            visible: true,
            formatMethod: isPercent ? (v) => (v * 100).toFixed(2) + '%' : undefined
          }
        }
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: (datum) => datum.metric,
              value: (datum) => formatValue(datum.value, metric)
            }
          ]
        },
        dimension: {
          content: [
            {
              key: (datum) => datum.metric,
              value: (datum) => formatValue(datum.value, metric)
            }
          ]
        }
      },
      legends: {
        visible: true,
        orient: 'bottom',
        position: 'middle'
      },
      color: ['#1890ff']
    };

    if (typeof VChart !== 'undefined') {
      _chartInstance = new VChart.default(spec, { dom: container });
      _chartInstance.renderSync();
    }
  }

  function updateFlowRateTrendChart() {
    const timeRange = window._flowRateTimeRange || 'yesterday';
    const apps = Array.isArray(window._flowRateAppSelected) && window._flowRateAppSelected.length > 0
      ? window._flowRateAppSelected
      : ['all'];
    const os = window._flowRateOs || 'all';
    const attribution = window._flowRateAttribution || 'all';
    const adType = window._flowRateAdType || 'all';
    const metric = window._flowRateMetric || 'adRequestPV';

    const dates = getDateRange(timeRange);

    loadAdData().then(data => {
      const records = filterRecords(data, { dates, apps, os, attribution, adType });
      const chartData = aggregateByDate(records, metric);
      renderChart(chartData, metric);
      console.log('[flow-rate-trend] 图表渲染完成, 筛选:', { timeRange, adType, metric }, '数据点:', chartData.length);
    });
  }

  function initFlowRateTrendChart() {
    updateFlowRateTrendChart();
    console.log('✅ 流量主趋势图初始化完成');
  }

  window.initFlowRateTrendChart = initFlowRateTrendChart;
  window.updateFlowRateTrendChart = updateFlowRateTrendChart;
})();
