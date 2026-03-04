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
            { date: '02/01', value: 8500 },
            { date: '02/02', value: 9200 },
            { date: '02/03', value: 10640 },
            { date: '02/04', value: 9800 },
            { date: '02/05', value: 11200 },
            { date: '02/06', value: 10640 },
            { date: '02/07', value: 12000 }
        ];

        try {
            // VChart v1.2.0 使用 VChart.VChart 作为构造函数
            const ChartClass = VChart.VChart || VChart;

            const vchart = new ChartClass({
                type: 'line',
                data: [{ values: data, id: 'data' }],
                xField: 'date',
                yField: 'value',
                // 线条样式
                line: {
                    style: {
                        stroke: '#1C5CFB',
                        lineWidth: 2
                    }
                },
                // 数据点：默认隐藏，hover 显示空心点
                point: {
                    visible: false,
                    state: {
                        hover: {
                            visible: true,
                            style: {
                                fill: '#ffffff',
                                stroke: '#1C5CFB',
                                lineWidth: 2
                            }
                        }
                    }
                },
                // 区域渐变填充
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
                                { offset: 0, color: 'rgba(28, 92, 251, 0.3)' },
                                { offset: 1, color: 'rgba(28, 92, 251, 0.05)' }
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
                                lineDash: [4, 4],
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
                    visible: true
                }
            }, {
                dom: chartDom,
                width: chartDom.offsetWidth || 765,// 动态优先，固定兜底
                height: chartDom.offsetHeight || 305
            });

            console.log('✅ 图表创建成功');

            // 渲染图表
            vchart.renderAsync().then(() => {
                console.log('图表渲染完成');
            }).catch(err => {
                console.error('图表渲染失败:', err);
            });

        } catch (error) {
            console.error('VChart 初始化失败:', error);
        }
    }
})();
