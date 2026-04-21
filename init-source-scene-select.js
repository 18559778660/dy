/**
 * 来源分析 - 场景多选下拉
 *
 * 当前：纯 UI，不联动图表/表格
 *  1. 下拉选项 = 当前 APP douyinSourceScenes 中出现过的所有场景（按 sceneId 去重）
 *  2. 默认选中 = 与图表初始渲染同一口径：
 *       · 昨天那天的数据
 *       · 套用 yesterday 场景白名单
 *       · 按 dailyUsers 降序取前 TOP_N (=7)
 *     兜底：若昨天没数据，则对全部日期按 sceneId 聚合 dailyUsers 后降序取前 7
 *  3. 选中项以 closable tag 形式渲染；点 X 取消单个；点击外层打开下拉面板；面板内勾选切换
 *
 * 选中状态：window._sourceSceneSelected = Set<sceneId>
 */
(function () {
    'use strict';

    const TOP_N = 7;         // 默认选中 & 最大可选数量
    const VISIBLE_TAGS = 2;  // 框内最多显示多少个 tag，其余折叠为 +N

    // ------- 状态 -------
    window._sourceSceneSelected = window._sourceSceneSelected || new Set();
    window._sourceSceneAll = window._sourceSceneAll || []; // [{ sceneId, sceneName }]

    // ------- 工具 -------

    function getAppData() {
        return (typeof window.getCurrentAppData === 'function') ? window.getCurrentAppData() : [];
    }

    // 当前 APP 所有出现过的场景（sceneId 去重）
    function collectAllScenes() {
        const map = new Map();
        getAppData().forEach(day => {
            (day.douyinSourceScenes || []).forEach(s => {
                if (!map.has(s.sceneId)) {
                    map.set(s.sceneId, { sceneId: s.sceneId, sceneName: s.sceneName });
                }
            });
        });
        return Array.from(map.values());
    }

    // 计算默认选中的 Top N（与图表初始 seriesOrder 同口径）
    function calcDefaultTopN() {
        const all = getAppData();

        // 优先：昨天 + 昨天白名单
        const now = new Date();
        now.setDate(now.getDate() - 1);
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const yesterdayStr = `${y}-${m}-${d}`;
        const yesterdayDay = all.find(x => x.date === yesterdayStr);
        const whitelist = (typeof window.getSourceSceneWhitelist === 'function')
            ? window.getSourceSceneWhitelist('yesterday')
            : null;

        if (yesterdayDay && Array.isArray(yesterdayDay.douyinSourceScenes)) {
            const scenes = whitelist
                ? yesterdayDay.douyinSourceScenes.filter(s => whitelist.has(s.sceneId))
                : yesterdayDay.douyinSourceScenes;
            if (scenes.length > 0) {
                return scenes.slice().sort((a, b) => (b.dailyUsers || 0) - (a.dailyUsers || 0))
                    .slice(0, TOP_N).map(s => s.sceneId);
            }
        }

        // 兜底：跨所有日期聚合 dailyUsers 降序
        const sumMap = new Map();
        all.forEach(day => (day.douyinSourceScenes || []).forEach(s => {
            sumMap.set(s.sceneId, (sumMap.get(s.sceneId) || 0) + (s.dailyUsers || 0));
        }));
        return Array.from(sumMap.entries()).sort((a, b) => b[1] - a[1])
            .slice(0, TOP_N).map(([k]) => k);
    }

    // ------- tag 渲染 -------

    function createTagNode(scene) {
        const item = document.createElement('div');
        item.className = 'semi-dy-open-overflow-list-item';

        const tag = document.createElement('div');
        tag.setAttribute('aria-label', 'Closable Tag: ' + scene.sceneName);
        tag.setAttribute('tabindex', '0');
        tag.setAttribute('role', 'button');
        tag.className = 'semi-dy-open-tag semi-dy-open-tag-large semi-dy-open-tag-square '
            + 'semi-dy-open-tag-light semi-dy-open-tag-white-light semi-dy-open-tag-closable';
        tag.style.maxWidth = '100%';
        tag.dataset.sceneId = scene.sceneId;

        const content = document.createElement('div');
        content.className = 'semi-dy-open-tag-content semi-dy-open-tag-content-ellipsis';
        content.style.cssText = 'max-width: 6em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        content.textContent = scene.sceneName;
        tag.appendChild(content);

        const close = document.createElement('div');
        close.className = 'semi-dy-open-tag-close';
        close.innerHTML = ''
            + '<span role="img" aria-label="close" '
            + 'class="semi-dy-open-icon semi-dy-open-icon-small semi-dy-open-icon-close">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
            + 'width="1em" height="1em" focusable="false" aria-hidden="true">'
            + '<path d="M17.6568 19.7782C18.2426 20.3639 19.1924 20.3639 19.7782 19.7782C20.3639 19.1924 '
            + '20.3639 18.2426 19.7782 17.6568L14.1213 12L19.7782 6.34313C20.3639 5.75734 20.3639 4.8076 '
            + '19.7782 4.22181C19.1924 3.63602 18.2426 3.63602 17.6568 4.22181L12 9.87866L6.34313 '
            + '4.22181C5.75734 3.63602 4.8076 3.63602 4.22181 4.22181C3.63602 4.8076 3.63602 5.75734 '
            + '4.22181 6.34313L9.87866 12L4.22181 17.6568C3.63602 18.2426 3.63602 19.1924 4.22181 '
            + '19.7782C4.8076 20.3639 5.75734 20.3639 6.34313 19.7782L12 14.1213L17.6568 19.7782Z" '
            + 'fill="currentColor"></path></svg></span>';
        close.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleScene(scene.sceneId, false);
        });
        tag.appendChild(close);

        item.appendChild(tag);
        return item;
    }

    // 折叠 tag "+N"（按官方 HTML 复用同套 Semi 类名，灰色样式）
    function renderCollapseTag(collapseEl, overflow) {
        if (!collapseEl) return;
        if (overflow <= 0) {
            collapseEl.style.display = 'none';
            collapseEl.innerHTML = '';
            return;
        }
        collapseEl.className = 'source-scene-tag-collapse semi-dy-open-tag semi-dy-open-tag-large '
            + 'semi-dy-open-tag-square semi-dy-open-tag-light semi-dy-open-tag-grey-light '
            + 'semi-dy-open-select-content-wrapper-collapse-tag';
        collapseEl.setAttribute('aria-label', '');
        collapseEl.style.cssText = 'margin-right: 0px; flex-shrink: 0;';
        collapseEl.innerHTML = '<div class="semi-dy-open-tag-content semi-dy-open-tag-content-center">+'
            + overflow + '</div>';
    }

    function renderTags() {
        const listEl = document.querySelector('.source-scene-tag-list');
        const collapseEl = document.querySelector('.source-scene-tag-collapse');
        if (!listEl) return;
        listEl.innerHTML = '';
        const selected = window._sourceSceneSelected;
        // 按 _sourceSceneAll 的顺序找出已选项，再截前 N 个渲染成 tag
        const selectedList = window._sourceSceneAll.filter(s => selected.has(s.sceneId));
        selectedList.slice(0, VISIBLE_TAGS).forEach(scene => {
            listEl.appendChild(createTagNode(scene));
        });
        renderCollapseTag(collapseEl, selectedList.length - VISIBLE_TAGS);
    }

    // ------- 面板（下拉） -------

    let panelEl = null;

    function getTrigger() {
        return document.querySelector('.filter-source-scene');
    }

    // 选中 tick svg（Semi 官方样式）
    const TICK_SVG = ''
        + '<span role="img" aria-label="tick" '
        + 'class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-tick">'
        + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
        + 'width="1em" height="1em" focusable="false" aria-hidden="true">'
        + '<path fill-rule="evenodd" clip-rule="evenodd" '
        + 'd="M21.3516 4.2652C22.0336 4.73552 22.2052 5.66964 21.7348 6.35162L11.7348 '
        + '20.8516C11.4765 21.2262 11.0622 21.4632 10.6084 21.4961C10.1546 21.529 9.71041 '
        + '21.3541 9.40082 21.0207L2.90082 14.0207C2.33711 13.4136 2.37226 12.4645 2.97933 '
        + '11.9008C3.5864 11.3371 4.53549 11.3723 5.0992 11.9793L10.3268 17.6091L19.2652 '
        + '4.64842C19.7355 3.96644 20.6696 3.79487 21.3516 4.2652Z" fill="currentColor">'
        + '</path></svg></span>';

    function buildPanel() {
        // 复用 Semi 原生 option-list 的类名，仅额外加浮层定位 & 自定义 class 以便外部点击白名单识别
        const panel = document.createElement('div');
        panel.className = 'source-scene-panel semi-dy-open-select-option-list semi-dy-open-select-option-list-chosen';
        panel.setAttribute('role', 'listbox');
        panel.setAttribute('aria-multiselectable', 'true');
        panel.style.cssText = [
            'position: absolute',
            'z-index: 1100',
            'background: #fff',
            'border: 1px solid rgba(28,31,35,0.08)',
            'box-shadow: 0 4px 14px rgba(0,0,0,0.08)',
            'border-radius: 4px',
            'max-height: 270px',
            'overflow-y: auto'
        ].join(';');
        panel.addEventListener('mousedown', e => e.stopPropagation());
        return panel;
    }

    function renderPanelOptions() {
        if (!panelEl) return;
        panelEl.innerHTML = '';
        const selected = window._sourceSceneSelected;

        window._sourceSceneAll.forEach((scene, idx) => {
            const isSel = selected.has(scene.sceneId);

            const opt = document.createElement('div');
            opt.className = 'semi-dy-open-select-option'
                + (isSel ? ' semi-dy-open-select-option-selected' : '');
            opt.setAttribute('role', 'option');
            opt.setAttribute('aria-selected', isSel ? 'true' : 'false');
            opt.setAttribute('aria-disabled', 'false');
            opt.id = 'source-scene-option-' + idx;
            opt.dataset.sceneId = scene.sceneId;

            // Semi 原生结构：.option-icon（有/无 tick）+ .option-text
            const iconWrap = document.createElement('div');
            iconWrap.className = 'semi-dy-open-select-option-icon';
            if (isSel) iconWrap.innerHTML = TICK_SVG;

            const textWrap = document.createElement('div');
            textWrap.className = 'semi-dy-open-select-option-text';
            textWrap.textContent = scene.sceneName;

            opt.appendChild(iconWrap);
            opt.appendChild(textWrap);
            opt.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleScene(scene.sceneId, !selected.has(scene.sceneId));
            });
            panelEl.appendChild(opt);
        });
    }

    function openPanel() {
        const trigger = getTrigger();
        if (!trigger) return;
        if (!panelEl) {
            panelEl = buildPanel();
            document.body.appendChild(panelEl);
        }
        const rect = trigger.getBoundingClientRect();
        panelEl.style.left = (rect.left + window.scrollX) + 'px';
        panelEl.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        panelEl.style.width = rect.width + 'px';
        panelEl.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');
        renderPanelOptions();
    }

    function closePanel() {
        if (panelEl) panelEl.style.display = 'none';
        const trigger = getTrigger();
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    function isPanelOpen() {
        return panelEl && panelEl.style.display !== 'none';
    }

    // ------- 交互 -------

    // scene 增减的唯一入口
    function toggleScene(sceneId, shouldSelect) {
        const selected = window._sourceSceneSelected;
        if (shouldSelect) {
            if (selected.size >= TOP_N) {
                // 达到上限，弹 toast 提示，不变更状态
                showLimitToast();
                return;
            }
            selected.add(sceneId);
        } else {
            selected.delete(sceneId);
        }
        renderTags();
        renderPanelOptions();
    }

    // ------- Toast（达到上限提示） -------

    let toastTimer = null;
    function showLimitToast() {
        // 已有同类 toast 在显示 → 重置计时，不叠加
        const existing = document.querySelector('.source-scene-limit-toast');
        if (existing) {
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => existing.remove(), 3000);
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'semi-dy-open-toast-innerWrapper source-scene-limit-toast';
        wrapper.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1200;';
        wrapper.innerHTML = ''
            + '<div role="alert" aria-label="warning type" '
            + 'class="semi-dy-open-toast semi-dy-open-toast-warning" '
            + 'style="transform: translate3d(0px, 0px, 0px);">'
            + '<div class="semi-dy-open-toast-content">'
            + '<span role="img" aria-label="alert_triangle" '
            + 'class="semi-dy-open-icon semi-dy-open-icon-large semi-dy-open-icon-alert_triangle '
            + 'semi-dy-open-toast-icon semi-dy-open-toast-icon-warning">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
            + 'width="1em" height="1em" focusable="false" aria-hidden="true">'
            + '<path fill-rule="evenodd" clip-rule="evenodd" '
            + 'd="M10.2268 2.3986L1.52616 19.0749C0.831449 20.4064 1.79747 22 3.29933 22H20.7007C22.2025 '
            + '22 23.1686 20.4064 22.4739 19.0749L13.7732 2.3986C13.0254 0.965441 10.9746 0.965442 '
            + '10.2268 2.3986ZM13.1415 14.0101C13.0603 14.5781 12.5739 15 12.0001 15C11.4263 15 '
            + '10.9398 14.5781 10.8586 14.0101L10.2829 9.97992C10.1336 8.93495 10.9445 8.00002 '
            + '12.0001 8.00002C13.0556 8.00002 13.8665 8.93495 13.7172 9.97992L13.1415 14.0101ZM13.5001 '
            + '18.5C13.5001 19.3284 12.8285 20 12.0001 20C11.1716 20 10.5001 19.3284 10.5001 18.5C10.5001 '
            + '17.6716 11.1716 17 12.0001 17C12.8285 17 13.5001 17.6716 13.5001 18.5Z" fill="currentColor">'
            + '</path></svg></span>'
            + '<span class="semi-dy-open-toast-content-text" x-semi-prop="content" style="max-width: 450px;">'
            + '最多只能选择' + TOP_N + '个场景值</span>'
            + '<div class="semi-dy-open-toast-close-button">'
            + '<button class="semi-dy-open-button semi-dy-open-button-tertiary '
            + 'semi-dy-open-button-size-small semi-dy-open-button-borderless '
            + 'semi-dy-open-button-with-icon semi-dy-open-button-with-icon-only" type="button" aria-disabled="false">'
            + '<span class="semi-dy-open-button-content">'
            + '<span role="img" aria-label="close" '
            + 'class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-close" x-semi-prop="icon">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
            + 'width="1em" height="1em" focusable="false" aria-hidden="true">'
            + '<path d="M17.6568 19.7782C18.2426 20.3639 19.1924 20.3639 19.7782 19.7782C20.3639 19.1924 '
            + '20.3639 18.2426 19.7782 17.6568L14.1213 12L19.7782 6.34313C20.3639 5.75734 20.3639 4.8076 '
            + '19.7782 4.22181C19.1924 3.63602 18.2426 3.63602 17.6568 4.22181L12 9.87866L6.34313 '
            + '4.22181C5.75734 3.63602 4.8076 3.63602 4.22181 4.22181C3.63602 4.8076 3.63602 5.75734 '
            + '4.22181 6.34313L9.87866 12L4.22181 17.6568C3.63602 18.2426 3.63602 19.1924 4.22181 '
            + '19.7782C4.8076 20.3639 5.75734 20.3639 6.34313 19.7782L12 14.1213L17.6568 19.7782Z" '
            + 'fill="currentColor"></path></svg></span></span></button></div>'
            + '</div></div>';

        document.body.appendChild(wrapper);

        // 关闭按钮
        const closeBtn = wrapper.querySelector('button');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            clearTimeout(toastTimer);
            wrapper.remove();
        });

        // 3 秒后自动消失
        toastTimer = setTimeout(() => wrapper.remove(), 3000);
    }

    function bindTriggerClick() {
        const trigger = getTrigger();
        if (!trigger || trigger.dataset.sceneSelectBound === '1') return;
        trigger.dataset.sceneSelectBound = '1';

        trigger.addEventListener('click', function (e) {
            // tag close/内部按钮点击不触发开关
            if (e.target.closest('.semi-dy-open-tag-close')) return;
            if (isPanelOpen()) closePanel(); else openPanel();
        });
    }

    // 点击外部关闭
    function bindOutsideClose() {
        if (window._sourceSceneOutsideBound) return;
        window._sourceSceneOutsideBound = true;
        document.addEventListener('click', function (e) {
            if (!isPanelOpen()) return;
            const trigger = getTrigger();
            if (trigger && trigger.contains(e.target)) return;
            if (panelEl && panelEl.contains(e.target)) return;
            closePanel();
        });
    }

    // ------- 入口 -------

    function initSourceSceneSelect() {
        window._sourceSceneAll = collectAllScenes();
        const topN = calcDefaultTopN();
        window._sourceSceneSelected = new Set(topN);
        renderTags();
        if (panelEl) renderPanelOptions();
        bindTriggerClick();
        bindOutsideClose();
        console.log('[source-scene-select] 初始化完成，场景总数:',
            window._sourceSceneAll.length, '默认选中:', topN.length);
    }

    window.initSourceSceneSelect = initSourceSceneSelect;
    window.renderSourceSceneTags = renderTags;
})();
