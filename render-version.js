// 动态渲染版本管理页面的 JavaScript 文件
(function () {
    console.log('开始加载版本数据...');

    // 加载 version.json 并渲染
    function loadAndRenderVersionData() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './version.json', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    const versionData = JSON.parse(xhr.responseText);
                    console.log('✅ 版本数据加载成功');
                    console.log(versionData);

                    // 渲染线上版本
                    renderOnlineVersion(versionData.online);

                    // 渲染审核版本
                    renderAuditVersions(versionData.audit);

                    // 渲染测试版本
                    renderTestVersions(versionData.test);

                } catch (e) {
                    console.error('❌ JSON 解析失败:', e);
                }
            } else {
                console.error('❌ 加载版本数据失败:', xhr.status);
            }
        };
        xhr.onerror = function () {
            console.error('❌ 网络错误');
        };
        xhr.send();
    }

    // 渲染线上版本（单个）
    function renderOnlineVersion(online) {
        if (!online) {
            console.warn('无线上版本数据');
            return;
        }

        console.log('渲染线上版本:', online);

        // 更新版本号
        const versionEl = document.querySelector('.version-number-text');
        console.log('🔍 查找版本号元素 .version-number-text:', versionEl);
        if (versionEl) {
            versionEl.textContent = online.version || '';
            console.log('✅ 版本号已更新:', online.version);
        } else {
            console.error('❌ 未找到版本号元素 .version-number-text');
            // 尝试其他选择器
            const allSpans = document.querySelectorAll('span');
            console.log('页面所有 span 数量:', allSpans.length);
            allSpans.forEach((span, i) => {
                if (span.className && span.className.includes('version')) {
                    console.log(`找到带 version 的 span[${i}]:`, span.className, '内容:', span.textContent);
                }
            });
        }

        // 更新时间
        const timeEl = document.querySelector('.version-time-text');
        console.log('🔍 查找时间元素 .version-time-text:', timeEl);
        if (timeEl && online.publishTime) {
            timeEl.textContent = online.publishTime.replace(' ', '\n');
            console.log('✅ 时间已更新:', online.publishTime);
        } else {
            console.error('❌ 未找到时间元素 .version-time-text');
        }

        // 更新备注
        const remarkEl = document.querySelector('.version-remark-text');
        console.log('🔍 查找备注元素 .version-remark-text:', remarkEl);
        if (remarkEl && online.remark) {
            remarkEl.textContent = online.remark || '';
            console.log('✅ 备注已更新:', online.remark);
        } else {
            console.error('❌ 未找到备注元素 .version-remark-text');
        }

        // 更新覆盖 APP
        const appEl = document.querySelector('.version-app-text');
        console.log('🔍 查找覆盖 APP 元素 .version-app-text:', appEl);
        if (appEl && online.coverageApp) {
            appEl.textContent = online.coverageApp || '';
            console.log('✅ 覆盖 APP 已更新:', online.coverageApp);
        } else {
            console.error('❌ 未找到覆盖 APP 元素 .version-app-text');
        }

        // 更新二维码文字
        const qrTexts = document.querySelectorAll('.semi-dy-open-typography-link a span');
        if (qrTexts.length > 0 && online.version) {
            qrTexts[0].textContent = '下载二维码';
            console.log('✅ 二维码文字已更新');
        } else {
            console.warn('未找到二维码元素');
        }

        console.log('✅ 线上版本渲染完成');
    }

    // 渲染审核版本（列表）
    function renderAuditVersions(auditList) {
        console.log('查找审核版本容器...');

        // 使用类名选择器
        const auditContainer = document.querySelector('.version-card:nth-of-type(2)');

        if (!auditContainer) {
            console.warn('未找到审核版本容器 .version-card:nth-of-type(2)');
            return;
        }

        console.log('✅ 找到审核版本容器');

        if (!auditList || auditList.length === 0) {
            console.log('无审核版本数据');
            return;
        }

        console.log('渲染审核版本:', auditList);

        // 取第一个审核版本显示
        const audit = auditList[0];

        // TODO: 如果需要显示审核版本，可以在这里添加渲染逻辑
        // 目前保持"暂无审核版本"的提示
        console.log('✅ 审核版本数据已加载，但页面显示为空');
    }

    // 渲染测试版本（列表）
    function renderTestVersions(testList) {
        if (!testList || testList.length === 0) {
            console.warn('无测试版本数据');
            return;
        }

        console.log('渲染测试版本:', testList);

        // 取第一个测试版本显示
        const test = testList[0];

        // 更新版本号
        const versionEl = document.querySelector('.test-version-number-text');
        console.log('🔍 查找测试版本号元素 .test-version-number-text:', versionEl);
        if (versionEl) {
            versionEl.textContent = test.version || '';
            console.log('✅ 测试版本号已更新:', test.version);
        } else {
            console.error('❌ 未找到测试版本号元素 .test-version-number-text');
        }

        // 更新时间
        const timeEl = document.querySelector('.test-version-time-text');
        console.log('🔍 查找测试版时间元素 .test-version-time-text:', timeEl);
        if (timeEl && test.submitTime) {
            timeEl.textContent = test.submitTime.replace(' ', '\n');
            console.log('✅ 测试版时间已更新:', test.submitTime);
        } else {
            console.error('❌ 未找到测试版时间元素 .test-version-time-text');
        }

        // 更新提交用户
        const userEl = document.querySelector('.test-version-user-text');
        console.log('🔍 查找测试版提交用户元素 .test-version-user-text:', userEl);
        if (userEl && test.submitUser) {
            userEl.textContent = test.submitUser || '';
            console.log('✅ 测试版提交用户已更新:', test.submitUser);
        } else {
            console.error('❌ 未找到测试版提交用户元素 .test-version-user-text');
        }

        // 更新备注
        const remarkEl = document.querySelector('.test-version-remark-text');
        console.log('🔍 查找测试版备注元素 .test-version-remark-text:', remarkEl);
        if (remarkEl && test.remark) {
            remarkEl.textContent = test.remark || '';
            console.log('✅ 测试版备注已更新:', test.remark);
        } else {
            console.error('❌ 未找到测试版备注元素 .test-version-remark-text');
        }

        // 更新二维码文字
        const qrTexts = document.querySelectorAll('.semi-dy-open-typography-link a span');
        if (qrTexts.length > 0 && test.version) {
            qrTexts[0].textContent = '下载二维码';
            console.log('✅ 测试版二维码文字已更新');
        } else {
            console.warn('未找到测试版二维码元素');
        }

        console.log('✅ 测试版本渲染完成');
    }

    // 延迟执行，等待 HTML 加载完成
    setTimeout(() => {
        // 检查是否是版本管理页面
        const versionContainer = document.querySelector('.version-card');
        if (versionContainer) {
            loadAndRenderVersionData();
        } else {
            console.log('⏭️ 非版本管理页面，跳过自动渲染');
        }
    }, 500);

    // 将渲染函数暴露到全局
    window.renderVersionData = loadAndRenderVersionData;

    console.log('版本渲染脚本执行完毕');
})();
