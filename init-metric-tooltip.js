// 指标卡片 Tooltip 交互功能
(function () {
    console.log('开始初始化指标卡片 tooltip...');

    // 将初始化函数暴露到全局作用域，供页面切换时重新调用
    window.initMetricTooltip = initMetricTooltip;

    function initMetricTooltip() {
        // 查找所有指标卡片
        const cards = document.querySelectorAll('.omg-metric-card.omg-metric-card-checkable');
        console.log('找到指标卡片数量:', cards.length);

        cards.forEach(card => {
            // 查找卡片内的 tooltip 触发元素
            const tooltipElement = card.querySelector('.omg-metric-card-solid-title-tooltip[data-tooltip]');
            if (!tooltipElement) return;

            const tooltipText = tooltipElement.getAttribute('data-tooltip');
            const metricTitle = tooltipElement.textContent.trim();

            // 给整个卡片添加点击事件处理选中状态和切换图表
            card.addEventListener('click', function (e) {
                e.stopPropagation();

                // 移除其他卡片的选中状态
                document.querySelectorAll('.omg-metric-card.omg-metric-card-bordered-checked').forEach(c => {
                    c.classList.remove('omg-metric-card-bordered-checked');
                });

                // 添加当前卡片的选中状态
                this.classList.add('omg-metric-card-bordered-checked');

                console.log('选中卡片:', metricTitle);

                // 切换图表数据
                switchChartMetric(metricTitle);
            });

            // hover 事件仍然绑定在 tooltip 元素上
            tooltipElement.addEventListener('mouseenter', function (e) {
                if (!tooltipText) return;

                // 先移除旧的 tooltip
                const oldTooltip = document.getElementById('metric-tooltip');
                if (oldTooltip) {
                    oldTooltip.remove();
                }

                // 创建 tooltip 元素
                const tooltip = document.createElement('div');
                tooltip.className = 'semi-dy-open-portal';
                tooltip.style.zIndex = '1060';
                tooltip.id = 'metric-tooltip';

                const rect = this.getBoundingClientRect();

                tooltip.innerHTML = `
                    <div class="semi-dy-open-portal-inner" 
                        style="left: ${rect.left + rect.width / 2}px; top: ${rect.top}px; transform: translateX(-50%) translateY(-100%);">
                        <div class="semi-dy-open-tooltip-wrapper semi-dy-open-tooltip-wrapper-show semi-dy-open-tooltip-with-arrow" 
                            role="tooltip" x-placement="top">
                            <div class="semi-dy-open-tooltip-content">${tooltipText}</div>
                            <svg aria-hidden="true" class="semi-dy-open-tooltip-icon-arrow" width="24" height="7" viewBox="0 0 24 7" 
                                fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="fill: currentcolor;">
                                <path d="M12 7L0 0h24L12 7z"/>
                            </svg>
                        </div>
                    </div>
                `;

                document.body.appendChild(tooltip);
                console.log('显示 tooltip:', tooltipText);
            });

            tooltipElement.addEventListener('mouseleave', function () {
                const tooltip = document.getElementById('metric-tooltip');
                if (tooltip) {
                    tooltip.remove();
                    console.log('移除 tooltip');
                }
            });
        });
    }

    // 页面加载完成后自动初始化
    initMetricTooltip();

    // Banner 关闭功能
    initBannerClose();

    // 单选按钮切换功能
    initRadioButtons();
})();

// Banner 关闭函数（暴露到全局供页面切换时调用）
window.initBannerClose = initBannerClose;

// 单选按钮切换函数（暴露到全局供页面切换时调用）
window.initRadioButtons = initRadioButtons;

// 初始化单选按钮切换功能
function initRadioButtons() {
    console.log('初始化单选按钮切换...');

    // 获取两个单选按钮
    const onlineBtn = document.getElementById('addon-rsawkrs');
    const grayBtn = document.getElementById('addon-a1167zc');

    if (!onlineBtn || !grayBtn) {
        console.warn('未找到单选按钮元素');
        return;
    }

    // 点击“线上版本”
    onlineBtn.addEventListener('click', function () {
        // 移除另一个按钮的选中状态
        grayBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
        // 添加当前按钮的选中状态
        onlineBtn.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
        console.log('选中：线上版本');
    });

    // 点击“灰度版本”
    grayBtn.addEventListener('click', function () {
        // 移除另一个按钮的选中状态
        onlineBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
        // 添加当前按钮的选中状态
        grayBtn.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
        console.log('选中：灰度版本');
    });

    console.log('✅ 单选按钮切换初始化完成');
}

function initBannerClose() {
    console.log('初始化 Banner 关闭功能...');
    const closeBtn = document.getElementById('close-banner-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            const banner = this.closest('.semi-dy-open-banner');
            if (banner) {
                banner.remove();
                console.log('Banner 已关闭');
            }
        });
        console.log('✅ Banner 关闭功能已绑定');
    } else {
        console.log('⚠️ 未找到 Banner 关闭按钮');
    }
}

// 切换图表指标函数（暴露到全局）
window.switchChartMetric = switchChartMetric;

function switchChartMetric(metricTitle) {
    console.log('切换图表指标:', metricTitle);

    // 调用 init-chart.js 中的切换函数
    if (typeof window.updateChartMetric === 'function') {
        window.updateChartMetric(metricTitle);
    }
}
