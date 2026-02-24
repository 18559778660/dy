// 侧边菜单功能管理（折叠 + 选中状态）
(function () {
    console.log('初始化菜单功能...');

    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu);
    } else {
        initMenu();
    }

    function initMenu() {
        console.log('DOM已准备就绪，开始初始化菜单');

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

        // 处理所有菜单项的选中状态
        const allMenuItems = document.querySelectorAll('.semi-dy-open-navigation-item');

        allMenuItems.forEach(item => {
            item.addEventListener('click', function (e) {
                // 阻止事件冒泡到父级菜单
                e.stopPropagation();

                // 获取菜单项文本
                const itemName = this.querySelector('.semi-dy-open-navigation-item-text')?.textContent || '未知';

                // 移除所有其他项的选中状态
                allMenuItems.forEach(otherItem => {
                    otherItem.classList.remove('semi-dy-open-navigation-item-selected');
                });

                // 为当前项添加选中状态
                this.classList.add('semi-dy-open-navigation-item-selected');

                // 根据选中项控制仪表板内容显示
                const dashboardContent = document.querySelector('.w-full.h-full');
                if (itemName === '总览' && dashboardContent) {
                    // 显示仪表板内容
                    dashboardContent.style.display = 'block';
                    console.log('显示仪表板内容');
                } else if (dashboardContent) {
                    // 隐藏仪表板内容，显示空白
                    dashboardContent.style.display = 'none';
                    console.log('隐藏仪表板内容，当前选中:', itemName);
                }

                console.log('选中菜单项:', itemName);
            });
        });

        console.log(`已初始化 ${collapsibleMenus.length} 个可折叠菜单，${allMenuItems.length} 个菜单项`);
    }
})();