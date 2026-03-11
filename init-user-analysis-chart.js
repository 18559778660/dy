// 用户分析页面图表初始化
(function () {
    console.log('开始初始化用户分析图表...');

    // 将初始化函数暴露到全局作用域，供页面切换时重新调用
    window.initUserAnalysisChart = initUserAnalysisChart;

    // 将初始化卡片数据函数暴露到全局作用域
    window.initUserAnalysisCards = initUserAnalysisCards;

    // 图表配置 - 从 JSON 文件加载
    let chartDataConfig = null;

    function initUserAnalysisChart() {
        const container = document.getElementById('visactor_window_user');
        if (!container) {
            console.error('❌ [用户分析图表] 未找到图表容器 visactor_window_user');
            return;
        }

        // 清空容器，避免重复渲染
        container.innerHTML = '';

        console.log('✅ 找到图表容器');

        // 从 JSON 配置中获取数据
        let data = [];
        let chartTitle = '活跃用户数'; // 标题改为"活跃用户数"

        if (chartDataConfig && chartDataConfig.overview && chartDataConfig.overview.length > 0) {
            const chartConfig = chartDataConfig.overview[0]; // 使用总览数据
            // 过滤最近 7 天的数据（不包括今天）
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 设置为今天 0 点

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // 7 天前的日期
            sevenDaysAgo.setHours(0, 0, 0, 0); // 设置为当天 0 点

            // 过滤并转换数据 - 只使用"日访问"指标（但显示为"活跃用户数"）
            const filteredData = chartConfig.data.filter(item => {
                // 解析日期（格式：MM/DD）
                const [month, day] = item.date.split('/').map(Number);
                const currentYear = new Date().getFullYear();
                const itemDate = new Date(currentYear, month - 1, day);

                // 只保留最近 7 天的数据（不包括今天）
                return itemDate >= sevenDaysAgo && itemDate < today;
            });

            // 只添加日访问用户数据（使用 dailyUsers 字段）
            data = filteredData.map(item => ({
                date: item.date,
                value: item.dailyUsers, // 数据字段仍然是 dailyUsers
                displayValue: item.dailyUsers.toLocaleString('zh-CN'), // 千位分隔符格式化
                medalType: '活跃用户数' // 系列名称显示为"活跃用户数"
            }));

            console.log('✅ [用户分析图表] 使用 JSON 配置数据:', chartTitle, `(最近 7 天，共${data.length}条数据)`);
        } else {
            console.log('⚠️ 未找到图表数据配置');
        }

        try {
            // VChart v2.x 使用 VChart.VChart 作为构造函数
            const ChartClass = VChart.VChart || VChart;

            const vchart = new ChartClass({
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
            }, {
                dom: container,
                width: container.offsetWidth || 765,
                height: container.offsetHeight || 305
            });

            // 渲染图表
            vchart.renderAsync().then(() => {
                console.log('✅ [用户分析图表] 渲染完成');

                // 动态创建图表标题
                createChartTitle(container, chartTitle);
            }).catch(err => {
                console.error('❌ [用户分析图表] 渲染失败:', err);
            });

            // 保存实例到全局变量，用于后续更新
            window.userAnalysisChart = vchart;

        } catch (error) {
            console.error('❌ 图表创建失败:', error);
        }
    }

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

        // 更新活跃用户数卡片
        const activeUsersEl = document.querySelector('[data-metric="activeUsers"]');
        const activeUsersCompareEl = document.querySelector('[data-compare="activeUsers"]');

        if (activeUsersEl) {
            activeUsersEl.textContent = yesterdayData.dailyUsers.toLocaleString('zh-CN');
            console.log('活跃用户数:', yesterdayData.dailyUsers);
        }

        // 更新涨幅数据
        if (dayBeforeData && activeUsersCompareEl) {
            updateCompareValues(activeUsersCompareEl, yesterdayData.dailyUsers, dayBeforeData.dailyUsers);
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
})();
