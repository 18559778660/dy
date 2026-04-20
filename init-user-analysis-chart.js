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

    /**
     * 初始化实时分析图表
     */
    function initRealTimeChart() {
        // 从 JSON 配置中获取小时数据
        let data = [];
        const chartTitle = '访问人数';

        if (window.chartDataConfig && window.chartDataConfig.realTime && window.chartDataConfig.realTime.hourlyData) {
            const hourlyData = window.chartDataConfig.realTime.hourlyData;
            const currentHour = new Date().getHours();

            // 只取 0 点到当前小时的数据
            data = hourlyData
                .slice(0, currentHour + 1)
                .map(item => ({
                    date: item.hour,
                    value: item.visitors,
                    displayValue: item.visitors.toLocaleString('zh-CN'),
                    medalType: '访问人数'
                }));

            console.log('✅ [实时分析图表] 使用 JSON 配置数据:', chartTitle, `(00:00 - ${String(currentHour).padStart(2, '0')}:00，共${data.length}条数据)`);
        } else {
            console.log('⚠️ 未找到实时分析图表数据配置');
        }

        // 使用公共渲染函数
        renderChart('real_time_window_user', data, chartTitle);
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

        if (!window.chartDataConfig || !window.chartDataConfig.realTime || !window.chartDataConfig.realTime.hourlyData) {
            console.error('❌ [实时分析] 未找到数据配置');
            return;
        }

        const hourlyData = window.chartDataConfig.realTime.hourlyData;
        const currentHour = new Date().getHours();

        // 根据指标类型选择数据字段
        let dataField = 'visitors'; // 默认访问人数
        if (metricTitle === '访问次数') {
            dataField = 'visits';
        }

        // 准备数据
        const data = hourlyData
            .slice(0, currentHour + 1)
            .map(item => ({
                date: item.hour,
                value: item[dataField],
                displayValue: item[dataField].toLocaleString('zh-CN'),
                medalType: metricTitle
            }));

        console.log(`✅ [实时分析] 切换到 ${metricTitle}，共${data.length}条数据`);

        // 重新渲染图表
        renderChart('real_time_window_user', data, metricTitle);
    }

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
     * 初始化留存分析图表
     */
    function initRetentionChart() {
        console.log('初始化留存分析图表...');

        // 从 JSON 配置中获取数据
        let data = [];
        let chartTitle = '全部-1天后留存率';

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
                value: item.sidebarVisitday1Retention,  // 使用次日留存率
                displayValue: item.sidebarVisitday1Retention ? item.sidebarVisitday1Retention.toFixed(2) + '%' : '-',
                medalType: '全部-1天后留存率'
            }));

            console.log('✅ [留存分析图表] 使用 JSON 配置数据:', chartTitle, `(最近 7 天，共${data.length}条数据)`);
        } else {
            console.log('⚠️ 未找到留存分析图表数据配置');
        }

        // 使用公共渲染函数，传入Y轴百分比选项
        const vchart = renderChart('visactor_window_7', data, chartTitle, { yAxisPercent: true });
        if (vchart) {
            window.retentionChartInstance = vchart;
        }
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

        // 定义每个按钮对应的数据字段和标题
        const buttonConfig = [
            { text: '全部-1天后留存率', field: 'sidebarVisitday1Retention' },
            { text: '全部-3天后留存率', field: 'sidebarVisitday3Retention' },
            { text: '全部-14天后留存率', field: 'sidebarVisitday14Retention' },
            { text: '全部-30天后留存率', field: 'sidebarVisitday30Retention' }
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
        console.log(`更新留存图表: ${title}`);

        if (!window.chartDataConfig || !window.chartDataConfig.overview) {
            console.warn('未找到图表数据配置');
            return;
        }

        const chartConfig = window.chartDataConfig.overview[0];

        // 过滤最近 7 天的数据
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const filteredData = chartConfig.data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= sevenDaysAgo && itemDate < today;
        });

        const data = filteredData.map(item => {
            const value = item[field];
            const validValue = (value !== null && value !== undefined) ? Number(value) : 0;

            return {
                date: item.date,
                value: validValue,
                displayValue: value ? value.toFixed(2) + '%' : '0.00%',
                medalType: title
            };
        });

        console.log(`✅ [留存分析] 切换到指标: ${title} (共${data.length}条数据)`);

        // 更新 VChart 数据
        if (window.retentionChartInstance) {
            window.retentionChartInstance.updateData('data', data);

            // 更新标题
            const container = document.getElementById('visactor_window_7');
            if (container) {
                createChartTitle(container, title);
            }
        }
    }

    // 暴露到全局
    window.initRetentionRadioButtons = initRetentionRadioButtons;

    /**
     * 初始化来源分析多折线图
     */
    function initSourceAnalysisChart() {
        console.log('初始化来源分析图表...');

        // 检查当前选中的时间范围按钮
        const yesterdayBtn = document.querySelector('.time-range-yesterday.semi-dy-open-radio-addon-buttonRadio-checked');

        // 根据选中的按钮加载对应的数据
        if (yesterdayBtn) {
            console.log('[来源分析] 检测到“昨天”按钮选中，加载昨天的小时数据');
            updateSourceAnalysisChart('yesterday');
        } else {
            console.log('[来源分析] 加载近7天数据');
            updateSourceAnalysisChart(7);
        }
    }

    /**
     * 更新来源分析图表（通用函数）
     * @param {string|number} timeRange - 时间范围：'yesterday' 或 天数（7, 30等）
     */
    async function updateSourceAnalysisChart(timeRange) {
        console.log('[来源分析] 更新时间范围:', timeRange);

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

            // 3. 从全局配置中获取昨天的日数据
            if (!window.chartDataConfig || !window.chartDataConfig.overview) {
                console.error('未找到图表数据配置');
                return;
            }

            const chartConfig = window.chartDataConfig.overview[0];
            const yesterdayData = chartConfig.data.find(item => item.date === yesterdayStr);

            if (!yesterdayData) {
                console.error('未找到昨天的数据:', yesterdayStr);
                return;
            }

            console.log('昨天的日数据:', yesterdayData);

            // 4. 将每个来源场景的日数据按权重分配到24小时
            for (let hour = 0; hour < 24; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const weight = weights[hourStr] || 0;
                const timeLabel = `${yesterdayStr} ${hourStr}:00`;

                yesterdayData.douyinSourceScenes.forEach(scene => {
                    multiSeriesData.push({
                        date: timeLabel,
                        value: Math.round(scene.dailyUsers * weight),
                        sceneId: scene.sceneId,
                        sceneName: scene.sceneName
                    });
                });
            }

            chartTitle = '昨日来源分析-小时活跃用户数';
            console.log('生成的小时数据:', multiSeriesData.length, '条记录');
        } else {
            // 加载指定天数的日数据
            const days = timeRange;

            if (!window.chartDataConfig || !window.chartDataConfig.overview) {
                console.warn('未找到图表数据配置');
                return;
            }

            const chartConfig = window.chartDataConfig.overview[0];
            const data = chartConfig.data;

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
                        value: scene.dailyUsers,
                        sceneId: scene.sceneId,
                        sceneName: scene.sceneName
                    });
                });
            });

            chartTitle = days === 7 ? '来源分析-日活跃用户数' : `来源分析-日活跃用户数（近${days}天）`;
            console.log('生成的日数据:', multiSeriesData.length, '条记录');
        }

        // 渲染多折线图
        renderMultiLineChart('visactor_window_9', multiSeriesData, chartTitle, timeRange);
        console.log('✅ 来源分析图表已更新');
    }

    /**
     * 渲染多折线图
     * @param {string} containerId - 容器ID
     * @param {Array} data - 图表数据
     * @param {string} title - 图表标题
     * @param {string|number} timeRange - 时间范围：'yesterday' 或 天数（7, 30等）
     */
    function renderMultiLineChart(containerId, data, title, timeRange) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`未找到图表容器: ${containerId}`);
            return;
        }

        // 销毁旧实例
        if (window.sourceAnalysisChartInstance) {
            window.sourceAnalysisChartInstance.release();
        }

        // 颜色配置（7种不同颜色）
        const colors = [
            'rgb(73 127 252)', // 蓝色
            'rgb(38 194 176)', // 绿色
            'rgb(253 166 51)', // 橙色
            'rgb(251 218 49)', // 黄色
            'rgb(89 194 98)', // 绿色
            'rgb(167 218 44)', // 绿色
            'rgb(180 74 194)', // 紫色
        ];

        // 动态计算 sceneIdOrder：
        //   1) 用与汇总表相同的白名单收紧候选场景
        //   2) 按 sceneId 汇总 value（与表格「dailyUsers 降序」口径一致）
        //   3) 取汇总值最大的前 TOP_N 个 sceneId
        // 结果数组顺序 = 颜色顺序（value 高的用第一个颜色）
        const TOP_N = colors.length; // 7
        const whitelist = typeof window.getSourceSceneWhitelist === 'function'
            ? window.getSourceSceneWhitelist(timeRange)
            : null;

        // 先按白名单过滤
        if (whitelist) {
            data = data.filter(d => whitelist.has(d.sceneId));
        }

        // 按 sceneId 聚合 value
        const valueBySceneId = new Map();
        data.forEach(d => {
            valueBySceneId.set(d.sceneId, (valueBySceneId.get(d.sceneId) || 0) + (d.value || 0));
        });

        // 取 Top-N sceneId（降序）
        const sceneIdOrder = Array.from(valueBySceneId.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_N)
            .map(([sceneId]) => sceneId);

        // 最终只保留 Top-N 场景的数据
        data = data.filter(d => sceneIdOrder.includes(d.sceneId));

        // sceneId -> sceneName，用于图例/tooltip 展示
        const sceneIdToName = {};
        data.forEach(d => { sceneIdToName[d.sceneId] = d.sceneName; });

        // 判断是否为长周期场景（30天及以上）
        const isLongRange = timeRange === 30;

        // 创建图表配置
        const spec = {
            type: 'area',
            data: [{ values: data, id: 'data' }],
            xField: 'date',
            yField: 'value',
            seriesField: 'sceneId',
            stack: false,  // 不堆叠，让线条正常显示，只有最上面的区域可见
            // 线条样式
            line: {
                style: {
                    lineWidth: 2,
                    // 线条颜色按 sceneIdOrder（value 降序）映射，和图例/面积/tooltip 保持一致
                    stroke: (datum) => {
                        const idx = sceneIdOrder.indexOf(datum.sceneId);
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
                            const index = sceneIdOrder.indexOf(datum.sceneId);
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
                        const index = sceneIdOrder.indexOf(datum.sceneId);
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
                    // item.label 是 VChart 图例与 series 的联动 key（= sceneId），
                    // 改动它会导致点击图例的"显隐切换"失灵。
                    // 展示用的中文名通过下面的 item.label.formatter 做翻译。
                    const ordered = [...items].sort((a, b) => {
                        const ia = sceneIdOrder.indexOf(a.label);
                        const ib = sceneIdOrder.indexOf(b.label);
                        const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
                        const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
                        return ra - rb;
                    });

                    return ordered.map((item) => {
                        const idx = sceneIdOrder.indexOf(item.label);
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
                        // 仅改"显示文本"，不改底层 label（sceneId），保证点击显隐联动正常
                        formatMethod: (text) => sceneIdToName[text] || text,
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
                        formatMethod: (val) => {
                            return val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
                        }
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
                            key: (datum) => datum.sceneName,
                            value: (datum) => datum.value.toLocaleString('zh-CN'),
                            shapeType: 'square',
                            shapeFill: (datum) => {
                                const idx = sceneIdOrder.indexOf(datum.sceneId);
                                return colors[idx >= 0 ? idx : 0];
                            },
                            shapeStroke: (datum) => {
                                const idx = sceneIdOrder.indexOf(datum.sceneId);
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
                            key: (datum) => datum.sceneName,
                            value: (datum) => datum.value.toLocaleString('zh-CN'),
                            shapeType: 'square',
                            shapeFill: (datum) => {
                                const idx = sceneIdOrder.indexOf(datum.sceneId);
                                return colors[idx >= 0 ? idx : 0];
                            },
                            shapeStroke: (datum) => {
                                const idx = sceneIdOrder.indexOf(datum.sceneId);
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
            // 让 VChart 按 sceneIdOrder 顺序把 colors 分配给对应 series，
            // 避免默认按数据出现顺序分配导致颜色与图例/面积错位
            color: {
                type: 'ordinal',
                domain: sceneIdOrder,
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
                console.log('✅ 来源分析图表渲染完成');
            }).catch(err => {
                console.error('[来源分析图表] 渲染失败:', err);
            });
            window.sourceAnalysisChartInstance = vchart;
        } catch (error) {
            console.error('[来源分析图表] 创建失败:', error);
        }
    }

    // 暴露到全局
    window.initSourceAnalysisChart = initSourceAnalysisChart;
    window.updateSourceAnalysisChart = updateSourceAnalysisChart;
})();
