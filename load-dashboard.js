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
                }
            }
        };
        xhr.send();
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
