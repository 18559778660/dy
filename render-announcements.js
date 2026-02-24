// 公告内容动态渲染脚本
(function () {
    console.log('开始加载公告数据...');

    // 确保DOM加载完成后再执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('DOM已准备就绪，开始初始化公告渲染');

        // 加载JSON数据
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './announcements.json', true);
        xhr.onload = function () {
            console.log('公告数据请求完成，状态码:', xhr.status);
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    console.log('解析到公告数据:', data.announcements.length, '条');
                    renderAnnouncements(data.announcements);
                } catch (e) {
                    console.error('JSON解析错误:', e);
                }
            } else {
                console.error('加载公告数据失败，状态码:', xhr.status);
            }
        };
        xhr.onerror = function () {
            console.error('网络请求公告数据出错');
        };
        xhr.send();
    }

    // 渲染公告函数
    function renderAnnouncements(announcements) {
        console.log('开始渲染公告，数量:', announcements.length);

        // 查找公告容器
        const container = document.querySelector('[data-announcement-container]');
        console.log('找到公告容器:', !!container);

        if (!container) {
            console.error('未找到公告容器 [data-announcement-container]');
            return;
        }

        // 清空现有内容
        container.innerHTML = '';

        // 生成公告HTML
        announcements.forEach((item, index) => {
            const announcementHTML = `
                <div class="flex flex-row justify-between items-center mt-4 cursor-pointer group">
                    <div class="flex flex-row items-center">
                        <div class="flex flex-row items-center" style="max-width: 219px;">
                            <div aria-label="Tag: ${item.tag}"
                                class="semi-dy-open-tag semi-dy-open-tag-default semi-dy-open-tag-square semi-dy-open-tag-light semi-dy-open-tag-white-light mr-2 shrink-0">
                                <div class="semi-dy-open-tag-content semi-dy-open-tag-content-ellipsis">
                                    ${item.tag}</div>
                            </div>
                            ${item.hasBadge ?
                    `<span class="semi-dy-open-badge mr-2 shrink-0"><span
                                    class="semi-dy-open-badge-danger semi-dy-open-badge-solid semi-dy-open-badge-block semi-dy-open-badge-dot"
                                    x-semi-prop="count"></span></span>` : ''
                }
                            <div class="text-sm truncate text-text-0 group-hover:text-semi-color-link min-w-0 flex-1">
                                <span>${item.title}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-sm text-text-2">${item.date}</div>
                </div>
            `;
            container.innerHTML += announcementHTML;
            console.log(`渲染第${index + 1}条公告:`, item.title);
        });

        console.log('公告渲染完成，总共渲染:', announcements.length, '条');
    }
})();