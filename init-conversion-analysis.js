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

    // 录屏数据指标配置
    const RECORD_METRICS = [
        { key: 'recordPublishClicks', label: '点击发布录屏次数', type: 'number' },
        { key: 'recordPublishUsers', label: '点击发布录屏人数', type: 'number' },
        { key: 'recordPublishRate', label: '点击发布录屏率', type: 'rate' },
        { key: 'recordSuccessRate', label: '录屏成功发布率', type: 'rate' },
        { key: 'avgSuccessVideos', label: '人均成功发布视频数', type: 'decimal' }
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

    let _dataCache = null;

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

    // 从 day 项按 os 取分支：ios / android / all(两者都要)
    function pickOsBranches(dayItem, os) {
        if (!dayItem) return [];
        if (os === 'ios') return dayItem.ios ? [dayItem.ios] : [];
        if (os === 'android') return dayItem.android ? [dayItem.android] : [];
        const out = [];
        if (dayItem.ios) out.push(dayItem.ios);
        if (dayItem.android) out.push(dayItem.android);
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

    function buildCardHtml(metric, valueText, compareLabel, compare, isFirst) {
        const checkedClass = isFirst ? 'omg-metric-card-bordered-checked' : '';
        return `
<div>
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

            const html = RECORD_METRICS.map((m, i) => {
                const valueText = formatValue(currMetrics[m.key], m.type);
                const compare = calcCompare(currMetrics[m.key], prevMetrics[m.key]);
                return buildCardHtml(m, valueText, compareLabel, compare, i === 0);
            }).join('');

            container.innerHTML = html;
            console.log(`[conversion] 录屏卡片已渲染，appId=${appId}, os=${os}, range=${range}, currDates=${currDates.join(',')}`);
        }).catch(err => {
            console.error('[conversion] 数据加载失败', err);
            container.innerHTML = '<div class="p-4 text-text-2">数据加载失败</div>';
        });
    }

    // 首次初始化（由 load-dashboard.js 在用户分析页加载完后调用）
    // opts: { appId, os, date } —— 全部可选，缺省走全局状态/数据默认
    function initConversionAnalysis(opts) {
        renderRecordCards(opts || {});
    }

    // 顶层下拉（APP / OS）切换后调用，读取全局状态重新渲染
    function updateConversionAnalysis(opts) {
        renderRecordCards(opts || {});
    }

    window.initConversionAnalysis = initConversionAnalysis;
    window.updateConversionAnalysis = updateConversionAnalysis;
    // 兼容老名字
    window.renderConversionRecordCards = renderRecordCards;
})();
