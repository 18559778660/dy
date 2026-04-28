// 用户分析页面图表初始化
(function () {
    console.log('开始初始化用户分析图表...');

    // 将初始化函数暴露到全局作用域，供页面切换时重新调用
    window.initUserAnalysisChart = initUserAnalysisChart;
    window.initRealTimeChart = initRealTimeChart;

    // 将初始化卡片数据函数暴露到全局作用域
    window.initUserAnalysisCards = initUserAnalysisCards;

    // 图表实例和容器
    let userAnalysisChartInstance = null;
    let userAnalysisChartContainer = null;

    /**
     * 创建图表配置（公共配置）
     */
    function createChartConfig(data) {
        return {
            type: 'area',
            data: [{ values: data, id: 'data' }],
            xField: 'date',
            yField: 'value',
            seriesField: 'medalType',
            // 线条样式
            line: {
                style: {
                    stroke: '#1C5CFB',
                    lineWidth: 2
                }
            },
            // 数据点配置 - 默认点不可见，hover 显示空心圆点
            point: {
                style: {
                    size: 0  // 默认不显示点
                },
                state: {
                    dimension_hover: {
                        size: 10,              // hover 时圆点大小
                        fill: '#ffffff',      // 白色填充（空心效果）
                        stroke: '#1C5CFB',    // 蓝色描边
                        lineWidth: 2          // 描边宽度
                    }
                }
            },
            // 区域渐变填充
            area: {
                visible: true,
                style: {
                    curveType: 'monotone',
                    fill: {
                        gradient: 'linear',
                        x0: 0, y0: 0,      // 起点：顶部
                        x1: 0, y1: 1,     // 终点：底部（从上到下的渐变）
                        stops: [
                            { offset: 0, color: 'rgb(73, 127, 252)', opacity: 0.3 },
                            { offset: 1, color: 'rgb(73, 127, 252)', opacity: 0.05 }
                        ]
                    }
                }
            },
            // 坐标轴
            axes: [
                {
                    orient: 'left',
                    grid: {
                        visible: true,
                        style: {
                            lineDash: [],
                            stroke: '#E5E6EB'
                        }
                    },
                    label: {
                        visible: true,
                        style: {
                            fill: '#8F959E'
                        }
                    }
                },
                {
                    orient: 'bottom',
                    label: {
                        visible: true,
                        style: {
                            fill: '#8F959E'
                        }
                    }
                }
            ],
            // 悬停提示
            tooltip: {
                mark: {
                    content: {
                        valueFormatter: '{displayValue}'
                    }
                },
                dimension: {
                    content: {
                        valueFormatter: '{displayValue}'
                    }
                }
            },
            // 十字准星线 - hover 时的虚线背景
            crosshair: {
                xField: {
                    visible: true,
                    line: {
                        type: 'line',
                        style: {
                            lineWidth: 1,
                            opacity: 0.6,
                            stroke: 'rgb(138, 141, 143)',
                            lineDash: [4, 4]
                        }
                    },
                    bindingAxesIndex: [1]
                },
                yField: {
                    visible: false,
                    bindingAxesIndex: [0, 2],
                    defaultSelect: {
                        axisIndex: 2,
                        datum: 40
                    },
                    line: {
                        style: {
                            lineWidth: 1,
                            opacity: 1,
                            stroke: '#000',
                            lineDash: [2, 2]
                        }
                    }
                }
            }
        };
    }

    /**
     * 渲染图表（公共渲染函数）
     * @param {string} containerId - 容器ID
     * @param {Array} data - 数据数组
     * @param {string} chartTitle - 图表标题
     * @param {Object} options - 可选配置
     * @param {boolean} options.yAxisPercent - Y轴是否显示百分比
     */
    function renderChart(containerId, data, chartTitle, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ 未找到图表容器 ${containerId}`);
            return null;
        }

        // 清空容器，避免重复渲染
        container.innerHTML = '';
        console.log(`✅ 找到图表容器: ${containerId}`);

        try {
            const ChartClass = VChart.VChart || VChart;
            let config = createChartConfig(data);

            // 如果指定了Y轴百分比，修改配置
            if (options.yAxisPercent) {
                config.axes[0].label.formatMethod = (val) => {
                    return val + '%';
                };
            }

            const vchart = new ChartClass(config, {
                dom: container,
                width: container.offsetWidth || 765,
                height: container.offsetHeight || 305
            });

            // 渲染图表
            vchart.renderAsync().then(() => {
                console.log(`✅ [${chartTitle}] 渲染完成`);
                createChartTitle(container, chartTitle);
            }).catch(err => {
                console.error(`❌ [${chartTitle}] 渲染失败:`, err);
            });

            return vchart;
        } catch (error) {
            console.error(`❌ [${chartTitle}] 创建失败:`, error);
            return null;
        }
    }

    function initUserAnalysisChart() {
        // 从 JSON 配置中获取数据
        let data = [];
        let chartTitle = '活跃用户数';

        if (window.chartDataConfig && window.chartDataConfig.overview && window.chartDataConfig.overview.length > 0) {
            const chartConfig = window.chartDataConfig.overview[0];
            // 过滤最近 7 天的数据（不包括今天）
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const filteredData = chartConfig.data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= sevenDaysAgo && itemDate < today;
            });

            data = filteredData.map(item => ({
                date: item.date,
                value: item.dailyUsers,
                displayValue: item.dailyUsers.toLocaleString('zh-CN'),
                medalType: '活跃用户数'
            }));

            console.log('✅ [用户分析图表] 使用 JSON 配置数据:', chartTitle, `(最近 7 天，共${data.length}条数据)`);
        } else {
            console.log('⚠️ 未找到图表数据配置');
        }

        // 使用公共渲染函数
        const vchart = renderChart('visactor_window_user', data, chartTitle);
        if (vchart) {
            userAnalysisChartInstance = vchart;
            userAnalysisChartContainer = document.getElementById('visactor_window_user');
        }
    }

    // 缓存小时权重配置
    let _hourlyWeightsCache = null;

    /**
     * 加载小时权重配置
     */
    function loadHourlyWeights() {
        if (_hourlyWeightsCache) {
            return Promise.resolve(_hourlyWeightsCache);
        }
        return fetch('./conf/hourly-weights.json')
            .then(res => res.json())
            .then(config => {
                _hourlyWeightsCache = config.hourlyWeights;
                return _hourlyWeightsCache;
            });
    }

    /**
     * 根据日活总数和权重生成每小时数据
     */
    function generateHourlyData(dailyTotal, weights, currentHour) {
        const data = [];
        for (let h = 0; h <= currentHour; h++) {
            const hourKey = String(h).padStart(2, '0');
            const weight = weights[hourKey] || 0;
            const value = Math.round(dailyTotal * weight);
            data.push({
                date: `${hourKey}:00:00`,
                value: value,
                displayValue: value.toLocaleString('zh-CN')
            });
        }
        return data;
    }

    /**
     * 获取当前选中 APP 的实时数据
     */
    function getRealTimeAppData() {
        const realTimeList = window.chartDataConfig?.realTime || [];
        const appId = window._realTimeAppId || 'all';
        
        if (appId === 'all') {
            // 全部 APP：累加所有数据
            let totalVisitors = 0, totalVisits = 0;
            realTimeList.forEach(item => {
                totalVisitors += item.dailyVisitors || 0;
                totalVisits += item.dailyVisits || 0;
            });
            return { dailyVisitors: totalVisitors, dailyVisits: totalVisits };
        } else {
            // 指定 APP
            const appData = realTimeList.find(item => item.appId === appId);
            return appData || { dailyVisitors: 0, dailyVisits: 0 };
        }
    }

    /**
     * 初始化实时分析图表
     */
    function initRealTimeChart() {
        const chartTitle = '访问人数';

        if (!window.chartDataConfig || !window.chartDataConfig.realTime) {
            console.log('⚠️ 未找到实时分析图表数据配置');
            renderChart('real_time_window_user', [], chartTitle);
            return;
        }

        const appData = getRealTimeAppData();
        const dailyVisitors = appData.dailyVisitors || 0;
        const currentHour = new Date().getHours();

        loadHourlyWeights().then(weights => {
            const data = generateHourlyData(dailyVisitors, weights, currentHour);
            data.forEach(item => item.medalType = '访问人数');

            console.log('✅ [实时分析图表] 动态权重计算:', chartTitle, `(00:00 - ${String(currentHour).padStart(2, '0')}:00，共${data.length}条数据)`);
            renderChart('real_time_window_user', data, chartTitle);
        });
    }

    /**
     * 更新实时分析图表指标（切换访问人数/访问次数）
     */
    function updateRealTimeChartMetric(metricTitle) {
        console.log('[实时分析] 切换图表指标:', metricTitle);

        const container = document.getElementById('real_time_window_user');
        if (!container) {
            console.error('❌ [实时分析] 未找到图表容器');
            return;
        }

        if (!window.chartDataConfig || !window.chartDataConfig.realTime) {
            console.error('❌ [实时分析] 未找到数据配置');
            return;
        }

        const appData = getRealTimeAppData();
        const dailyTotal = metricTitle === '访问次数' ? appData.dailyVisits : appData.dailyVisitors;
        const currentHour = new Date().getHours();

        loadHourlyWeights().then(weights => {
            const data = generateHourlyData(dailyTotal, weights, currentHour);
            data.forEach(item => item.medalType = metricTitle);

            console.log(`✅ [实时分析] 切换到 ${metricTitle}，共${data.length}条数据`);
            renderChart('real_time_window_user', data, metricTitle);
        });
    }

    /**
     * 更新实时分析（APP 切换时调用）
     */
    function updateRealTimeAnalysis() {
        initRealTimeChart();
        // 同时更新卡片数据
        if (typeof window.renderRealTimeCards === 'function') {
            window.renderRealTimeCards();
        }
    }
    window.updateRealTimeAnalysis = updateRealTimeAnalysis;

    // 将更新函数暴露到全局
    window.updateRealTimeChartMetric = updateRealTimeChartMetric;

    // 动态创建图表标题（与首页保持一致）
    function createChartTitle(chartContainer, title) {
        // 查找是否已存在标题
        let titleElement = chartContainer.parentElement.querySelector('.chart-title');

        if (!titleElement) {
            // 创建标题元素
            titleElement = document.createElement('div');
            titleElement.className = 'chart-title';
            titleElement.style.cssText = `
               display: flex;
               align-items: center;
               justify-content: center;
               font-size: 12px;
               margin-top: 8px;
           `;

            // 创建蓝色小方块
            const square = document.createElement('span');
            square.style.cssText = `
               display: inline-block;
               width: 12px;
               height: 12px;
               background-color: #497ffc;
               margin-right: 8px;
               border-radius: 2px;
           `;

            // 创建标题文字
            const text = document.createElement('span');
            text.textContent = title;
            text.style.color = 'var(--text-2, #747a85)';

            titleElement.appendChild(square);
            titleElement.appendChild(text);

            // 插入到图表容器后面
            chartContainer.parentElement.appendChild(titleElement);
        } else {
            // 更新现有标题
            titleElement.querySelector('span:last-child').textContent = title;
        }
    }

    // 初始化卡片数据（显示昨天数据）
    function initUserAnalysisCards() {
        console.log('开始初始化用户分析卡片数据...');

        if (!window.chartDataConfig || !window.chartDataConfig.overview || !window.chartDataConfig.overview[0]) {
            console.error('未找到图表数据配置');
            return;
        }

        // 获取昨天的日期（YYYY-MM-DD 格式）
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;

        console.log('加载昨天数据:', yesterdayStr);

        const chartConfig = window.chartDataConfig.overview[0];

        // 找到昨天的数据
        const yesterdayData = chartConfig.data.find(item => item.date === yesterdayStr);

        if (!yesterdayData) {
            console.warn('未找到昨天的数据:', yesterdayStr);
            return;
        }

        console.log('昨天数据:', yesterdayData);

        // 找到前天的数据
        const dayBeforeYesterday = new Date();
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
        const dbyYear = dayBeforeYesterday.getFullYear();
        const dbyMonth = String(dayBeforeYesterday.getMonth() + 1).padStart(2, '0');
        const dbyDay = String(dayBeforeYesterday.getDate()).padStart(2, '0');
        const dayBeforeStr = `${dbyYear}-${dbyMonth}-${dbyDay}`;

        const dayBeforeData = chartConfig.data.find(item => item.date === dayBeforeStr);

        if (dayBeforeData) {
            console.log('前天数据:', dayBeforeData);
        }

        // 获取所有卡片元素
        const activeUsersEl = document.querySelector('[data-metric="activeUsers"]');
        const newUsersEl = document.querySelector('[data-metric="newUsers"]');
        const totalUsersEl = document.querySelector('[data-metric="totalUsers"]');
        const sharingEl = document.querySelector('[data-metric="sharing"]');
        const startupEl = document.querySelector('[data-metric="startup"]');
        const avgStartupEl = document.querySelector('[data-metric="avgStartup"]');
        const avgDurationEl = document.querySelector('[data-metric="avgDuration"]');
        const singleAvgDurationEl = document.querySelector('[data-metric="singleAvgDuration"]');
        const shareSuccessEl = document.querySelector('[data-metric="shareSuccess"]');
        const shareNewUsersEl = document.querySelector('[data-metric="shareNewUsers"]');
        const shareSuccessUsersEl = document.querySelector('[data-metric="shareSuccessUsers"]');

        // 获取所有涨幅元素
        const activeUsersCompareEl = document.querySelector('[data-compare="activeUsers"]');
        const newUsersCompareEl = document.querySelector('[data-compare="newUsers"]');
        const totalUsersCompareEl = document.querySelector('[data-compare="totalUsers"]');
        const sharingCompareEl = document.querySelector('[data-compare="sharing"]');
        const startupCompareEl = document.querySelector('[data-compare="startup"]');
        const avgStartupCompareEl = document.querySelector('[data-compare="avgStartup"]');
        const avgDurationCompareEl = document.querySelector('[data-compare="avgDuration"]');
        const singleAvgDurationCompareEl = document.querySelector('[data-compare="singleAvgDuration"]');
        const shareSuccessCompareEl = document.querySelector('[data-compare="shareSuccess"]');
        const shareNewUsersCompareEl = document.querySelector('[data-compare="shareNewUsers"]');
        const shareSuccessUsersCompareEl = document.querySelector('[data-compare="shareSuccessUsers"]');

        // 更新活跃用户数
        if (activeUsersEl) {
            activeUsersEl.textContent = yesterdayData.dailyUsers.toLocaleString('zh-CN');
            console.log('活跃用户数:', yesterdayData.dailyUsers);
        }

        // 更新新增用户数
        if (newUsersEl) {
            newUsersEl.textContent = yesterdayData.newUsers.toLocaleString('zh-CN');
            console.log('新增用户数:', yesterdayData.newUsers);
        }

        // 更新累计用户数
        if (totalUsersEl) {
            // 直接从预组装的 yesterdayData.totalUser 获取
            totalUsersEl.textContent = yesterdayData.totalUser.toLocaleString('zh-CN');
            console.log('累计用户数:', yesterdayData.totalUser);
        }

        // 更新分享次数
        if (sharingEl) {
            sharingEl.textContent = yesterdayData.sharing.toLocaleString('zh-CN');
            console.log('分享次数:', yesterdayData.sharing);
        }

        // 更新启动次数
        if (startupEl) {
            startupEl.textContent = yesterdayData.startup.toLocaleString('zh-CN');
            console.log('启动次数:', yesterdayData.startup);
        }

        // 更新人均启动次数
        if (avgStartupEl) {
            avgStartupEl.textContent = yesterdayData.avgStartup.toFixed(3);
            console.log('人均启动次数:', yesterdayData.avgStartup);
        }

        // 更新人均游戏时长（秒转换为 HH:MM:SS 格式）
        if (avgDurationEl) {
            const durationStr = formatDuration(yesterdayData.avgDuration);
            avgDurationEl.textContent = durationStr;
            console.log('人均游戏时长:', durationStr);
        }

        // 更新次均游戏时长（秒转换为 HH:MM:SS 格式）
        if (singleAvgDurationEl) {
            const singleAvgDurationStr = formatDuration(yesterdayData.singleAvgDuration);
            singleAvgDurationEl.textContent = singleAvgDurationStr;
            console.log('次均游戏时长:', singleAvgDurationStr);
        }

        // 更新分享成功
        if (shareSuccessEl) {
            shareSuccessEl.textContent = yesterdayData.shareSuccess.toLocaleString('zh-CN');
            console.log('分享成功:', yesterdayData.shareSuccess);
        }

        // 更新分享新增用户
        if (shareNewUsersEl) {
            shareNewUsersEl.textContent = yesterdayData.shareNewUsers.toLocaleString('zh-CN');
            console.log('分享新增用户:', yesterdayData.shareNewUsers);
        }

        // 更新分享成功用户
        if (shareSuccessUsersEl) {
            shareSuccessUsersEl.textContent = yesterdayData.shareSuccessUsers.toLocaleString('zh-CN');
            console.log('分享成功用户:', yesterdayData.shareSuccessUsers);
        }

        // 更新涨幅数据
        if (dayBeforeData) {
            updateCompareValues(activeUsersCompareEl, yesterdayData.dailyUsers, dayBeforeData.dailyUsers);
            updateCompareValues(newUsersCompareEl, yesterdayData.newUsers, dayBeforeData.newUsers);

            // 总用户数涨幅（使用预组装的 totalUser 字段）
            updateCompareValues(totalUsersCompareEl, yesterdayData.totalUser, dayBeforeData.totalUser);

            updateCompareValues(sharingCompareEl, yesterdayData.sharing, dayBeforeData.sharing);
            updateCompareValues(startupCompareEl, yesterdayData.startup, dayBeforeData.startup);
            updateCompareValues(avgStartupCompareEl, yesterdayData.avgStartup, dayBeforeData.avgStartup);
            updateCompareValues(avgDurationCompareEl, yesterdayData.avgDuration, dayBeforeData.avgDuration);
            updateCompareValues(singleAvgDurationCompareEl, yesterdayData.singleAvgDuration, dayBeforeData.singleAvgDuration);
            updateCompareValues(shareSuccessCompareEl, yesterdayData.shareSuccess, dayBeforeData.shareSuccess);
            updateCompareValues(shareNewUsersCompareEl, yesterdayData.shareNewUsers, dayBeforeData.shareNewUsers);
            updateCompareValues(shareSuccessUsersCompareEl, yesterdayData.shareSuccessUsers, dayBeforeData.shareSuccessUsers);
        }

        console.log('✅ 用户分析卡片数据已更新');
    }

    // 更新涨幅显示
    function updateCompareValues(element, yesterdayValue, dayBeforeValue) {
        if (!element) return;

        // 计算涨幅百分比
        let comparePercent = 0;
        if (dayBeforeValue > 0) {
            comparePercent = ((yesterdayValue - dayBeforeValue) / dayBeforeValue) * 100;
        }

        // 格式化涨幅
        const sign = comparePercent >= 0 ? '+' : '';
        const percentStr = sign + comparePercent.toFixed(2) + '%';

        element.textContent = percentStr;

        // 设置样式（上涨/下跌）
        if (comparePercent >= 0) {
            element.classList.remove('omg-compares-number-type-down');
            element.classList.add('omg-compares-number-type-up');
        } else {
            element.classList.remove('omg-compares-number-type-up');
            element.classList.add('omg-compares-number-type-down');
        }
    }

    // 格式化时长（秒转为 HH:MM:SS）
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].join(':');
    }

    // 切换图表指标（供 init-metric-tooltip.js 调用）
    window.updateUserAnalysisChartMetric = updateUserAnalysisChartMetric;

    function updateUserAnalysisChartMetric(metricTitle) {
        console.log('[用户分析] 更新图表指标:', metricTitle);

        if (!window.chartDataConfig || !window.chartDataConfig.overview || window.chartDataConfig.overview.length === 0) {
            console.warn('没有图表数据配置');
            return;
        }

        const chartConfig = window.chartDataConfig.overview[0];

        // 过滤最近 7 天的数据（不包括今天）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const filteredData = chartConfig.data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= sevenDaysAgo && itemDate < today;
        });

        // 根据指标选择对应的字段
        let dataField = 'dailyUsers'; // 默认活跃用户数
        if (metricTitle === '新增用户数') {
            dataField = 'newUsers';
        } else if (metricTitle === '人均游戏时长') {
            dataField = 'avgDuration';
        } else if (metricTitle === '次均游戏时长') {
            dataField = 'singleAvgDuration';
        } else if (metricTitle === '累计用户数') {
            // 总用户数需要从原始数据重新计算累计值
            dataField = 'totalUser';
        } else if (metricTitle === '分享次数') {
            dataField = 'sharing';
        } else if (metricTitle === '启动次数') {
            dataField = 'startup';
        } else if (metricTitle === '人均启动次数') {
            dataField = 'avgStartup';
        } else if (metricTitle === '分享成功次数') {
            dataField = 'shareSuccess';
        } else if (metricTitle === '分享新增用户数') {
            dataField = 'shareNewUsers';
        } else if (metricTitle === '分享成功用户数') {
            dataField = 'shareSuccessUsers';
        }

        // 转换数据
        let data = filteredData.map(item => {
            let value = item[dataField];
            let displayValue = value; // 用于 tooltip 显示的值

            // 如果是人均游戏时长或次均游戏时长，将秒数转换为 "HH:MM:SS" 格式字符串用于显示
            if ((metricTitle === '人均游戏时长' || metricTitle === '次均游戏时长') && typeof value === 'number') {
                const hours = Math.floor(value / 3600);
                const minutes = Math.floor((value % 3600) / 60);
                const seconds = value % 60;
                displayValue = [
                    String(hours).padStart(2, '0'),
                    String(minutes).padStart(2, '0'),
                    String(seconds).padStart(2, '0')
                ].join(':');
            } else if (typeof value === 'number') {
                // 其他数字指标使用千位分隔符
                displayValue = value.toLocaleString('zh-CN');
            }

            return {
                date: item.date,
                value: value,           // 数值类型，用于图表渲染
                displayValue: displayValue, // 格式化后的值，用于 tooltip 显示
                medalType: metricTitle
            };
        });

        console.log('✅ [用户分析] 切换到指标:', metricTitle, `(共${data.length}条数据)`);

        // 更新 VChart 数据
        if (userAnalysisChartInstance && userAnalysisChartContainer) {
            userAnalysisChartInstance.updateData('data', data);

            // 更新标题
            createChartTitle(userAnalysisChartContainer, metricTitle);
        }
    }

    /**
     * 留存分析数据缓存
     */
    let _retentionChartDataCache = null;
    const RETENTION_CHART_DATA_URL = 'conf/retention-data.json';

    function loadRetentionChartData() {
        if (_retentionChartDataCache) return Promise.resolve(_retentionChartDataCache);
        return fetch(RETENTION_CHART_DATA_URL)
            .then(res => res.json())
            .then(json => {
                _retentionChartDataCache = json;
                return json;
            });
    }

    /**
     * 聚合留存图表数据（按日期分组）
     */
    function aggregateRetentionChartData(records, field) {
        const grouped = {};
        records.forEach(r => {
            if (!grouped[r.date]) {
                grouped[r.date] = { date: r.date, dailyUsers: 0, valueSum: 0 };
            }
            const g = grouped[r.date];
            g.dailyUsers += r.dailyUsers || 0;
            g.valueSum += (r[field] || 0) * (r.dailyUsers || 0);
        });
        return Object.values(grouped).map(g => ({
            date: g.date,
            value: g.dailyUsers > 0 ? g.valueSum / g.dailyUsers : 0
        }));
    }

    /**
     * 创建多线图表配置（留存分析专用）
     */
    function createMultiLineChartConfig(data) {
        // 定义两条线的颜色
        const colors = ['rgb(73, 127, 252)', 'rgb(38, 194, 176)'];
        return {
            type: 'line',
            data: [{ values: data, id: 'data' }],
            xField: 'date',
            yField: 'value',
            seriesField: 'seriesName',
            color: colors,
            line: {
                style: {
                    lineWidth: 2
                }
            },
            point: {
                style: {
                    size: 0
                },
                state: {
                    dimension_hover: {
                        size: 8,
                        fill: '#ffffff',
                        lineWidth: 2
                    }
                }
            },
            axes: [
                {
                    orient: 'left',
                    grid: { visible: true, style: { lineDash: [], stroke: '#E5E6EB' } },
                    label: {
                        visible: true,
                        style: { fill: '#8F959E' },
                        formatMethod: (val) => val + '%'
                    }
                },
                {
                    orient: 'bottom',
                    label: { visible: true, style: { fill: '#8F959E' } }
                }
            ],
            tooltip: {
                mark: { content: { valueFormatter: '{displayValue}' } },
                dimension: { content: { valueFormatter: '{displayValue}' } }
            },
            legends: {
                visible: false
            },
            crosshair: {
                xField: {
                    visible: true,
                    line: { type: 'line', style: { lineWidth: 1, opacity: 0.6, stroke: 'rgb(138, 141, 143)', lineDash: [4, 4] } },
                    bindingAxesIndex: [1]
                }
            }
        };
    }

    /**
     * 创建多线图例（放在图表下方，替代旧的单线图例）
     */
    function createMultiLineLegend(chartContainer, seriesNames) {
        // 删除旧的图例
        let legendElement = chartContainer.parentElement.querySelector('.chart-title');
        if (legendElement) {
            legendElement.remove();
        }

        // 创建新图例
        legendElement = document.createElement('div');
        legendElement.className = 'chart-title';
        legendElement.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin-top: 8px;
            gap: 24px;
        `;

        const colors = ['rgb(73, 127, 252)', 'rgb(38, 194, 176)'];

        seriesNames.forEach((name, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center;';

            const square = document.createElement('span');
            square.style.cssText = `
                display: inline-block;
                width: 12px;
                height: 12px;
                background-color: ${colors[index] || '#999'};
                margin-right: 8px;
                border-radius: 2px;
            `;

            const text = document.createElement('span');
            text.textContent = name;
            text.style.color = 'var(--text-2, #747a85)';

            item.appendChild(square);
            item.appendChild(text);
            legendElement.appendChild(item);
        });

        chartContainer.parentElement.appendChild(legendElement);
    }

    /**
     * 渲染多线留存图表
     */
    function renderRetentionMultiLineChart(containerId, data, chartTitle, seriesNames) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ 未找到图表容器 ${containerId}`);
            return null;
        }
        container.innerHTML = '';

        try {
            const ChartClass = VChart.VChart || VChart;
            const config = createMultiLineChartConfig(data);

            const vchart = new ChartClass(config, {
                dom: container,
                width: container.offsetWidth || 765,
                height: container.offsetHeight || 305
            });

            vchart.renderAsync().then(() => {
                console.log(`✅ [${chartTitle}] 多线图渲染完成`);
                createMultiLineLegend(container, seriesNames);
            }).catch(err => {
                console.error(`❌ [${chartTitle}] 渲染失败:`, err);
            });

            return vchart;
        } catch (error) {
            console.error(`❌ [${chartTitle}] 创建失败:`, error);
            return null;
        }
    }

    /**
     * 初始化留存分析图表
     */
    function initRetentionChart() {
        console.log('初始化留存分析图表...');

        loadRetentionChartData().then(retentionConfig => {
            const appId = window._retentionAppId || 'all';
            const os = window._retentionOs || 'all';
            const factor = window._retentionFactor || 'sidebar_popup';
            const field = window._retentionChartField || 'day1';

            // factor label 映射
            const factorLabelMap = {
                'sidebar_popup_yes': '有跳转',
                'sidebar_popup_no': '无跳转',
                'app_active_yes': '有活跃',
                'app_active_no': '未活跃',
                'none': '全部'
            };

            // 根据 factor 筛选数据
            let records = retentionConfig.retentionData.filter(r => {
                if (appId !== 'all' && r.appId !== appId) return false;
                if (os !== 'all' && r.os !== os) return false;
                if (factor === 'none') {
                    return r.factor === 'none';
                } else {
                    return r.factor.startsWith(factor);
                }
            });

            if (records.length === 0) {
                console.log('⚠️ 留存图表没有匹配的数据');
                const container = document.getElementById('visactor_window_7');
                if (container) {
                    container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">暂无数据</div>';
                }
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const timeRange = window._retentionTimeRange || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeRange);
            startDate.setHours(0, 0, 0, 0);

            // 过滤日期范围
            let filteredRecords = records.filter(r => {
                const itemDate = new Date(r.date);
                return itemDate >= startDate && itemDate < today;
            });

            if (filteredRecords.length === 0) {
                console.log(`⚠️ 留存图表没有最近${timeRange}天的数据`);
                const container = document.getElementById('visactor_window_7');
                if (container) {
                    container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">暂无数据</div>';
                }
                return;
            }

            const fieldLabelMap = { 'day1': '1天后', 'day3': '3天后', 'day14': '14天后', 'day30': '30天后' };
            const fieldLabel = fieldLabelMap[field] || '1天后';

            // 获取唯一的 factor 列表（用于图例）
            const uniqueFactors = [...new Set(filteredRecords.map(r => r.factor))];
            const seriesNames = uniqueFactors.map(f => (factorLabelMap[f] || f) + '-' + fieldLabel + '留存率');

            // 构建多线数据，seriesName 格式: "有跳转-3天后留存率"
            const data = filteredRecords.map(r => ({
                date: r.date,
                value: r[field] || 0,
                displayValue: r[field] != null ? (r[field] === 0 ? '0%' : r[field].toFixed(2) + '%') : '0%',
                seriesName: (factorLabelMap[r.factor] || r.factor) + '-' + fieldLabel + '留存率'
            }));

            // 按日期排序
            data.sort((a, b) => new Date(a.date) - new Date(b.date));

            const chartTitle = fieldLabel + '留存率';

            console.log('✅ [留存分析图表] 多线数据:', chartTitle, `(共${data.length}条数据, 系列: ${seriesNames.join(', ')})`);

            const vchart = renderRetentionMultiLineChart('visactor_window_7', data, chartTitle, seriesNames);
            if (vchart) {
                window.retentionChartInstance = vchart;
            }
        });
    }

    // 暴露到全局
    window.initRetentionChart = initRetentionChart;

    /**
     * 初始化留存分析单选按钮切换
     */
    function initRetentionRadioButtons() {
        console.log('初始化留存分析单选按钮...');

        // 通过文本内容精确查找留存分析的按钮
        const allSpans = document.querySelectorAll('.semi-dy-open-radio-addon-buttonRadio');
        const retentionButtons = [];

        allSpans.forEach(span => {
            const text = span.textContent.trim();
            // 匹配留存率按钮（不管有没有“全部-”前缀）
            if (text.includes('天后留存率')) {
                retentionButtons.push(span);
            }
        });

        if (retentionButtons.length === 0) {
            console.warn('未找到留存分析单选按钮');
            return;
        }

        console.log(`✅ 找到 ${retentionButtons.length} 个留存分析按钮`);

        // 定义每个按钮对应的数据字段和标题（新结构使用 day1, day3 等）
        const buttonConfig = [
            { text: '全部-1天后留存率', field: 'day1' },
            { text: '全部-3天后留存率', field: 'day3' },
            { text: '全部-14天后留存率', field: 'day14' },
            { text: '全部-30天后留存率', field: 'day30' }
        ];

        // 为每个按钮添加点击事件
        retentionButtons.forEach((btn) => {
            const htmlText = btn.textContent.trim();  // HTML 中的文本，如 "1天后留存率"

            // 根据 HTML 文本找到对应的配置
            let config = null;
            if (htmlText === '1天后留存率') {
                config = buttonConfig[0];
            } else if (htmlText === '3天后留存率') {
                config = buttonConfig[1];
            } else if (htmlText === '14天后留存率') {
                config = buttonConfig[2];
            } else if (htmlText === '30天后留存率') {
                config = buttonConfig[3];
            }

            if (!config) {
                console.warn(`未找到配置: ${htmlText}`);
                return;
            }

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                console.log(`🔘 点击了: ${config.text}`);

                // 移除所有按钮的选中状态
                retentionButtons.forEach(b => {
                    b.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
                    // 同时移除父级 label 的 checked 状态
                    const parentLabel = b.closest('.semi-dy-open-radio');
                    if (parentLabel) {
                        parentLabel.classList.remove('semi-dy-open-radio-checked');
                        const inner = parentLabel.querySelector('.semi-dy-open-radio-inner');
                        if (inner) {
                            inner.classList.remove('semi-dy-open-radio-inner-checked');
                        }
                    }
                });

                // 添加当前按钮的选中状态
                this.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
                const parentLabel = this.closest('.semi-dy-open-radio');
                if (parentLabel) {
                    parentLabel.classList.add('semi-dy-open-radio-checked');
                    const inner = parentLabel.querySelector('.semi-dy-open-radio-inner');
                    if (inner) {
                        inner.classList.add('semi-dy-open-radio-inner-checked');
                    }
                }

                // 更新图表数据
                updateRetentionChart(config.field, config.text);
            });

            // Hover 效果
            btn.addEventListener('mouseenter', function () {
                if (!this.classList.contains('semi-dy-open-radio-addon-buttonRadio-checked')) {
                    this.classList.add('semi-dy-open-radio-addon-buttonRadio-hover');
                }
            });

            btn.addEventListener('mouseleave', function () {
                this.classList.remove('semi-dy-open-radio-addon-buttonRadio-hover');
            });
        });

        console.log('✅ 留存分析单选按钮初始化完成');
    }

    /**
     * 更新留存分析图表数据
     */
    function updateRetentionChart(field, title) {
        console.log(`更新留存图表: ${title}, field: ${field}`);

        // 保存当前选中的 field，供筛选器切换时使用
        window._retentionChartField = field;

        // 直接调用 initRetentionChart 重新渲染
        initRetentionChart();
    }

    // 暴露到全局
    window.initRetentionRadioButtons = initRetentionRadioButtons;

    /**
     * 初始化来源分析多折线图
     */
    function initSourceAnalysisChart() {
        console.log('初始化来源分析图表...');

        // 绑定"折线图/饼图"切换（幂等）
        bindSourceChartViewToggle();

        // 检查当前选中的时间范围按钮
        const yesterdayBtn = document.querySelector('.time-range-yesterday.semi-dy-open-radio-addon-buttonRadio-checked');

        // 根据选中的按钮加载对应的数据
        if (yesterdayBtn) {
            console.log('[来源分析] 检测到"昨天"按钮选中，加载昨天的小时数据');
            updateSourceAnalysisChart('yesterday');
        } else {
            console.log('[来源分析] 加载近7天数据');
            updateSourceAnalysisChart(7);
        }
    }

    // 绑定来源分析图表视图单选（折线图 / 饼图）
    function bindSourceChartViewToggle() {
        const group = document.querySelector('.source-chart-view-radio');
        if (!group || group.dataset.viewBound === '1') return;
        group.dataset.viewBound = '1';

        const labels = group.querySelectorAll('label[data-view]');
        labels.forEach(label => {
            label.addEventListener('click', function (e) {
                e.preventDefault();
                const view = this.getAttribute('data-view');
                if (!view || view === window._sourceChartView) return;
                setSourceChartViewCheckedStyle(group, view);
                window._sourceChartView = view;
                const range = (typeof window.getCurrentSourceTimeRange === 'function')
                    ? window.getCurrentSourceTimeRange()
                    : 'yesterday';
                updateSourceAnalysisChart(range);
            });
        });
    }

    // 同步单选按钮的 checked 样式类（Semi button-radio 要改 3 个 modifier）
    function setSourceChartViewCheckedStyle(group, view) {
        group.querySelectorAll('label[data-view]').forEach(label => {
            const isTarget = label.getAttribute('data-view') === view;
            label.classList.toggle('semi-dy-open-radio-checked', isTarget);
            const inner = label.querySelector('.semi-dy-open-radio-inner');
            if (inner) inner.classList.toggle('semi-dy-open-radio-inner-checked', isTarget);
            const addon = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
            if (addon) addon.classList.toggle('semi-dy-open-radio-addon-buttonRadio-checked', isTarget);
            // radio dot svg 只在 checked label 里存在（Semi 原结构），为保险也同步一下
            const innerInner = label.querySelector('.semi-dy-open-radio-inner > span:first-child');
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
        });
    }

    /**
     * 更新来源分析图表（通用函数）
     * @param {string|number} timeRange - 时间范围：'yesterday' 或 天数（7, 30等）
     */
    // 指标字段 → 显示名称
    const SOURCE_METRIC_NAME = {
        dailyUsers: '活跃用户数',
        newUsers: '新增用户数',
        startup: '启动次数',
        singleAvgDuration: '次均游戏时长'
    };

    async function updateSourceAnalysisChart(timeRange, metric) {
        // 不传 metric 时沿用当前选中（默认 dailyUsers），让切 APP / 切时间时保持指标
        metric = metric || window._sourceAnalysisMetric || 'dailyUsers';
        window._sourceAnalysisMetric = metric;
        const metricName = SOURCE_METRIC_NAME[metric] || '活跃用户数';
        console.log('[来源分析] 更新时间范围:', timeRange, '指标:', metric);

        let multiSeriesData = [];
        let chartTitle = '';

        // 如果是昨天，加载小时数据
        if (timeRange === 'yesterday') {
            // 1. 加载权重配置
            const response = await fetch('./conf/hourly-weights.json');
            const config = await response.json();
            const weights = config.hourlyWeights;

            // 2. 获取昨天的日期
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const year = yesterday.getFullYear();
            const month = String(yesterday.getMonth() + 1).padStart(2, '0');
            const day = String(yesterday.getDate()).padStart(2, '0');
            const yesterdayStr = `${year}-${month}-${day}`;

            console.log('昨天日期:', yesterdayStr);

            // 3. 从当前 APP 的数据源中获取昨天的日数据
            const appData = window.getCurrentAppData();
            const yesterdayData = appData.find(item => item.date === yesterdayStr);

            if (!yesterdayData) {
                console.warn('[来源分析] 当前 APP 未找到昨天的数据:', yesterdayStr);
                renderMultiLineChart('visactor_window_9', [], '来源分析-暂无数据', timeRange);
                return;
            }

            console.log('昨天的日数据:', yesterdayData);

            // 4. 将每个来源场景的日数据按权重分配到24小时
            for (let hour = 0; hour < 24; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const weight = weights[hourStr] || 0;
                const timeLabel = `${yesterdayStr} ${hourStr}:00`;

                yesterdayData.douyinSourceScenes.forEach(scene => {
                    const raw = scene[metric] || 0;
                    // 次均游戏时长按小时分布不适合乘权重（它是"次均"不是累计），保持原值；其它指标按权重拆
                    const val = metric === 'singleAvgDuration' ? raw : Math.round(raw * weight);
                    multiSeriesData.push({
                        date: timeLabel,
                        value: val,
                        sceneId: scene.sceneId,
                        sceneName: scene.sceneName
                    });
                });
            }

            chartTitle = `昨日来源分析-小时${metricName}`;
            console.log('生成的小时数据:', multiSeriesData.length, '条记录');
        } else {
            // 加载指定天数的日数据
            const days = timeRange;

            const data = window.getCurrentAppData();

            // 获取指定天数的数据
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - days);
            daysAgo.setHours(0, 0, 0, 0);

            const filteredData = data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= daysAgo && itemDate < today;
            });

            // 按日期正序排列
            filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 构建多系列数据
            filteredData.forEach(item => {
                item.douyinSourceScenes.forEach(scene => {
                    multiSeriesData.push({
                        date: item.date,
                        value: scene[metric] || 0,
                        sceneId: scene.sceneId,
                        sceneName: scene.sceneName
                    });
                });
            });

            chartTitle = days === 7
                ? `来源分析-日${metricName}`
                : `来源分析-日${metricName}（近${days}天）`;
            console.log('生成的日数据:', multiSeriesData.length, '条记录');
        }

        // 次均游戏时长按秒存储，折线图 Y 轴/tooltip 展示为 HH:MM:SS；饼图直接显示数字
        const lineOptions = metric === 'singleAvgDuration'
            ? { valueFormatter: formatDuration }
            : {};

        // 根据当前视图（折线/饼图）选择 render 函数
        const view = window._sourceChartView || 'line';
        if (view === 'pie') {
            renderScenePieChart('visactor_window_9', multiSeriesData, chartTitle, timeRange, {});
        } else {
            renderMultiLineChart('visactor_window_9', multiSeriesData, chartTitle, timeRange, lineOptions);
        }
        console.log('✅ 来源分析图表已更新，视图:', view);
    }

    /**
     * 场景数据饼图渲染
     *  · 复用与 renderMultiLineChart 一致的"用户选中/白名单"过滤 + "汇总值降序" 颜色映射
     *  · 同一容器（visactor_window_9）复用 chartInstanceKey，切换时自动 release 旧实例
     */
    function renderScenePieChart(containerId, data, title, timeRange, options) {
        options = options || {};
        const seriesField = options.seriesField || 'sceneId';
        const nameField = options.nameField || 'sceneName';
        const useWhitelist = options.useWhitelist !== false;
        const chartInstanceKey = options.chartInstanceKey || 'sourceAnalysisChartInstance';
        const logPrefix = options.logPrefix || '来源分析图表';
        const valueFormatter = typeof options.valueFormatter === 'function' ? options.valueFormatter : null;
        const tooltipValueFormat = (v) => {
            if (valueFormatter) return valueFormatter(v);
            return (Number(v) || 0).toLocaleString('zh-CN');
        };

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`未找到图表容器: ${containerId}`);
            return;
        }

        // 销毁旧实例（折线图/饼图共用一个 key）
        if (window[chartInstanceKey]) {
            window[chartInstanceKey].release();
            window[chartInstanceKey] = null;
        }

        const colors = [
            'rgb(73 127 252)',  // 蓝色
            'rgb(38 194 176)',  // 绿色
            'rgb(253 166 51)',  // 橙色
            'rgb(251 218 49)',  // 黄色
            'rgb(89 194 98)',   // 绿色
            'rgb(167 218 44)',  // 绿色
            'rgb(180 74 194)'   // 紫色
        ];
        const TOP_N = colors.length;

        // ---- 过滤：与折线图完全同口径（可通过 options.skipSeriesFilter 跳过，给其它页面复用时使用） ----
        if (!options.skipSeriesFilter) {
            const userSelected = window._sourceSceneSelected;
            const hasUserSelectionState = userSelected instanceof Set;
            if (hasUserSelectionState) {
                data = data.filter(d => userSelected.has(d[seriesField]));
            } else if (useWhitelist) {
                const whitelist = typeof window.getSourceSceneWhitelist === 'function'
                    ? window.getSourceSceneWhitelist(timeRange)
                    : null;
                if (whitelist) data = data.filter(d => whitelist.has(d[seriesField]));
            }
        }

        // ---- 按 seriesField 聚合 value + 记 name ----
        const nameMap = {};
        const valueBySeries = new Map();
        data.forEach(d => {
            valueBySeries.set(d[seriesField], (valueBySeries.get(d[seriesField]) || 0) + (d.value || 0));
            nameMap[d[seriesField]] = d[nameField];
        });
        const seriesOrder = Array.from(valueBySeries.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_N)
            .map(([k]) => k);

        const pieData = seriesOrder.map(id => ({
            sceneId: id,
            sceneName: nameMap[id] || id,
            value: valueBySeries.get(id) || 0
        }));
        const totalValue = pieData.reduce((s, d) => s + (d.value || 0), 0);
        const totalText = tooltipValueFormat(totalValue);

        // ---- VChart pie spec ----
        const spec = {
            type: 'pie',
            data: [{ id: 'data', values: pieData }],
            categoryField: 'sceneId',
            valueField: 'value',
            outerRadius: 0.78,
            innerRadius: 0.5,
            padAngle: 0.6,
            color: { type: 'ordinal', domain: seriesOrder, range: colors },
            label: {
                visible: true,
                position: 'outside',
                line: { visible: true, smooth: false },
                formatMethod: (text, datum) => {
                    const v = datum && datum.value ? datum.value : 0;
                    const pct = totalValue > 0 ? (v / totalValue * 100).toFixed(2) : '0.00';
                    const name = nameMap[datum.sceneId] || datum.sceneId || '';
                    return {
                        type: 'rich',
                        text: [
                            { text: `${tooltipValueFormat(v)} (${pct}%)`, fontSize: 16, fontWeight: 'bold', fill: '#1f2329' },
                            { text: '\n' },
                            { text: name, fontSize: 15, fill: '#86909c' }
                        ]
                    };
                },
                style: {
                    lineHeight: 22,
                    textBaseline: 'middle'
                }
            },
            indicator: [{
                visible: true,
                trigger: 'none',
                title: {
                    visible: true,
                    autoFit: true,
                    style: {
                        text: totalText,
                        fontSize: 22,
                        fontWeight: 'normal',
                        fill: '#1f2329'
                    }
                }
            }],
            tooltip: {
                mark: {
                    title: {
                        value: (datum) => nameMap[datum.sceneId] || datum.sceneId || ''
                    },
                    content: [{
                        key: '占比',
                        value: (datum) => {
                            const v = datum && datum.value ? datum.value : 0;
                            const pct = totalValue > 0 ? (v / totalValue * 100).toFixed(2) : '0.00';
                            return `${pct}%（${tooltipValueFormat(v)}）`;
                        }
                    }]
                }
            },
            legends: {
                visible: true,
                orient: 'bottom',
                position: 'middle',
                item: {
                    shape: { style: { symbolType: 'circle' } },
                    label: {
                        formatMethod: (text) => nameMap[text] || text
                    }
                }
            },
            animation: false
        };

        const ChartClass = VChart.VChart || VChart;
        const chart = new ChartClass(spec, {
            dom: container,
            width: container.offsetWidth || 1128,
            height: container.offsetHeight || 340
        });
        chart.renderSync();
        window[chartInstanceKey] = chart;
        console.log(`✅ ${logPrefix} 饼图渲染完成，场景数:`, seriesOrder.length);
    }

    /**
     * 渲染多折线/面积图（通用）
     * @param {string} containerId - 容器ID
     * @param {Array} data - 图表数据，每条至少含 { date, value, [seriesField], [nameField] }
     * @param {string} title - 图表标题
     * @param {string|number} timeRange - 时间范围：'yesterday' 或 天数（7, 30等）
     * @param {Object} [options]
     * @param {string} [options.seriesField='sceneId']      series 区分字段名
     * @param {string} [options.nameField='sceneName']      图例/tooltip 显示字段名
     * @param {Array}  [options.fixedOrder]                 显式指定 series 顺序；有值则跳过 Top-N
     * @param {boolean}[options.useWhitelist=true]          是否启用来源分析白名单过滤
     * @param {Array}  [options.colors]                     自定义颜色数组
     * @param {string} [options.chartInstanceKey='sourceAnalysisChartInstance']
     * @param {string} [options.logPrefix='来源分析图表']
     * @param {Function}[options.valueFormatter]           自定义 y 轴/tooltip value 格式化（如 v => v.toFixed(2)+'%'）
     */
    function renderMultiLineChart(containerId, data, title, timeRange, options) {
        options = options || {};
        const seriesField = options.seriesField || 'sceneId';
        const nameField = options.nameField || 'sceneName';
        const fixedOrder = Array.isArray(options.fixedOrder) ? options.fixedOrder.slice() : null;
        const useWhitelist = options.useWhitelist !== false;
        const chartInstanceKey = options.chartInstanceKey || 'sourceAnalysisChartInstance';
        const logPrefix = options.logPrefix || '来源分析图表';
        const valueFormatter = typeof options.valueFormatter === 'function' ? options.valueFormatter : null;

        // y 轴 label 格式化：有自定义 valueFormatter 则用它，否则按 k 收缩
        const yAxisFormat = (val) => {
            if (valueFormatter) return valueFormatter(val);
            return val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
        };
        // tooltip value 格式化：有自定义 valueFormatter 则用它，否则千分位
        const tooltipValueFormat = (v) => {
            if (valueFormatter) return valueFormatter(v);
            return (Number(v) || 0).toLocaleString('zh-CN');
        };

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`未找到图表容器: ${containerId}`);
            return;
        }

        // 销毁旧实例
        if (window[chartInstanceKey]) {
            window[chartInstanceKey].release();
        }

        // 颜色配置（默认 7 种）
        const colors = Array.isArray(options.colors) && options.colors.length
            ? options.colors.slice()
            : [
                'rgb(73 127 252)', // 蓝色
                'rgb(38 194 176)', // 绿色
                'rgb(253 166 51)', // 橙色
                'rgb(251 218 49)', // 黄色
                'rgb(89 194 98)', // 绿色
                'rgb(167 218 44)', // 绿色
                'rgb(180 74 194)', // 紫色
            ];

        // 计算 seriesOrder（= 颜色顺序，索引 0 对应第一个颜色）
        let seriesOrder;
        if (fixedOrder) {
            // 固定顺序场景（如 UGC/PGC）：直接按 fixedOrder，数据只保留其中包含的 series
            seriesOrder = fixedOrder;
            data = data.filter(d => seriesOrder.includes(d[seriesField]));
        } else {
            // 动态 Top-N 场景（来源分析）：
            //   · 来源多选下拉一旦初始化（Set 已存在），以它为准：包括空 Set = 明确取消全部 = 图表为空
            //   · 未初始化时（Set 为 undefined），回退到白名单 + 默认 Top N
            //   · 颜色顺序始终按「当前指标汇总值降序」计算，保证 top1 对应第一个颜色
            const TOP_N = colors.length;
            const userSelected = window._sourceSceneSelected;
            const hasUserSelectionState = userSelected instanceof Set;

            if (hasUserSelectionState) {
                data = data.filter(d => userSelected.has(d[seriesField]));
            } else if (useWhitelist) {
                const whitelist = typeof window.getSourceSceneWhitelist === 'function'
                    ? window.getSourceSceneWhitelist(timeRange)
                    : null;
                if (whitelist) {
                    data = data.filter(d => whitelist.has(d[seriesField]));
                }
            }
            const valueBySeries = new Map();
            data.forEach(d => {
                valueBySeries.set(d[seriesField], (valueBySeries.get(d[seriesField]) || 0) + (d.value || 0));
            });
            seriesOrder = Array.from(valueBySeries.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, TOP_N)
                .map(([k]) => k);
            data = data.filter(d => seriesOrder.includes(d[seriesField]));
        }

        // seriesKey -> 展示名
        const seriesNameMap = {};
        data.forEach(d => { seriesNameMap[d[seriesField]] = d[nameField]; });

        // 判断是否为长周期场景（30天及以上）
        const isLongRange = timeRange === 30;

        // 创建图表配置
        const spec = {
            type: 'area',
            data: [{ values: data, id: 'data' }],
            xField: 'date',
            yField: 'value',
            seriesField: seriesField,
            stack: false,  // 不堆叠，让线条正常显示，只有最上面的区域可见
            // 线条样式
            line: {
                style: {
                    lineWidth: 2,
                    // 线条颜色按 seriesOrder（value 降序/指定顺序）映射，和图例/面积/tooltip 保持一致
                    stroke: (datum) => {
                        const idx = seriesOrder.indexOf(datum[seriesField]);
                        return colors[idx >= 0 ? idx : 0];
                    }
                }
            },
            // 数据点配置
            point: {
                style: {
                    size: 0
                },
                state: {
                    dimension_hover: {
                        size: 8,
                        fill: '#ffffff',
                        stroke: (datum) => {
                            const index = seriesOrder.indexOf(datum[seriesField]);
                            return colors[index >= 0 ? index : 0];
                        },
                        lineWidth: 2
                    }
                }
            },
            // 区域渐变填充
            area: {
                visible: true,
                style: {
                    curveType: 'monotone',
                    fill: (datum) => {
                        const index = seriesOrder.indexOf(datum[seriesField]);
                        const baseColor = colors[index >= 0 ? index : 0];
                        // 提取 RGB 值并创建 rgba 格式的渐变色
                        const rgbMatch = baseColor.match(/\d+/g);
                        if (rgbMatch) {
                            return {
                                gradient: 'linear',
                                x0: 0,
                                y0: 0,
                                x1: 0,
                                y1: 1,
                                stops: [
                                    { offset: 0, color: `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.3)` },
                                    { offset: 1, color: `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0)` }
                                ]
                            };
                        }
                        return {
                            gradient: 'linear',
                            x0: 0,
                            y0: 0,
                            x1: 0,
                            y1: 1,
                            stops: [
                                { offset: 0, color: baseColor },
                                { offset: 1, color: baseColor }
                            ]
                        };
                    }
                }
            },
            // 图例配置 - 放在底部
            legends: {
                visible: true,
                orient: 'bottom',
                padding: [20, 0, 0, 0],
                // 用 data 回调逐项覆盖图例图标的 fill/透明度，
                // 避免面积图的渐变半透明 fill 被图例图标继承
                data: (items) => {
                    // 只排序 + 覆盖图标颜色/透明度，**不要修改 item.label**。
                    // item.label 是 VChart 图例与 series 的联动 key（= seriesField 的原始值），
                    // 改动它会导致点击图例的"显隐切换"失灵。
                    // 展示用的中文名通过下面的 item.label.formatMethod 做翻译。
                    const ordered = [...items].sort((a, b) => {
                        const ia = seriesOrder.indexOf(a.label);
                        const ib = seriesOrder.indexOf(b.label);
                        const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
                        const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
                        return ra - rb;
                    });

                    return ordered.map((item) => {
                        const idx = seriesOrder.indexOf(item.label);
                        const solidColor = colors[idx >= 0 ? idx : 0];
                        item.shape.fill = solidColor;
                        item.shape.fillOpacity = 1;
                        item.shape.stroke = solidColor;
                        item.shape.strokeOpacity = 1;
                        item.shape.symbolType = 'square';
                        return item;
                    });
                },
                item: {
                    shape: {
                        style: {
                            symbolType: 'square'  // 正方形
                        }
                    },
                    label: {
                        // 仅改"显示文本"，不改底层 label（seriesField 原值），保证点击显隐联动正常
                        formatMethod: (text) => seriesNameMap[text] || text,
                        style: {
                            fill: 'rgb(90 94 100)',
                            fillOpacity: 1
                        }
                    }
                }
            },
            // 十字准星配置（hover 虚线）
            crosshair: {
                xField: {
                    visible: true,
                    line: {
                        type: 'line',
                        style: {
                            lineWidth: 1,
                            opacity: 0.6,
                            stroke: 'rgb(138, 141, 143)',
                            lineDash: [4, 4]
                        }
                    },
                    bindingAxesIndex: [1]
                },
                yField: {
                    visible: false
                }
            },
            // 坐标轴配置
            axes: [
                {
                    orient: 'left',
                    label: {
                        formatMethod: (val) => yAxisFormat(val)
                    }
                },
                {
                    orient: 'bottom',
                    // 仅在 30 天场景关闭默认采样 + 自定义每 3 天过滤；
                    // 其它场景保持 VChart 默认行为
                    ...(isLongRange
                        ? {
                            sampling: false,
                            label: {
                                autoHide: false,
                                dataFilter: (items) => items.filter((_, i) => i % 3 === 0),
                                formatMethod: (val) => {
                                    const date = new Date(val);
                                    if (isNaN(date.getTime())) return val;
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    return `${year}-${month}-${day}`;
                                }
                            },
                            tick: {
                                dataFilter: (items) => items.filter((_, i) => i % 3 === 0)
                            }
                        }
                        : {
                            label: {
                                formatMethod: (val) => {
                                    if (val && typeof val === 'string' && val.includes(' ')) {
                                        const parts = val.split(' ');
                                        return parts[1] + ':00';
                                    }
                                    const date = new Date(val);
                                    if (isNaN(date.getTime())) return val;
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    return `${year}-${month}-${day}`;
                                }
                            }
                        })
                }
            ],
            // Tooltip 配置
            tooltip: {
                // mark tooltip：鼠标精确落在图元上时
                mark: {
                    title: {
                        value: (datum) => {
                            // 如果包含时间格式（YYYY-MM-DD HH:00），只提取时间部分
                            if (datum && datum.date && datum.date.includes(' ')) {
                                const parts = datum.date.split(' ');
                                const timePart = parts[1];  // "HH:00"
                                // 补充秒数，变成 "HH:00:00" 格式
                                return timePart + ':00';
                            }
                            // 否则返回原始日期
                            return datum.date;
                        }
                    },
                    content: [
                        {
                            key: (datum) => datum[nameField],
                            value: (datum) => tooltipValueFormat(datum.value),
                            shapeType: 'square',
                            shapeFill: (datum) => {
                                const idx = seriesOrder.indexOf(datum[seriesField]);
                                return colors[idx >= 0 ? idx : 0];
                            },
                            shapeStroke: (datum) => {
                                const idx = seriesOrder.indexOf(datum[seriesField]);
                                return colors[idx >= 0 ? idx : 0];
                            },
                            shapeFillOpacity: 1,
                            shapeStrokeOpacity: 1,
                            keyStyle: { fill: 'rgb(90 94 100)', fillOpacity: 1 },
                            valueStyle: { fill: 'rgb(90 94 100)', fillOpacity: 1 }
                        }
                    ]
                },
                // dimension tooltip：crosshair 触发，显示该 x 下所有系列（关键！）
                dimension: {
                    title: {
                        value: (datum) => {
                            // 如果包含时间格式（YYYY-MM-DD HH:00），只提取时间部分
                            if (datum && datum.date && datum.date.includes(' ')) {
                                const parts = datum.date.split(' ');
                                const timePart = parts[1];  // "HH:00"
                                // 补充秒数，变成 "HH:00:00" 格式
                                return timePart + ':00';
                            }
                            // 否则返回原始日期
                            return datum.date;
                        }
                    },
                    content: [
                        {
                            key: (datum) => datum[nameField],
                            value: (datum) => tooltipValueFormat(datum.value),
                            shapeType: 'square',
                            shapeFill: (datum) => {
                                const idx = seriesOrder.indexOf(datum[seriesField]);
                                return colors[idx >= 0 ? idx : 0];
                            },
                            shapeStroke: (datum) => {
                                const idx = seriesOrder.indexOf(datum[seriesField]);
                                return colors[idx >= 0 ? idx : 0];
                            },
                            shapeFillOpacity: 1,
                            shapeStrokeOpacity: 1,
                            keyStyle: { fill: 'rgb(90 94 100)', fillOpacity: 1 },
                            valueStyle: { fill: 'rgb(90 94 100)', fillOpacity: 1 }
                        }
                    ]
                }
            },
            // 让 VChart 按 seriesOrder 顺序把 colors 分配给对应 series，
            // 避免默认按数据出现顺序分配导致颜色与图例/面积错位
            color: {
                type: 'ordinal',
                domain: seriesOrder,
                range: colors
            }
        };

        // 创建图表
        try {
            const ChartClass = VChart.VChart || VChart;
            const vchart = new ChartClass(spec, {
                dom: container,
                width: container.offsetWidth || 1128,
                height: container.offsetHeight || 340,
                theme: 'light'
            });
            vchart.renderAsync().then(() => {
                console.log(`✅ ${logPrefix}渲染完成`);
            }).catch(err => {
                console.error(`[${logPrefix}] 渲染失败:`, err);
            });
            window[chartInstanceKey] = vchart;
        } catch (error) {
            console.error(`[${logPrefix}] 创建失败:`, error);
        }
    }

    // ==================== 抖音视频数据图表 ====================
    // 复用 renderMultiLineChart，seriesField=type，fixedOrder=['UGC','PGC']，关白名单

    const VIDEO_METRIC_NAME = {
        newUsers: '新增用户',
        activeUsers: '活跃用户',
        conversionRate: '视频转化率'
    };

    /** 视频图固定的渲染 options（颜色=前两色：蓝/绿） */
    function getVideoChartOptions() {
        return {
            seriesField: 'type',
            nameField: 'displayName',
            fixedOrder: ['UGC', 'PGC'],
            useWhitelist: false,
            colors: ['rgb(73 127 252)', 'rgb(38 194 176)'],
            chartInstanceKey: 'douyinVideoChartInstance',
            logPrefix: '抖音视频数据图表'
        };
    }

    /** 初始化抖音视频数据图表（默认指标：新增用户） */
    function initDouyinVideoChart() {
        console.log('初始化抖音视频数据图表...');
        const yesterdayBtn = document.querySelector(
            '.user-source-section .time-range-yesterday.semi-dy-open-radio-addon-buttonRadio-checked'
        );
        if (yesterdayBtn) {
            updateDouyinVideoChart('yesterday');
        } else {
            updateDouyinVideoChart(7);
        }
    }

    /**
     * 更新抖音视频数据图表
     * @param {string|number} timeRange - 'yesterday' 或天数（7、30）
     * @param {string} [metric='newUsers'] - 'newUsers' | 'activeUsers' | 'conversionRate'
     */
    async function updateDouyinVideoChart(timeRange, metric) {
        // 未传 metric 时，沿用上一次的选择（保证"切时间"不会把指标重置回新增用户）
        metric = metric || window._douyinVideoMetric || 'newUsers';
        window._douyinVideoMetric = metric;
        const metricName = VIDEO_METRIC_NAME[metric] || '新增用户';
        const chartTitle = `抖音视频数据-${metricName}`;
        const displayNameFor = (type) => `${type}${metricName}`;
        const chartData = [];

        const allData = window.getCurrentAppData();

        if (timeRange === 'yesterday') {
            // 昨天维度：按小时权重把当日值切分到 24 小时（与来源分析口径一致）
            const response = await fetch('./conf/hourly-weights.json');
            const config = await response.json();
            const weights = config.hourlyWeights;

            const yest = new Date();
            yest.setDate(yest.getDate() - 1);
            const yStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
            const yData = allData.find(it => it.date === yStr);

            if (yData && Array.isArray(yData.douyinVideoData)) {
                for (let h = 0; h < 24; h++) {
                    const hs = String(h).padStart(2, '0');
                    const w = weights[hs] || 0;
                    const label = `${yStr} ${hs}:00`;
                    yData.douyinVideoData.forEach(v => {
                        const raw = Number(v[metric]) || 0;
                        chartData.push({
                            date: label,
                            value: metric === 'conversionRate'
                                ? Number((raw * w).toFixed(2))
                                : Math.round(raw * w),
                            type: v.type,
                            displayName: displayNameFor(v.type)
                        });
                    });
                }
            } else {
                console.warn('[抖音视频] 昨天无视频数据:', yStr);
            }
        } else {
            // 日维度：取近 N 天的 douyinVideoData
            const days = Number(timeRange) || 7;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0);

            const filtered = allData
                .filter(item => {
                    const d = new Date(item.date);
                    return d >= from && d < today;
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            filtered.forEach(item => {
                if (!Array.isArray(item.douyinVideoData)) return;
                item.douyinVideoData.forEach(v => {
                    chartData.push({
                        date: item.date,
                        value: Number(v[metric]) || 0,
                        type: v.type,
                        displayName: displayNameFor(v.type)
                    });
                });
            });
        }

        const videoOpts = getVideoChartOptions();
        if (metric === 'conversionRate') {
            // 转化率：y 轴/tooltip 统一展示 X.XX%
            videoOpts.valueFormatter = (v) => `${(Number(v) || 0).toFixed(2)}%`;
        }
        renderMultiLineChart('visactor_window_10', chartData, chartTitle, timeRange, videoOpts);
        console.log('✅ 抖音视频数据图表已更新');
    }

    // 暴露到全局
    window.initSourceAnalysisChart = initSourceAnalysisChart;
    window.updateSourceAnalysisChart = updateSourceAnalysisChart;
    window.initDouyinVideoChart = initDouyinVideoChart;
    window.updateDouyinVideoChart = updateDouyinVideoChart;
    // 通用多折线/面积图渲染器（其它页面如转化分析可直接复用）
    window.renderMultiLineChart = renderMultiLineChart;
    // 通用环形图渲染器（用户画像等其它页面可直接复用，传 options.skipSeriesFilter: true 跳过来源分析的白名单/选中过滤）
    window.renderScenePieChart = renderScenePieChart;
})();
