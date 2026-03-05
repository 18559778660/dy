// 初始化 VisActor 图表 - VChart v1.2.0
(function () {
    console.log('开始初始化图表...');

    // 将 initChart 函数暴露到全局作用域，供页面切换时重新调用
    window.initChart = initChart;

    // 图表配置 - 从 JSON 文件加载
    let chartDataConfig = null;

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

    // 获取指定标题的图表数据
    function getChartDataByTitle(title) {
        if (!chartDataConfig || !chartDataConfig.overview) {
            return null;
        }
        return chartDataConfig.overview.find(chart => chart.title === title);
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
                            valueFormatter: '{value:,.0f}' // 千位分隔符，无小数位
                        }
                    },
                    dimension: {
                        content: {
                            valueFormatter: '{value:,.0f}' // .1f 一位小数 千位分隔符，无小数位
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
})();
