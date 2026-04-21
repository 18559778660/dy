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

    // 用户分析页日期范围选择器
    initUserAnalysisDatePicker();

    // 页面标签切换
    initPageTabs();
})();

// ==================== 全局 APP 筛选（大分类） ====================
// 切换 APP 时，各个 updateXxx 函数通过 getCurrentAppData() 统一读取当前 APP 的数据源
// 默认 'dy'（抖音）——HTML 里 APP 下拉默认显示"抖音"
window._currentAppId = 'dy';
window.getCurrentAppData = function () {
    const overview = (window.chartDataConfig && window.chartDataConfig.overview) || [];
    const appId = window._currentAppId || 'dy';
    const found = overview.find(o => o && o.appId === appId);
    return (found && found.data) || [];
};

// 来源分析 APP 下拉选项（其它页面要用同一份时直接复用这个常量）
const SOURCE_APP_OPTIONS = [
    { value: 'dy', label: '抖音' },
    { value: 'dy_lite', label: '抖音极速版' },
    { value: 'fq', label: '番茄小说' },
    { value: 'toutiao', label: '今日头条' },
    { value: 'toutiao_lite', label: '今日头条极速版' },
    { value: 'dyhs', label: '抖音火山版' },
    { value: 'mmy', label: '摸摸鱼' },
    { value: 'dyhs_old', label: '抖音火山 - 旧版' },
    { value: 'qsyy', label: '汽水音乐' },
    { value: 'dypc', label: '抖音PC' },
    { value: 'hgdj', label: '红果短剧' }
];
window.SOURCE_APP_OPTIONS = SOURCE_APP_OPTIONS;

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
function initTimeRangeButtons(containerSelector = 'body') {
    console.log(`初始化时间范围单选按钮 (容器: ${containerSelector})...`);

    // 在指定容器内查找按钮
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`未找到容器: ${containerSelector}`);
        return;
    }

    // 使用 class 选择器获取时间按钮（可能有2个或3个）
    const timeButtons = container.querySelectorAll('.time-range-yesterday, .time-range-7days, .time-range-30days');

    if (timeButtons.length === 0) {
        console.warn(`在 ${containerSelector} 中未找到时间范围按钮元素`);
        return;
    }

    console.log(`找到 ${timeButtons.length} 个时间范围按钮`);

    // 文案 -> 参数值
    const labelToRange = { '昨天': 'yesterday', '7天': 7, '30天': 30 };

    // 按容器派发的 handler：同一容器下想响应多个组件就在这里累加调用
    // 没列出的容器 = 仅做视觉切换，不触发任何业务更新
    const handlersByContainer = {
        '.user-source-section': (range) => {
            window.updateSourceAnalysisChart && window.updateSourceAnalysisChart(range);
            window.updateSourceSceneTable && window.updateSourceSceneTable(range);
            // 抖音视频数据图/表虽然不在 .user-source-section 容器里，
            // 但在产品层级属于"来源分析页"下，时间维度跟随联动
            window.updateDouyinVideoChart && window.updateDouyinVideoChart(range);
            window.updateDouyinVideoTable && window.updateDouyinVideoTable(range);
        }
    };
    const dispatch = handlersByContainer[containerSelector] || null;

    // 为每个按钮添加点击和 hover 事件
    timeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // 只在当前容器内移除所有时间按钮的选中状态
            container.querySelectorAll('.time-range-yesterday, .time-range-7days, .time-range-30days').forEach(b => {
                b.classList.remove('semi-dy-open-radio-addon-buttonRadio-checked');
            });

            // 添加当前按钮的选中状态
            this.classList.add('semi-dy-open-radio-addon-buttonRadio-checked');
            const label = this.textContent.trim();
            console.log(`[${containerSelector}] 选中时间范围:`, label);

            const range = labelToRange[label];
            if (range !== undefined && dispatch) dispatch(range);
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

    // 获取所有 APP 下拉筛选框（可能有多个）
    const appFilters = document.querySelectorAll('.filter-app');
    const osFilter = document.querySelector('.filter-os');

    if (appFilters.length === 0) {
        console.warn('未找到 APP 筛选框元素');
        return;
    }

    console.log(`找到 ${appFilters.length} 个 APP 筛选框`);

    // 为每个 APP 筛选框创建下拉内容
    appFilters.forEach((appFilter, index) => {
        // 为每个筛选框生成唯一的 dropdownId
        const dropdownId = `semi-dy-open-select-app-${index}`;

        // 复用 SOURCE_APP_OPTIONS（来源分析同一套）+ 前置"全部" + 该页面独有的"皮皮虾"
        createDropdownContent(appFilter, dropdownId, [
            { value: 'all', label: '全部' },
            ...SOURCE_APP_OPTIONS,
            { value: 'ppx', label: '皮皮虾' }
        ]);
    });

    // 为操作系统筛选框创建下拉内容（如果存在）
    if (osFilter) {
        createDropdownContent(osFilter, 'semi-dy-open-select-be2rm31', [
            { value: 'all', label: '全部' },
            { value: 'ios', label: 'ios' },
            { value: 'android', label: 'android' }
        ]);
    }

    // 抖音视频数据-指标下拉（新增用户 / 活跃用户 / 视频转化率）
    const videoMetricFilter = document.querySelector('.filter-video-metric');
    if (videoMetricFilter) {
        createDropdownContent(videoMetricFilter, 'semi-dy-open-select-video-metric', [
            { value: 'newUsers', label: '新增用户' },
            { value: 'activeUsers', label: '活跃用户' },
            { value: 'conversionRate', label: '视频转化率' }
        ]);
    }

    // 来源分析 APP 大分类下拉（切换 APP 时，该 section 下所有图表/表格同步刷新）
    const sourceAppFilter = document.querySelector('.filter-source-app');
    if (sourceAppFilter) {
        createDropdownContent(sourceAppFilter, 'semi-dy-open-select-source-app', SOURCE_APP_OPTIONS);
    }

    // 为每个筛选框添加点击事件
    const allFilters = [...appFilters];
    if (osFilter) {
        allFilters.push(osFilter);
    }
    if (videoMetricFilter) {
        allFilters.push(videoMetricFilter);
    }
    if (sourceAppFilter) {
        allFilters.push(sourceAppFilter);
    }

    allFilters.forEach(filter => {
        filter.addEventListener('click', function (e) {
            e.stopPropagation();

            // 第一次点击时创建下拉框 DOM
            const dropdownId = this._dropdownId;
            const options = this._dropdownOptions;
            if (dropdownId && options) {
                _createDropdownDOM(this, dropdownId, options);

                // 更新 aria-controls 为我们生成的 wrapper ID
                this.setAttribute('aria-controls', dropdownId);

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
                 width: ${rect.width}px;
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
            e.target.closest('.filter-video-metric') ||
            e.target.closest('.filter-source-app') ||
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
                              <div id="${dropdownId}" class="semi-dy-open-select-option-list-wrapper" style="width: 100%;">
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

// 读取 .user-source-section 当前选中的时间范围（'yesterday' | 7 | 30）
function getCurrentSourceTimeRange() {
    const section = document.querySelector('.user-source-section');
    if (!section) return 'yesterday';
    if (section.querySelector('.time-range-yesterday.semi-dy-open-radio-addon-buttonRadio-checked')) return 'yesterday';
    if (section.querySelector('.time-range-30days.semi-dy-open-radio-addon-buttonRadio-checked')) return 30;
    if (section.querySelector('.time-range-7days.semi-dy-open-radio-addon-buttonRadio-checked')) return 7;
    return 'yesterday';
}

// 切换"抖音视频数据"整块（图表 + 汇总表）的可见性，仅抖音 APP 显示
function setDouyinVideoSectionVisible(visible) {
    const section = document.querySelector('.douyin-video-section');
    if (!section) return;
    section.style.display = visible ? '' : 'none';
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

            // 根据 data-tab 标识，触发不同的更新逻辑
            const tabType = triggerElement.getAttribute('data-tab');
            if (tabType === 'video-metric') {
                // 抖音视频数据-指标切换：保持当前时间范围，只换指标
                const range = getCurrentSourceTimeRange();
                console.log('[video-metric] 指标切换:', value, label, '当前时间:', range);
                if (typeof window.updateDouyinVideoChart === 'function') {
                    window.updateDouyinVideoChart(range, value);
                }
            } else if (tabType === 'source-app') {
                // 来源分析 APP 大分类切换：换数据源后，该 section 下所有图表/表格重新渲染
                window._currentAppId = value;
                const range = getCurrentSourceTimeRange();
                console.log('[source-app] APP 切换:', value, label, '当前时间:', range);
                window.updateSourceAnalysisChart && window.updateSourceAnalysisChart(range);
                window.updateSourceSceneTable && window.updateSourceSceneTable(range);
                // 抖音视频数据（图表 + 汇总表）是抖音独有，非抖音 APP 整块隐藏
                setDouyinVideoSectionVisible(value === 'dy');
                if (value === 'dy') {
                    window.updateDouyinVideoChart && window.updateDouyinVideoChart(range);
                    window.updateDouyinVideoTable && window.updateDouyinVideoTable(range);
                }
            } else if (tabType) {
                console.log(`[${tabType}] APP 筛选变更:`, value, label);
                // TODO: 根据 tabType 和 value 更新对应的表格/图表
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

// 用户分析页日期范围选择器（暴露到全局，供页面切换时重新调用）
window.initUserAnalysisDatePicker = initUserAnalysisDatePicker;

function initUserAnalysisDatePicker() {
    console.log('初始化用户分析页日期范围选择器...');

    const trigger = document.querySelector('.semi-dy-open-datepicker-input');
    if (!trigger) {
        console.warn('未找到日期范围触发元素 .semi-dy-open-datepicker-input');
        return;
    }

    if (trigger._datePickerInited) {
        console.log('日期范围选择器已初始化，跳过重复绑定');
        return;
    }
    trigger._datePickerInited = true;

    // 你在 user_analysis.html 里需要自己添加一个 portal：
    // <div id="user-date-range-portal" class="semi-dy-open-portal" style="z-index:1030; display:none">
    //   <!-- 把 text.html 里那整块 dateRange 日历 HTML 粘过来 -->
    // </div>
    const portal = document.getElementById('user-date-range-portal');
    if (!portal) {
        console.warn('未找到日期弹层容器 #user-date-range-portal，请在 HTML 中自行复制 text.html 里的日历 DOM。');
        return;
    }

    const portalInner = portal.querySelector('.semi-dy-open-portal-inner') || portal;

    // 触发器中的显示文本 span（例如 "2026-03-05 ~ 2026-03-05"）
    const triggerContent = trigger.querySelector('.datePicker-tigger-content-LsTspS');
    const dateTextSpan = triggerContent ? triggerContent.querySelector('span') : null;

    function setDateText(startStr, endStr) {
        if (!dateTextSpan) return;
        if (!startStr) return;
        const text = endStr && endStr !== startStr ? `${startStr} ~ ${endStr}` : startStr;
        dateTextSpan.textContent = text;
    }

    function openPortal() {
        const rect = trigger.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        portalInner.style.position = 'absolute';
        portalInner.style.left = `${rect.left + scrollLeft}px`;
        portalInner.style.top = `${rect.bottom + scrollTop + 4}px`;
        portalInner.style.transform = 'translateX(0%) translateY(0%)';

        portal.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');
    }

    function closePortal() {
        portal.style.display = 'none';
        trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closePortal();
        } else {
            openPortal();
        }
    });

    trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                closePortal();
            } else {
                openPortal();
            }
        }
    });

    document.addEventListener('click', function (e) {
        if (e.target.closest('.semi-dy-open-datepicker') || e.target.closest('#user-date-range-portal')) {
            return;
        }
        closePortal();
    });

    // 处理日期选中逻辑（基于 aria-label="YYYY-MM-DD"）
    let rangeStart = null;
    let rangeEnd = null;

    function parseDate(str) {
        // 兼容 YYYY-MM-DD
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d).getTime();
    }

    function resetDaySelection() {
        portal.querySelectorAll('.semi-dy-open-datepicker-day').forEach(day => {
            day.classList.remove(
                'semi-dy-open-datepicker-day-selected-start',
                'semi-dy-open-datepicker-day-selected-end'
            );
        });
    }

    function applyDaySelection() {
        if (!rangeStart) return;

        const startTime = parseDate(rangeStart);
        const endTime = rangeEnd ? parseDate(rangeEnd) : startTime;

        resetDaySelection();

        portal.querySelectorAll('.semi-dy-open-datepicker-day[aria-disabled="false"]').forEach(day => {
            const label = day.getAttribute('aria-label');
            if (!label) return;
            const time = parseDate(label);

            if (time === startTime) {
                day.classList.add('semi-dy-open-datepicker-day-selected-start');
            }
            if (time === endTime) {
                day.classList.add('semi-dy-open-datepicker-day-selected-end');
            }
        });
    }

    const dayCells = portal.querySelectorAll('.semi-dy-open-datepicker-day[aria-disabled="false"]');
    dayCells.forEach(day => {
        day.addEventListener('click', function (e) {
            e.stopPropagation();
            const label = this.getAttribute('aria-label');
            if (!label) return;

            if (!rangeStart || (rangeStart && rangeEnd)) {
                rangeStart = label;
                rangeEnd = null;
            } else {
                const startTime = parseDate(rangeStart);
                const currentTime = parseDate(label);
                if (currentTime < startTime) {
                    rangeEnd = rangeStart;
                    rangeStart = label;
                } else {
                    rangeEnd = label;
                }
            }

            applyDaySelection();

            // 目前按“选好一个范围就关闭面板”处理；如果只想单选，可以只用 rangeStart
            if (rangeStart && rangeEnd) {
                setDateText(rangeStart, rangeEnd);
                closePortal();
            } else {
                setDateText(rangeStart, rangeStart);
            }
        });
    });

    console.log('✅ 用户分析页日期范围选择器初始化完成');
}

// 初始化页面标签切换（行为分析、实时分析等）
window.initPageTabs = initPageTabs;

function initPageTabs() {
    console.log('初始化页面标签切换...');

    // 获取所有标签页
    const tabs = document.querySelectorAll('[role="tab"]');

    if (!tabs || tabs.length === 0) {
        console.warn('未找到标签页元素');
        return;
    }

    // 为每个标签添加点击事件
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
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
            });

            // 显示当前选中的面板
            const activePanel = document.getElementById(panelId);
            if (activePanel) {
                activePanel.style.display = 'block';
                activePanel.setAttribute('aria-hidden', 'false');
                console.log('显示面板:', panelId);
            }

            console.log('选中标签:', this.textContent.trim());
        });
    });

    console.log('✅ 页面标签切换初始化完成');
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
