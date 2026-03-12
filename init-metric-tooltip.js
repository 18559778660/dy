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

    // 使用 class 选择器获取两个单选按钮
    const onlineBtn = document.querySelector('.version-online');
    const grayBtn = document.querySelector('.version-gray');

    if (!onlineBtn || !grayBtn) {
        console.warn('未找到单选按钮元素');
        return;
    }

    // 点击"线上版本"
    onlineBtn.addEventListener('click', function () {
        // 移除另一个按钮的选中状态
        grayBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
        // 添加当前按钮的选中状态
        onlineBtn.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
        console.log('选中：线上版本');
    });

    // hover 效果 - 线上版本
    onlineBtn.addEventListener('mouseenter', function () {
        if (!this.classList.contains('semi-dy-open-radio-addon-buttonRadio-checked')) {
            this.classList.add('semi-dy-open-radio-addon-buttonRadio-hover');
        }
    });

    onlineBtn.addEventListener('mouseleave', function () {
        this.classList.remove('semi-dy-open-radio-addon-buttonRadio-hover');
    });

    // 点击"灰度版本"
    grayBtn.addEventListener('click', function () {
        // 移除另一个按钮的选中状态
        onlineBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
        // 添加当前按钮的选中状态
        grayBtn.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
        console.log('选中：灰度版本');
    });

    // hover 效果 - 灰度版本
    grayBtn.addEventListener('mouseenter', function () {
        if (!this.classList.contains('semi-dy-open-radio-addon-buttonRadio-checked')) {
            this.classList.add('semi-dy-open-radio-addon-buttonRadio-hover');
        }
    });

    grayBtn.addEventListener('mouseleave', function () {
        this.classList.remove('semi-dy-open-radio-addon-buttonRadio-hover');
    });

    console.log('✅ 单选按钮切换初始化完成');
}

// 初始化时间范围单选按钮
function initTimeRangeButtons() {
    console.log('初始化时间范围单选按钮...');

    // 使用 class 选择器获取三个时间按钮
    const yesterdayBtn = document.querySelector('.time-range-yesterday');
    const sevenDaysBtn = document.querySelector('.time-range-7days');
    const thirtyDaysBtn = document.querySelector('.time-range-30days');

    if (!yesterdayBtn || !sevenDaysBtn || !thirtyDaysBtn) {
        console.warn('未找到时间范围按钮元素');
        return;
    }

    // 为每个按钮添加点击和 hover 事件
    [yesterdayBtn, sevenDaysBtn, thirtyDaysBtn].forEach(btn => {
        btn.addEventListener('click', function () {
            // 移除所有按钮的选中状态
            yesterdayBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
            sevenDaysBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
            thirtyDaysBtn.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');

            // 添加当前按钮的选中状态
            this.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
            console.log('选中时间范围:', this.textContent.trim());
        });

        // hover 效果
        btn.addEventListener('mouseenter', function () {
            if (!this.classList.contains('semi-dy-open-radio-addon-buttonRadio-checked')) {
                this.classList.add('semi-dy-open-radio-addon-buttonRadio-hover');
            }
        });

        btn.addEventListener('mouseleave', function () {
            this.classList.remove('semi-dy-open-radio-addon-buttonRadio-hover');
        });
    });

    console.log('✅ 时间范围单选按钮初始化完成');
}

// 暴露到全局
window.initTimeRangeButtons = initTimeRangeButtons;

// 初始化下拉筛选框（APP 和操作系统）
window.initDropdownFilters = initDropdownFilters;

function initDropdownFilters() {
    console.log('初始化下拉筛选框...');

    // 获取所有下拉筛选框（使用固定 class）
    const appFilter = document.querySelector('.filter-app');
    const osFilter = document.querySelector('.filter-os');

    if (!appFilter || !osFilter) {
        console.warn('未找到筛选框元素');
        return;
    }

    // 为 APP 筛选框创建下拉内容
    createDropdownContent(appFilter, 'semi-dy-open-select-i3zfxt5', [
        { value: 'all', label: '全部' },
        { value: 'dy', label: '抖音' },
        { value: 'dy_lite', label: '抖音lite' },
        { value: 'fq', label: '番茄小说' },
        { value: 'toutiao', label: '今日头条' },
        { value: 'toutiao_lite', label: '今日头条lite' },
        { value: 'dyhs', label: '抖音火山 - 新版' },
        { value: 'ppx', label: '皮皮虾' },
        { value: 'mmy', label: '摸摸鱼' },
        { value: 'dyhs_old', label: '抖音火山 - 旧版' },
        { value: 'hgdj', label: '红果短剧' },
        { value: 'dypc', label: '抖音PC' }
    ]);

    // 为操作系统筛选框创建下拉内容
    createDropdownContent(osFilter, 'semi-dy-open-select-be2rm31', [
        { value: 'all', label: '全部' },
        { value: 'ios', label: 'ios' },
        { value: 'android', label: 'android' }
    ]);

    // 为每个筛选框添加点击事件
    [appFilter, osFilter].forEach(filter => {
        filter.addEventListener('click', function (e) {
            e.stopPropagation();

            // 第一次点击时创建下拉框 DOM
            const dropdownId = this._dropdownId;
            const options = this._dropdownOptions;
            if (dropdownId && options) {
                _createDropdownDOM(this, dropdownId, options);

                // 绑定选项的点击和 hover 事件（只绑定一次）
                if (!this._eventBound) {
                    bindDropdownEvents(this, dropdownId);
                    this._eventBound = true;
                }
            }

            // 切换展开状态
            const isExpanded = this.getAttribute('aria-expanded') === 'true';

            // 关闭其他已打开的下拉菜单
            document.querySelectorAll('[aria-expanded="true"]').forEach(open => {
                if (open !== this) {
                    open.setAttribute('aria-expanded', 'false');
                    const controlsId = open.getAttribute('aria-controls');
                    if (controlsId) {
                        const wrapper = document.getElementById(`${controlsId}-wrapper`);
                        if (wrapper) {
                            wrapper.style.display = 'none';
                        }
                    }
                }
            });

            // 切换当前下拉菜单
            this.setAttribute('aria-expanded', !isExpanded);
            const wrapper = document.getElementById(`${dropdownId}-wrapper`);
            if (wrapper) {
                if (isExpanded) {
                    wrapper.style.display = 'none';
                } else {
                    const rect = this.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                    wrapper.style.cssText = `
                 position: absolute;
                 left: ${rect.left + scrollLeft}px;
                 top: ${rect.bottom + scrollTop + 4}px;
                 transform: translateX(0%) translateY(0%);
                 z-index: 1030;
                 display: block !important;
             `;
                }
            }

            console.log('切换下拉菜单:', this.className, !isExpanded);
        });
    });

    // 点击其他地方关闭所有下拉菜单
    document.addEventListener('click', function (e) {
        // 如果点击的是筛选框或时间按钮，不关闭
        if (e.target.closest('.filter-app') ||
            e.target.closest('.filter-os') ||
            e.target.closest('.time-range-yesterday') ||
            e.target.closest('.time-range-7days') ||
            e.target.closest('.time-range-30days')) {
            return;
        }

        document.querySelectorAll('[aria-expanded="true"]').forEach(open => {
            open.setAttribute('aria-expanded', 'false');
            const controlsId = open.getAttribute('aria-controls');
            if (controlsId) {
                const wrapper = document.getElementById(`${controlsId}-wrapper`);
                if (wrapper) {
                    wrapper.style.display = 'none';
                }
            }
        });
    });

    console.log('✅ 下拉筛选框初始化完成');
}

// 创建下拉内容
window.createDropdownContent = createDropdownContent;

function createDropdownContent(triggerElement, dropdownId, options) {
    // 不立即创建，而是存储在 triggerElement 上，等第一次点击时再创建
    triggerElement._dropdownOptions = options;
    triggerElement._dropdownId = dropdownId;
}

// 实际创建下拉框 DOM（延迟到第一次点击时）
function _createDropdownDOM(triggerElement, dropdownId, options) {
    // 查找是否已存在下拉容器
    let portal = document.getElementById(`${dropdownId}-portal`);

    if (!portal) {
        // 创建完整的下拉容器结构（仿照官方 HTML）
        portal = document.createElement('div');
        portal.id = `${dropdownId}-portal`;
        portal.className = 'semi-dy-open-portal';
        portal.style.zIndex = '1030';

        portal.innerHTML = `
          <div tabindex="-1" class="semi-dy-open-portal-inner" id="${dropdownId}-wrapper" style="display: none;">
              <div class="semi-dy-open-popover-wrapper semi-dy-open-popover-wrapper-show" role="dialog" x-placement="bottomLeft">
                  <div class="semi-dy-open-tooltip-content">
                      <div class="semi-dy-open-popover">
                          <div class="semi-dy-open-popover-content">
                              <div id="${dropdownId}" class="semi-dy-open-select-option-list-wrapper" style="min-width: 200px;">
                                  <div class="semi-dy-open-select-option-list semi-dy-open-select-option-list-chosen" role="listbox" aria-multiselectable="false" style="max-height: 270px;">
                                      ${generateOptionsHTML(options)}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      `;

        // 添加到 body
        document.body.appendChild(portal);
    }

    return document.getElementById(dropdownId);
}

// 生成选项 HTML（仿照官方结构）
function generateOptionsHTML(options) {
    return options.map((option, index) => {
        const isSelected = index === 0; // 第一个选项默认选中
        const selectedClass = isSelected ? 'semi-dy-open-select-option-selected' : '';
        const focusedClass = isSelected ? 'semi-dy-open-select-option-focused' : ''; // 第一个选项同时是聚焦状态
        const ariaSelected = isSelected ? 'true' : 'false';

        return `
            <div class="semi-dy-open-select-option ${selectedClass} ${focusedClass}" 
                 role="option" 
                 data-value="${option.value}"
                 aria-selected="${ariaSelected}" 
                 aria-disabled="false">
                <div class="semi-dy-open-select-option-icon">
                    <span role="img" aria-label="tick" class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-tick">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3516 4.2652C22.0336 4.73552 22.2052 5.66964 21.7348 6.35162L11.7348 20.8516C11.4765 21.2262 11.0622 21.4632 10.6084 21.4961C10.1546 21.529 9.71041 21.3541 9.40082 21.0207L2.90082 14.0207C2.33711 13.4136 2.37226 12.4645 2.97933 11.9008C3.5864 11.3371 4.53549 11.3723 5.0992 11.9793L10.3268 17.6091L19.2652 4.64842C19.7355 3.96644 20.6696 3.79487 21.3516 4.2652Z" fill="currentColor"></path>
                        </svg>
                    </span>
                </div>
                <div class="semi-dy-open-select-option-text">${option.label}</div>
            </div>
        `;
    }).join('');
}

// 绑定下拉框选项的事件（点击选中、hover 效果）
function bindDropdownEvents(triggerElement, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // 为每个选项添加点击事件
    dropdown.querySelectorAll('.semi-dy-open-select-option').forEach((option) => {
        option.addEventListener('click', function (e) {
            e.stopPropagation();
            const value = this.getAttribute('data-value');
            const label = this.querySelector('.semi-dy-open-select-option-text')?.textContent.trim() || '';

            console.log('选中选项:', value, label);

            // 移除所有选项的选中状态
            dropdown.querySelectorAll('.semi-dy-open-select-option-selected').forEach(opt => {
                opt.classList.remove('semi-dy-open-select-option-selected');
                opt.setAttribute('aria-selected', 'false');
            });

            // 添加当前选项的选中状态
            this.classList.add('semi-dy-open-select-option-selected');
            this.setAttribute('aria-selected', 'true');

            // 更新触发器的显示文本
            const selectionText = triggerElement.querySelector('.semi-dy-open-select-selection-text');
            if (selectionText) {
                selectionText.textContent = label;
            }

            // 关闭下拉菜单
            triggerElement.setAttribute('aria-expanded', 'false');
            const wrapper = document.getElementById(`${dropdownId}-wrapper`);
            if (wrapper) {
                wrapper.style.display = 'none';
            }
        });

        // hover 效果
        option.addEventListener('mouseenter', function () {
            dropdown.querySelectorAll('.semi-dy-open-select-option-focused').forEach(opt => {
                opt.classList.remove('semi-dy-open-select-option-focused');
            });
            this.classList.add('semi-dy-open-select-option-focused');
        });

        option.addEventListener('mouseleave', function () {
            this.classList.remove('semi-dy-open-select-option-focused');
        });
    });
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

    // 根据当前页面的 DOM 元素判断是哪个页面
    const userAnalysisContainer = document.getElementById('visactor_window_user');

    if (userAnalysisContainer && typeof window.updateUserAnalysisChartMetric === 'function') {
        // 用户分析页 - 存在 visactor_window_user 容器
        console.log('[用户分析页] 切换图表');
        window.updateUserAnalysisChartMetric(metricTitle);
    } else if (typeof window.updateChartMetric === 'function') {
        // 首页 - 使用默认的 updateChartMetric
        console.log('[首页] 切换图表');
        window.updateChartMetric(metricTitle);
    }
}
