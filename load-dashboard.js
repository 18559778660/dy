// 动态加载内容的JavaScript文件
(function () {
    console.log('开始动态加载内容...');

    // 加载仪表板内容
    const dashboardXhr = new XMLHttpRequest();
    dashboardXhr.open('GET', './dashboard-content.html', true);
    dashboardXhr.onload = function () {
        if (dashboardXhr.status === 200) {
            const container = document.querySelector('.content-Ick90x');
            if (container) {
                container.innerHTML = dashboardXhr.responseText;
                console.log('仪表板内容加载完成');
            }
        }
    };
    dashboardXhr.send();

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

    console.log('动态加载脚本执行完毕');
})();
