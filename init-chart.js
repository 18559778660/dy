// 初始化 VisActor 图表 - VChart v1.2.0
(function () {
    console.log('开始初始化图表...');

    // 将 initChart 函数暴露到全局作用域，供页面切换时重新调用
    window.initChart = initChart;

    // 图表配置 - 从 JSON 文件加载
    let chartDataConfig = null;

    // 当前选中的指标
    let currentMetric = '日访问用户';

    // 保存 VChart 实例
    let vchartInstance = null;

    // 保存图表 DOM 容器
    let chartDomContainer = null;

    // 加载图表数据配置
    function loadChartData() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', './chart-data.json', true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    try {
                        chartDataConfig = JSON.parse(xhr.responseText);
                        console.log('✅ 图表数据配置加载成功');
                        console.log(chartDataConfig);

                        // 加载成功后立即组装总用户数数据
                        buildTotalUsersData();

                        resolve(chartDataConfig);
                    } catch (e) {
                        console.error('❌ JSON 解析失败:', e);
                        reject(e);
                    }
                } else {
                    console.error('❌ 加载图表数据失败:', xhr.status);
                    reject(new Error('加载失败'));
                }
            };
            xhr.onerror = function () {
                console.error('❌ 网络错误');
                reject(new Error('网络错误'));
            };
            xhr.send();
        });
    }

    // 组装总用户数图表数据
    function buildTotalUsersData() {
        if (!chartDataConfig || !chartDataConfig.overview || !chartDataConfig.overview[0]) {
            console.error('❌ 图表数据配置为空');
            return;
        }

        const chartConfig = chartDataConfig.overview[0];

        // 过滤最近 7 天的数据（不包括今天）
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // 累加 newUsers 并添加到每个数据项中
        let cumulative = 0;
        chartConfig.data.forEach(item => {
            const [month, day] = item.date.split('/').map(Number);
            const currentYear = new Date().getFullYear();
            const itemDate = new Date(currentYear, month - 1, day);

            // 只统计最近 7 天（不包括今天）的数据
            if (itemDate >= sevenDaysAgo && itemDate < today) {
                cumulative += item.newUsers;
                // 添加 totalUser 字段到数据对象中
                item.totalUser = cumulative;
            }
        });

        console.log('\n=== 已添加 totalUser 字段的图表数据 ===');
        console.log(JSON.stringify(chartConfig.data, null, 2));
        console.log('====================================\n');
    }

    // 延迟执行，等待 dashboard-content.html 加载完成
    setTimeout(() => {
        // 检查 VChart 是否已加载
        if (typeof VChart === 'undefined') {
            console.error('❌ VChart 库未加载成功');
            return;
        }

        // 加载数据并初始化图表
        loadChartData().then(() => {
            // 初始化卡片数据
            initMetricCards();

            // 初始化图表
            initChart();
        }).catch(err => {
            console.error('加载图表数据失败:', err);
        });
    }, 500); // 延迟 500ms 执行

    function initChart() {
        console.log('开始查找图表容器');

        const container = document.getElementById('visactor_window');
        if (!container) {
            console.error('未找到图表容器 visactor_window');
            return;
        }

        console.log('✅ 找到图表容器');

        // 不需要手动创建 canvas，VChart 会自己创建
        const chartDom = document.getElementById('visactor_window');

        // 从 JSON 配置中获取数据
        let data = [];
        let chartTitle = '日访问用户'; // 默认标题

        if (chartDataConfig && chartDataConfig.overview && chartDataConfig.overview.length > 0) {
            const chartConfig = chartDataConfig.overview[0]; // 使用总览数据

            // 过滤最近 7 天的数据（不包括今天）
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 设置为今天 0 点

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // 7 天前的日期
            sevenDaysAgo.setHours(0, 0, 0, 0); // 设置为当天 0 点

            // 过滤并转换数据 - 只使用"日访问用户"指标
            const filteredData = chartConfig.data.filter(item => {
                // 解析日期（格式：MM/DD）
                const [month, day] = item.date.split('/').map(Number);
                const currentYear = new Date().getFullYear();
                const itemDate = new Date(currentYear, month - 1, day);

                // 只保留最近 7 天的数据（不包括今天）
                return itemDate >= sevenDaysAgo && itemDate < today;
            });

            // 只添加日访问用户数据（默认显示这个指标）
            data = filteredData.map(item => ({
                date: item.date,
                value: item.dailyUsers, // 只使用日访问用户数据
                displayValue: item.dailyUsers.toLocaleString('zh-CN'), // 千位分隔符格式化
                medalType: '日访问用户'
            }));

            console.log('✅ 使用 JSON 配置数据:', chartTitle, `(最近 7 天，共${data.length}条数据)`);
        } else {
            console.log('⚠️ 未找到图表数据配置');
        }

        // 图表标题配置 - 支持多个图表
        const chartConfig = {
            title: chartTitle,
            showTitle: true
        };

        try {
            // VChart v2.x 使用 VChart.VChart 作为构造函数
            const ChartClass = VChart.VChart || VChart;

            console.log('VChart 对象:', typeof VChart);
            console.log('ChartClass:', ChartClass);

            const vchart = new ChartClass({
                type: 'area',
                data: [{ values: data, id: 'data' }],
                xField: 'date',
                yField: 'value',  // ✅ 改成 value，因为数据字段是 value
                seriesField: 'medalType',  // ✅ 系列字段，tooltip 会显示这个字段的值
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
                // 区域渐变填充 - 折线图底下的蓝色渐变
                //面积图自带渐变蓝色
                area: {
                    visible: true,
                    style: {
                        curveType: 'monotone',
                        // ✅ 关键：不要用 fill 对象，而是用回调函数隔离 color scale
                        fill: (datum, seriesIndex) => ({
                            gradient: 'linear',
                            x0: 0, y0: 0,
                            x1: 0, y1: 1,
                            stops: [
                                { offset: 0, color: 'rgb(73, 127, 252)', opacity: 0.3 },
                                { offset: 1, color: 'rgb(73, 127, 252)', opacity: 0.05 }

                            ]
                        })
                    }
                },

                // 坐标轴
                axes: [
                    {
                        orient: 'left',
                        grid: {
                            visible: true,
                            style: {
                                lineDash: [],  // 空数组表示实线
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
                // 悬停提示 - VChart 2.x 使用默认配置，会自动显示 seriesField 名称
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
                        visible: true,  // 显示 X 轴方向的准星线
                        line: {
                            type: 'line',  // 线条类型：'line' 表示直线，默认为 'rect'（矩形区域）
                            style: {
                                lineWidth: 1,        // 线宽：1 像素（更细）
                                opacity: 0.6,        // 透明度：0.6（颜色更深）
                                stroke: 'rgb(138, 141, 143)',  // 线条颜色：中灰色
                                lineDash: [4, 4]     // 虚线样式：[实线长度，空白长度]，4px 实线 + 4px 空白（更稀疏）
                            }
                        },
                        bindingAxesIndex: [1],  // 绑定到第 2 个坐标轴（bottom 轴）
                        // defaultSelect: {  // ⬅️ 默认选中位置，用于调试，暂时注释掉
                        //     axisIndex: 1,
                        //     datum: '回合 6'  // ⬅️ 默认选中的数据点（X 轴的值）
                        // }
                    },
                    yField: {
                        visible: false,  // 不显示 Y 轴方向的准星线（暂时保留配置）
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
            }, {
                dom: chartDom,
                width: chartDom.offsetWidth || 765,
                height: chartDom.offsetHeight || 305
            });

            console.log('✅ 图表创建成功');

            // 渲染图表
            vchart.renderAsync().then(() => {
                console.log('图表渲染完成');

                // 动态创建标题
                if (chartConfig.showTitle) {
                    createChartTitle(chartDom, chartConfig.title);
                }

                // 保存 VChart 实例和 DOM 容器
                vchartInstance = vchart;
                chartDomContainer = chartDom;
            }).catch(err => {
                console.error('图表渲染失败:', err);
            });

        } catch (error) {
            console.error('VChart 初始化失败:', error);
        }
    }

    // 动态创建图表标题
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

    // 全局函数：切换图表指标
    window.updateChartMetric = updateChartMetric;

    function updateChartMetric(metricTitle) {
        console.log('更新图表指标:', metricTitle);

        if (!chartDataConfig || !chartDataConfig.overview || chartDataConfig.overview.length === 0) {
            console.warn('没有图表数据配置');
            return;
        }

        const chartConfig = chartDataConfig.overview[0];
        currentMetric = metricTitle;

        // 过滤最近 7 天的数据
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
        let dataField = 'dailyUsers'; // 默认
        if (metricTitle === '新增用户数') {
            dataField = 'newUsers';
        } else if (metricTitle === '人均时长') {
            dataField = 'avgDuration';
        } else if (metricTitle === '总用户数') {
            // 总用户数 = 新增用户数的累计值
            dataField = 'newUsers';
        }

        // 转换数据
        let data = filteredData.map(item => {
            let value = item[dataField];
            let displayValue = value; // 用于 tooltip 显示的值

            // 如果是人均时长，将秒数转换为 "HH:MM:SS" 格式字符串用于显示
            if (metricTitle === '人均时长' && typeof value === 'number') {
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

        // 如果是总用户数，需要计算累计值
        if (metricTitle === '总用户数') {
            let cumulative = 0;
            data = data.map(item => {
                cumulative += item.value; // 累加新增用户数
                return {
                    date: item.date,
                    value: cumulative,
                    displayValue: cumulative.toLocaleString('zh-CN'), // 千位分隔符格式化
                    medalType: '总用户数'
                };
            });
        }

        console.log('✅ 切换到指标:', metricTitle, `(共${data.length}条数据)`);

        // 更新 VChart 数据
        if (vchartInstance && chartDomContainer) {
            vchartInstance.updateData('data', data);

            // 更新标题
            createChartTitle(chartDomContainer, metricTitle);
        }
    }

    // 初始化卡片数据（显示昨天数据）
    function initMetricCards() {
        console.log('开始初始化卡片数据...');

        if (!chartDataConfig || !chartDataConfig.overview || !chartDataConfig.overview[0]) {
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

        const chartConfig = chartDataConfig.overview[0];

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

        // 更新四个卡片的数值
        const dailyUsersEl = document.querySelector('[data-metric="dailyUsers"]');
        const newUsersEl = document.querySelector('[data-metric="newUsers"]');
        const avgDurationEl = document.querySelector('[data-metric="avgDuration"]');
        const totalUsersEl = document.querySelector('[data-metric="totalUsers"]');

        // 获取涨幅元素
        const dailyUsersCompareEl = document.querySelector('[data-compare="dailyUsers"]');
        const newUsersCompareEl = document.querySelector('[data-compare="newUsers"]');
        const avgDurationCompareEl = document.querySelector('[data-compare="avgDuration"]');
        const totalUsersCompareEl = document.querySelector('[data-compare="totalUsers"]');

        if (dailyUsersEl) {
            dailyUsersEl.textContent = yesterdayData.dailyUsers.toLocaleString('zh-CN');
        }

        if (newUsersEl) {
            newUsersEl.textContent = yesterdayData.newUsers.toLocaleString('zh-CN');
        }

        if (avgDurationEl) {
            // 将秒数转换为 HH:MM:SS 格式
            const seconds = yesterdayData.avgDuration;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            avgDurationEl.textContent = [
                String(hours).padStart(2, '0'),
                String(minutes).padStart(2, '0'),
                String(secs).padStart(2, '0')
            ].join(':');
        }

        if (totalUsersEl) {
            // 总用户数直接从 yesterdayData.totalUser 获取
            totalUsersEl.textContent = yesterdayData.totalUser.toLocaleString('zh-CN');
            console.log('总用户数:', yesterdayData.totalUser);
        }

        // 更新涨幅数据
        if (dayBeforeData) {
            updateCompareValues(dailyUsersCompareEl, yesterdayData.dailyUsers, dayBeforeData.dailyUsers);
            updateCompareValues(newUsersCompareEl, yesterdayData.newUsers, dayBeforeData.newUsers);
            updateCompareValues(avgDurationCompareEl, yesterdayData.avgDuration, dayBeforeData.avgDuration);
            updateCompareValues(totalUsersCompareEl, yesterdayData.totalUser, dayBeforeData.totalUser);
        }

        console.log('✅ 卡片数据已更新');
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
})();
