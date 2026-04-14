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
     */
    function renderChart(containerId, data, chartTitle) {
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
            const config = createChartConfig(data);

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

        // 获取昨天的日期（MM/DD 格式）
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${month}/${day}`;

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
        const dbyMonth = String(dayBeforeYesterday.getMonth() + 1).padStart(2, '0');
        const dbyDay = String(dayBeforeYesterday.getDate()).padStart(2, '0');
        const dayBeforeStr = `${dbyMonth}/${dbyDay}`;

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
            const [month, day] = item.date.split('/').map(Number);
            const currentYear = new Date().getFullYear();
            const itemDate = new Date(currentYear, month - 1, day);
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
                value: item.day1Retention,  // 使用次日留存率
                displayValue: item.day1Retention ? item.day1Retention.toFixed(2) + '%' : '-',
                medalType: '全部-1天后留存率'
            }));

            console.log('✅ [留存分析图表] 使用 JSON 配置数据:', chartTitle, `(最近 7 天，共${data.length}条数据)`);
        } else {
            console.log('⚠️ 未找到留存分析图表数据配置');
        }

        // 使用公共渲染函数
        renderChart('visactor_window_7', data, chartTitle);
    }

    // 暴露到全局
    window.initRetentionChart = initRetentionChart;
})();
