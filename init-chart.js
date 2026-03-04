// 初始化 VisActor 图表 - VChart v1.2.0
(function () {
    console.log('开始初始化图表...');

    // 延迟执行，等待 dashboard-content.html 加载完成
    setTimeout(() => {
        // 检查 VChart 是否已加载
        if (typeof VChart === 'undefined') {
            console.error('❌ VChart 库未加载成功');
            return;
        }

        initChart();
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

        // 模拟数据 - 这里可以替换成真实数据
        const data = [
            { date: '02/01', 'value': '8,500', "medalType": "日访问用户" },
            { date: '02/02', 'value': '9,200', "medalType": "日访问用户" },
            { date: '02/03', 'value': '10,640', "medalType": "日访问用户" },
            { date: '02/04', 'value': '9,800', "medalType": "日访问用户" },
            { date: '02/05', 'value': '11,200', "medalType": "日访问用户" },
            { date: '02/06', 'value': '10,640', "medalType": "日访问用户" },
            { date: '02/07', 'value': '12,000', "medalType": "日访问用户" }
        ];

        // 图表标题配置 - 支持多个图表
        const chartConfig = {
            title: '日访问用户',
            showTitle: true
        };

        try {
            // VChart v2.x 使用 VChart.VChart 作为构造函数
            const ChartClass = VChart.VChart || VChart;

            console.log('VChart 对象:', typeof VChart);
            console.log('ChartClass:', ChartClass);

            const vchart = new ChartClass({
                type: 'line',
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
                    visible: true,
                    style: {
                        size: 0 // 设为 0，相当于默认状态看不到点
                    },
                    state: {
                        hover: {
                            visible: true,
                            style: {
                                fill: '#ffffff',      // 白色填充（空心效果）
                                stroke: '#1C5CFB',    // 蓝色描边
                                lineWidth: 2,
                                size: 8               // hover 时稍微大一点更明显
                            }
                        }
                    }
                },
                // 区域渐变填充 - 折线图底下的蓝色渐变
                area: {
                    visible: true,
                    style: {
                        fill: {
                            gradient: 'linear',
                            x0: 0,
                            y0: 0,
                            x1: 0,
                            y1: 1,
                            stops: [
                                { offset: 0, color: 'rgba(28, 92, 251, 0.3)' },   // 顶部蓝色较深
                                { offset: 1, color: 'rgba(28, 92, 251, 0.05)' }   // 底部蓝色较浅
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
                    visible: true
                },
                // 十字准星线 - hover 时的虚线背景
                crosshair: {
                    x: {
                        visible: true,
                        style: {
                            stroke: '#1C5CFB',
                            lineDash: [4, 4]
                        }
                    },
                    y: {
                        visible: false
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
                background-color: #1C5CFB;
                margin-right: 8px;
                border-radius: 2px;
            `;

            // 创建标题文字
            const text = document.createElement('span');
            text.textContent = title;
            text.style.color = 'var(--text-2, #8F959E)';

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
