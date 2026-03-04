// 侧边菜单功能管理（折叠功能）
(function () {
    console.log('初始化菜单折叠功能...');

    // 直接执行，无需等待 DOM 加载（脚本在 body 底部执行）
    initMenu();

    function initMenu() {
        console.log('开始初始化菜单折叠功能');

        // 处理可折叠菜单
        const collapsibleMenus = document.querySelectorAll('.semi-dy-open-navigation-sub-wrap');

        collapsibleMenus.forEach((menu, index) => {
            const title = menu.querySelector('.semi-dy-open-navigation-sub-title');
            const wrapper = menu.querySelector('.semi-dy-open-collapsible-wrapper');
            const icon = menu.querySelector('.semi-dy-open-navigation-item-icon-toggle-right svg');

            if (title && wrapper) {
                // 设置初始状态（默认展开）
                let isExpanded = true;

                // 添加点击事件
                title.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // 切换展开状态
                    isExpanded = !isExpanded;

                    // 更新UI状态
                    if (isExpanded) {
                        // 展开动画
                        wrapper.style.height = wrapper.scrollHeight + 'px';
                        wrapper.style.opacity = '1';
                        menu.setAttribute('aria-expanded', 'true');

                        // 旋转图标
                        if (icon) {
                            icon.style.transform = 'rotate(180deg)';
                        }
                    } else {
                        // 折叠动画
                        wrapper.style.height = '0px';
                        wrapper.style.opacity = '0';
                        menu.setAttribute('aria-expanded', 'false');

                        // 旋转图标
                        if (icon) {
                            icon.style.transform = 'rotate(0deg)';
                        }
                    }

                    console.log(`菜单 ${index} 状态: ${isExpanded ? '展开' : '折叠'}`);
                });

                // 初始化图标状态
                if (icon) {
                    icon.style.transition = 'transform 0.3s ease';
                    icon.style.transform = 'rotate(180deg)'; // 默认展开状态
                }
            }
        });

        console.log(`已初始化 ${collapsibleMenus.length} 个可折叠菜单`);
    }
})();