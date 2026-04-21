// 动态加载内容的JavaScript 文件
(function () {
    console.log('开始动态加载内容...');

    // 当前激活的页面
    let currentPage = 'dashboard';

    // 加载仪表板内容
    function loadDashboard() {
        console.log('加载仪表板内容...');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './dashboard-content.html', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const container = document.querySelector('.content-Ick90x');
                if (container) {
                    container.innerHTML = xhr.responseText;
                    console.log('仪表板内容加载完成');
                    currentPage = 'dashboard';

                    // 重新初始化图表
                    if (typeof initChart === 'function') {
                        setTimeout(() => initChart(), 100);
                    }

                    // 重新初始化卡片数据
                    if (typeof initMetricCards === 'function') {
                        setTimeout(() => initMetricCards(), 100);
                    }

                    // 重新渲染公告
                    if (typeof renderAnnouncementsInit === 'function') {
                        setTimeout(() => renderAnnouncementsInit(), 100);
                    }

                    // 重新初始化 tooltip
                    if (typeof initMetricTooltip === 'function') {
                        setTimeout(() => initMetricTooltip(), 100);
                    }

                    // 重新初始化 banner 关闭功能
                    if (typeof initBannerClose === 'function') {
                        setTimeout(() => initBannerClose(), 100);
                    }

                    // 重新初始化单选按钮切换
                    if (typeof initRadioButtons === 'function') {
                        setTimeout(() => initRadioButtons(), 100);
                    }
                }
            }
        };
        xhr.send();
    }

    // 加载版本管理内容
    function loadVersion() {
        console.log('加载版本管理内容...');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './version.html', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const container = document.querySelector('.content-Ick90x');
                if (container) {
                    container.innerHTML = xhr.responseText;
                    console.log('版本管理内容加载完成');
                    currentPage = 'version';

                    // 延迟执行确保 DOM 完全渲染
                    setTimeout(() => {
                        if (typeof renderVersionData === 'function') {
                            renderVersionData();
                        }
                    }, 100);
                }
            }
        };
        xhr.send();
    }

    // 加载用户分析内容
    function loadUserAnalysis() {
        console.log('加载用户分析内容...');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './user_analysis.html', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const container = document.querySelector('.content-Ick90x');
                if (container) {
                    container.innerHTML = xhr.responseText;
                    console.log('用户分析内容加载完成');
                    currentPage = 'user_analysis';

                    // 初始化日期选择器图标交互
                    if (typeof initDatepickerIconInteraction === 'function') {
                        setTimeout(() => initDatepickerIconInteraction(), 100);
                    }

                    // 初始化图表
                    if (typeof initUserAnalysisChart === 'function') {
                        setTimeout(() => initUserAnalysisChart(), 100);
                    }

                    // 初始化卡片数据
                    if (typeof initUserAnalysisCards === 'function') {
                        setTimeout(() => initUserAnalysisCards(), 100);
                    }

                    // 重新初始化 tooltip
                    if (typeof window.initMetricTooltip === 'function') {
                        setTimeout(() => window.initMetricTooltip(), 100);
                    }

                    // 初始化单选按钮切换
                    if (typeof window.initRadioButtons === 'function') {
                        setTimeout(() => window.initRadioButtons(), 100);
                    }

                    // 初始化时间范围单选按钮（行为分析）
                    if (typeof window.initTimeRangeButtons === 'function') {
                        setTimeout(() => window.initTimeRangeButtons('.user-behavior-section'), 100);
                    }

                    // 初始化时间范围单选按钮（来源分析）
                    if (typeof window.initTimeRangeButtons === 'function') {
                        setTimeout(() => window.initTimeRangeButtons('.user-source-section'), 150);
                    }
                    //初始化时间范围单选按钮(留存分析)
                    if (typeof window.initTimeRangeButtons === 'function') {
                        setTimeout(() => window.initTimeRangeButtons('.user-retention-section'), 150);
                    }
                    // 初始化时间范围单选按钮（转化分析）
                    if (typeof window.initTimeRangeButtons === 'function') {
                        setTimeout(() => window.initTimeRangeButtons('.user-transformation-section'), 150);
                    }
                    // 初始化时间范围单选按钮（用户画像分析）
                    if (typeof window.initTimeRangeButtons === 'function') {
                        setTimeout(() => window.initTimeRangeButtons('.user-gender-section'), 150);
                    }
                    // 初始化时间范围单选按钮（终端分析）
                    if (typeof window.initTimeRangeButtons === 'function') {
                        setTimeout(() => window.initTimeRangeButtons('.user-terminal-section'), 150);
                    }

                    // 初始化下拉筛选框
                    if (typeof window.initDropdownFilters === 'function') {
                        setTimeout(() => window.initDropdownFilters(), 100);
                    }

                    // 初始化页面标签切换
                    if (typeof window.initPageTabs === 'function') {
                        setTimeout(() => window.initPageTabs(), 100);
                    }

                    // 初始化用户分析表格
                    if (typeof window.initUserAnalysisTable === 'function') {
                        setTimeout(() => window.initUserAnalysisTable(), 100);
                    }

                    // 初始化留存分析表格
                    if (typeof window.initRetentionTable === 'function') {
                        setTimeout(() => {
                            window.initRetentionTable();
                            // 绑定导出按钮
                            const exportBtn = document.querySelector('.export-retention-btn');
                            if (exportBtn && typeof window.exportRetentionTable === 'function') {
                                exportBtn.addEventListener('click', window.exportRetentionTable);
                                console.log('✅ 留存分析导出按钮已绑定');
                            }
                        }, 150);
                    }

                    // 初始化侧边栏留存分析表格
                    if (typeof window.initSidebarRetentionTable === 'function') {
                        setTimeout(() => {
                            window.initSidebarRetentionTable();
                            // 绑定导出按钮
                            const exportBtn = document.querySelector('.export-sidebar-retention-btn');
                            if (exportBtn && typeof window.exportSidebarRetentionTable === 'function') {
                                exportBtn.addEventListener('click', window.exportSidebarRetentionTable);
                                console.log('✅ 侧边栏留存导出按钮已绑定');
                            }
                        }, 200);
                    }

                    // 初始化来源分析汇总表
                    if (typeof window.initSourceSceneTable === 'function') {
                        setTimeout(() => {
                            window.initSourceSceneTable();
                            const exportBtn = document.querySelector('.export-source-scene-btn');
                            if (exportBtn && typeof window.exportSourceSceneTable === 'function') {
                                exportBtn.addEventListener('click', window.exportSourceSceneTable);
                                console.log('✅ 来源分析汇总导出按钮已绑定');
                            }
                        }, 220);
                    }

                    // 先初始化来源场景多选下拉（默认选 Top 7，置入 window._sourceSceneSelected）
                    // 再渲染图表，保证图表读到正确的选中集合
                    if (typeof window.initSourceSceneSelect === 'function') {
                        setTimeout(() => window.initSourceSceneSelect(), 240);
                    }
                    if (typeof window.initSourceAnalysisChart === 'function') {
                        setTimeout(() => window.initSourceAnalysisChart(), 260);
                    }

                    // 初始化抖音视频数据图表
                    if (typeof window.initDouyinVideoChart === 'function') {
                        setTimeout(() => window.initDouyinVideoChart(), 280);
                    }

                    // 初始化抖音视频数据汇总表
                    if (typeof window.initDouyinVideoTable === 'function') {
                        setTimeout(() => {
                            window.initDouyinVideoTable();
                            const exportBtn = document.querySelector('.export-douyin-video-btn');
                            if (exportBtn && typeof window.exportDouyinVideoTable === 'function') {
                                exportBtn.addEventListener('click', window.exportDouyinVideoTable);
                                console.log('✅ 抖音视频数据导出按钮已绑定');
                            }
                        }, 300);
                    }

                    // 初始化实时分析图表
                    if (typeof window.initRealTimeChart === 'function') {
                        setTimeout(() => window.initRealTimeChart(), 100);
                    }

                    // 初始化留存分析图表
                    if (typeof window.initRetentionChart === 'function') {
                        setTimeout(() => window.initRetentionChart(), 100);
                    }

                    // 初始化留存分析单选按钮
                    if (typeof window.initRetentionRadioButtons === 'function') {
                        setTimeout(() => {
                            console.log('开始初始化留存分析按钮...');
                            window.initRetentionRadioButtons();
                        }, 200);
                    }

                }
            }
        };
        xhr.send();
    }

    // 加载流量主内容
    function loadFlowRate() {
        console.log('加载流量主内容...');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './flow_rate.html', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const container = document.querySelector('.content-Ick90x');
                if (container) {
                    container.innerHTML = xhr.responseText;
                    console.log('流量主内容加载完成');
                    currentPage = 'flow_rate';

                    // 延迟执行确保 DOM 完全渲染
                    setTimeout(() => {
                        // 初始化流量主标签切换
                        initFlowRateTabs();
                        console.log('流量主页面初始化完成');
                    }, 100);
                }
            }
        };
        xhr.send();
    }

    // 初始化流量主标签切换
    function initFlowRateTabs() {
        console.log('初始化流量主标签切换...');

        // 获取流量主页面中的所有标签页
        const tabs = document.querySelectorAll('[role="tab"]');

        if (!tabs || tabs.length === 0) {
            console.warn('未找到标签页元素');
            return;
        }

        // 为每个标签添加点击事件
        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                const tabKey = this.getAttribute('data-tabkey');

                // 只处理流量主页面的标签（广告数据、广告管理、收入结算）
                if (tabKey !== 'semiTabadData' && tabKey !== 'semiTabadManage' && tabKey !== 'semiTabadSettlement') {
                    return;
                }

                console.log('点击流量主标签:', this.textContent.trim());

                // 移除所有标签的选中状态
                tabs.forEach(t => {
                    t.classList.remove('semi-dy-open-tabs-tab-active');
                    t.setAttribute('aria-selected', 'false');
                    t.setAttribute('tabindex', '-1');
                });

                // 添加当前标签的选中状态
                this.classList.add('semi-dy-open-tabs-tab-active');
                this.setAttribute('aria-selected', 'true');
                this.setAttribute('tabindex', '0');

                // 获取对应的内容面板 ID
                const panelId = this.getAttribute('aria-controls');

                // 隐藏所有内容面板
                document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
                    panel.style.display = 'none';
                    panel.setAttribute('aria-hidden', 'true');
                    panel.classList.remove('semi-dy-open-tabs-pane-active');
                    panel.classList.add('semi-dy-open-tabs-pane-inactive');
                });

                // 显示当前选中的面板
                const activePanel = document.getElementById(panelId);
                if (activePanel) {
                    activePanel.style.display = 'block';
                    activePanel.setAttribute('aria-hidden', 'false');
                    activePanel.classList.remove('semi-dy-open-tabs-pane-inactive');
                    activePanel.classList.add('semi-dy-open-tabs-pane-active');
                    console.log('显示面板:', panelId);
                }
            });
        });

        console.log('流量主标签切换初始化完成');
    }

    // 初始加载仪表板
    loadDashboard();

    // 加载悬浮工具栏
    const toolbarXhr = new XMLHttpRequest();
    toolbarXhr.open('GET', './floating-toolbar.html', true);
    toolbarXhr.onload = function () {
        if (toolbarXhr.status === 200) {
            document.body.insertAdjacentHTML('beforeend', toolbarXhr.responseText);
            console.log('工具栏内容加载完成');
        }
    };
    toolbarXhr.send();

    // 监听菜单点击事件（等待 DOM 加载完成后）
    setTimeout(() => {
        // 获取所有菜单项
        const menuItems = document.querySelectorAll('.semi-dy-open-navigation-item-normal');
        console.log('找到菜单项数量:', menuItems.length);

        menuItems.forEach((item, index) => {
            const textSpan = item.querySelector('.semi-dy-open-navigation-item-text');
            if (textSpan) {
                const text = textSpan.textContent.trim();
                console.log(`菜单 ${index}: ${text}`);

                // 总览菜单
                if (text === '总览') {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        console.log('点击总览菜单');

                        // 移除其他菜单的选中状态
                        menuItems.forEach(mi => mi.classList.remove('semi-dy-open-navigation-item-selected'));
                        // 添加当前菜单选中状态
                        this.classList.add('semi-dy-open-navigation-item-selected');

                        // 加载仪表板内容
                        loadDashboard();
                    });
                }

                // 版本管理菜单
                else if (text === '版本管理') {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        console.log('点击版本管理菜单');

                        // 移除其他菜单的选中状态
                        menuItems.forEach(mi => mi.classList.remove('semi-dy-open-navigation-item-selected'));
                        // 添加当前菜单选中状态
                        this.classList.add('semi-dy-open-navigation-item-selected');

                        // 加载版本管理内容
                        loadVersion();
                    });
                }

                // 用户分析菜单
                else if (text === '用户分析') {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        console.log('点击用户分析菜单');

                        // 移除其他菜单的选中状态
                        menuItems.forEach(mi => mi.classList.remove('semi-dy-open-navigation-item-selected'));
                        // 添加当前菜单选中状态
                        this.classList.add('semi-dy-open-navigation-item-selected');

                        // 加载用户分析内容
                        loadUserAnalysis();
                    });
                }

                // 流量主菜单
                else if (text === '流量主') {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        console.log('点击流量主菜单');

                        // 移除其他菜单的选中状态
                        menuItems.forEach(mi => mi.classList.remove('semi-dy-open-navigation-item-selected'));
                        // 添加当前菜单选中状态
                        this.classList.add('semi-dy-open-navigation-item-selected');

                        // 加载流量主内容
                        loadFlowRate();
                    });
                }

                // 其他未配置的菜单 - 清空内容显示空白
                else {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        console.log(`点击未配置菜单：${text}`);

                        // 移除其他菜单的选中状态
                        menuItems.forEach(mi => mi.classList.remove('semi-dy-open-navigation-item-selected'));
                        // 添加当前菜单选中状态
                        this.classList.add('semi-dy-open-navigation-item-selected');

                        // 清空内容，显示空白
                        const container = document.querySelector('.content-Ick90x');
                        if (container) {
                            container.innerHTML = '';
                            console.log('已清空内容，显示空白');
                        }
                    });
                }
            }
        });
    }, 1000); // 延迟 1 秒等待 DOM 完全加载

    console.log('动态加载脚本执行完毕');
})();
