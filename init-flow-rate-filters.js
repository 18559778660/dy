(function () {
  'use strict';

  const DEFAULT_APP_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'dy', label: '抖音' },
    { value: 'dyjz', label: '抖音极速版' },
    { value: 'xg', label: '西瓜视频' },
    { value: 'tt', label: '今日头条' },
    { value: 'ttjb', label: '头条极速版' }
  ];
  const FLOW_RATE_OS_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'ios', label: 'iOS' },
    { value: 'android', label: 'Android' },
    { value: 'open_harmony', label: 'OpenHarmony' }
  ];
  const FLOW_RATE_ATTRIBUTION_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'ads', label: '广告' },
    { value: 'xingtu_fixed', label: '星图一口价' },
    { value: 'publisher', label: '发行人' },
    { value: 'organic', label: '自然' }
  ];
  const FLOW_RATE_ADTYPE_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'banner', label: 'Banner' },
    { value: 'rewardedVideo', label: '激励式视频' },
    { value: 'interstitial', label: '插屏广告' }
  ];

  if (!Array.isArray(window._flowRateAppSelected) || window._flowRateAppSelected.length === 0) {
    window._flowRateAppSelected = ['all'];
  }
  if (typeof window._flowRateTimeRange === 'undefined') {
    window._flowRateTimeRange = 'yesterday';
  }
  if (typeof window._flowRateOs === 'undefined') {
    window._flowRateOs = 'all';
  }
  if (typeof window._flowRateAttribution === 'undefined') {
    window._flowRateAttribution = 'all';
  }
  if (typeof window._flowRateAdType === 'undefined') {
    window._flowRateAdType = 'all';
  }
  if (typeof window._flowRateTableAdType === 'undefined') {
    window._flowRateTableAdType = 'all';
  }
  if (typeof window._flowRateMetric === 'undefined') {
    window._flowRateMetric = 'adRequestPV';
  }
  let _activeAppTrigger = null;
  let _appDocEventsBound = false;
  let _globalCloseEventsBound = false;

  function getAppOptions() {
    if (Array.isArray(window.SOURCE_APP_OPTIONS) && window.SOURCE_APP_OPTIONS.length > 0) {
      return [{ value: 'all', label: '全部' }].concat(window.SOURCE_APP_OPTIONS);
    }
    return DEFAULT_APP_OPTIONS;
  }

  function setRadioCheckedStyle(group, value) {
    group.querySelectorAll('label[data-range]').forEach(label => {
      const matched = label.getAttribute('data-range') === String(value);
      label.classList.toggle('semi-dy-open-radio-checked', matched);
      const inner = label.querySelector('.semi-dy-open-radio-inner');
      if (inner) inner.classList.toggle('semi-dy-open-radio-inner-checked', matched);
      const addon = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
      if (addon) addon.classList.toggle('semi-dy-open-radio-addon-buttonRadio-checked', matched);
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = matched;

      const iconWrap = label.querySelector('.semi-dy-open-radio-inner > input + span');
      if (!iconWrap) return;
      if (matched && !iconWrap.querySelector('.semi-dy-open-icon-radio')) {
        iconWrap.innerHTML = '<span role="img" aria-label="radio" '
          + 'class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-radio">'
          + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
          + 'width="1em" height="1em" focusable="false" aria-hidden="true">'
          + '<circle cx="12" cy="12" r="5" fill="currentColor"></circle></svg></span>';
      } else if (!matched) {
        iconWrap.innerHTML = '';
      }
    });
  }

  function initTimeRangeRadio() {
    const group = document.querySelector('.flow-rate-time-range-group');
    if (!group || group.dataset.bound === '1') return;
    group.dataset.bound = '1';

    setRadioCheckedStyle(group, window._flowRateTimeRange);
    group.querySelectorAll('label[data-range]').forEach(label => {
      label.addEventListener('click', function (e) {
        e.preventDefault();
        const range = this.getAttribute('data-range');
        if (!range || range === String(window._flowRateTimeRange)) return;
        window._flowRateTimeRange = range;
        setRadioCheckedStyle(group, range);
        console.log('[flow-rate] 时间切换:', range);
        if (typeof window.updateFlowRateCards === 'function') {
          window.updateFlowRateCards();
        }
        if (typeof window.updateFlowRateTrendChart === 'function') {
          window.updateFlowRateTrendChart();
        }
        if (typeof window.updateFlowRateDetailTable === 'function') {
          window.updateFlowRateDetailTable();
        }
      });
    });
  }

  function ensureMultiDropdown(trigger) {
    const options = getAppOptions();
    let portal = document.getElementById('flow-rate-app-multi-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'flow-rate-app-multi-portal';
      portal.className = 'semi-dy-open-portal';
      portal.style.zIndex = '1030';
      portal.innerHTML = `
        <div tabindex="-1" class="semi-dy-open-portal-inner" id="flow-rate-app-multi-wrapper" style="display:none;">
          <div class="semi-dy-open-popover-wrapper semi-dy-open-popover-wrapper-show" role="dialog" x-placement="bottomLeft">
            <div class="semi-dy-open-tooltip-content">
              <div class="semi-dy-open-popover">
                <div class="semi-dy-open-popover-content">
                  <div id="flow-rate-app-multi-dropdown" class="semi-dy-open-select-option-list-wrapper" style="width:100%;">
                    <div class="semi-dy-open-select-option-list semi-dy-open-select-option-list-chosen" role="listbox" aria-multiselectable="true" style="max-height:270px;">
                      ${options.map(option => `
                        <div class="semi-dy-open-select-option" role="option" data-value="${option.value}" aria-selected="false" aria-disabled="false">
                          <div class="semi-dy-open-select-option-icon">
                            <span role="img" aria-label="tick" class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-tick">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3516 4.2652C22.0336 4.73552 22.2052 5.66964 21.7348 6.35162L11.7348 20.8516C11.4765 21.2262 11.0622 21.4632 10.6084 21.4961C10.1546 21.529 9.71041 21.3541 9.40082 21.0207L2.90082 14.0207C2.33711 13.4136 2.37226 12.4645 2.97933 11.9008C3.5864 11.3371 4.53549 11.3723 5.0992 11.9793L10.3268 17.6091L19.2652 4.64842C19.7355 3.96644 20.6696 3.79487 21.3516 4.2652Z" fill="currentColor"></path>
                              </svg>
                            </span>
                          </div>
                          <div class="semi-dy-open-select-option-text">${option.label}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(portal);
    }

    const wrapper = document.getElementById('flow-rate-app-multi-wrapper');
    const rect = trigger.getBoundingClientRect();
    const top = (window.pageYOffset || document.documentElement.scrollTop) + rect.bottom + 4;
    const left = (window.pageXOffset || document.documentElement.scrollLeft) + rect.left;
    wrapper.style.cssText = `
      position:absolute;
      left:${left}px;
      top:${top}px;
      width:${rect.width}px;
      transform:translateX(0%) translateY(0%);
      z-index:1030;
      display:block !important;
    `;
  }

  function selectedValuesNormalized(values) {
    if (!Array.isArray(values) || values.length === 0) return ['all'];
    const uniq = Array.from(new Set(values));
    if (uniq.includes('all') && uniq.length > 1) return uniq.filter(v => v !== 'all');
    return uniq;
  }

  function renderTags(trigger, selectedValues) {
    const options = getAppOptions();
    const map = new Map(options.map(o => [o.value, o.label]));
    const wrapper = trigger.querySelector('.semi-dy-open-select-content-wrapper');
    if (!wrapper) return;
    const values = selectedValuesNormalized(selectedValues);
    window._flowRateAppSelected = values;

    const tagsHtml = values.map(value => {
      const label = map.get(value) || value;
      return `
        <div aria-label="Closable Tag: ${label}" tabindex="0"
          class="semi-dy-open-tag semi-dy-open-tag-large semi-dy-open-tag-square semi-dy-open-tag-light semi-dy-open-tag-white-light semi-dy-open-tag-closable flow-rate-app-tag"
          data-value="${value}" role="button" style="max-width:100%;">
          <div class="semi-dy-open-tag-content semi-dy-open-tag-content-ellipsis">${label}</div>
          <div class="semi-dy-open-tag-close"><span role="img" aria-label="close"
            class="semi-dy-open-icon semi-dy-open-icon-small semi-dy-open-icon-close">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">
              <path d="M17.6568 19.7782C18.2426 20.3639 19.1924 20.3639 19.7782 19.7782C20.3639 19.1924 20.3639 18.2426 19.7782 17.6568L14.1213 12L19.7782 6.34313C20.3639 5.75734 20.3639 4.8076 19.7782 4.22181C19.1924 3.63602 18.2426 3.63602 17.6568 4.22181L12 9.87866L6.34313 4.22181C5.75734 3.63602 4.8076 3.63602 4.22181 4.22181C3.63602 4.8076 3.63602 5.75734 4.22181 6.34313L9.87866 12L4.22181 17.6568C3.63602 18.2426 3.63602 19.1924 4.22181 19.7782C4.8076 20.3639 5.75734 20.3639 6.34313 19.7782L12 14.1213L17.6568 19.7782Z" fill="currentColor"></path>
            </svg>
          </span></div>
        </div>
      `;
    }).join('');

    wrapper.innerHTML = tagsHtml
      + '<div class="semi-dy-open-input-wrapper semi-dy-open-select-input semi-dy-open-select-input-multiple semi-dy-open-input-wrapper-default" style="width: 2px;">'
      + '<input class="semi-dy-open-input semi-dy-open-input-default" type="text" placeholder="" value="">'
      + '</div>';
  }

  function syncOptionChecked() {
    const dropdown = document.getElementById('flow-rate-app-multi-dropdown');
    if (!dropdown) return;
    const selected = selectedValuesNormalized(window._flowRateAppSelected);
    dropdown.querySelectorAll('.semi-dy-open-select-option').forEach(option => {
      const value = option.getAttribute('data-value');
      const checked = selected.includes(value);
      option.classList.toggle('semi-dy-open-select-option-selected', checked);
      option.setAttribute('aria-selected', checked ? 'true' : 'false');
    });
  }

  function closeMultiDropdown(trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    const wrapper = document.getElementById('flow-rate-app-multi-wrapper');
    if (wrapper) wrapper.style.display = 'none';
  }

  function bindMultiSelectEvents(trigger) {
    if (trigger.dataset.bound === '1') return;
    trigger.dataset.bound = '1';
    _activeAppTrigger = trigger;

    renderTags(trigger, window._flowRateAppSelected);

    trigger.addEventListener('click', function (e) {
      if (e.target.closest('.semi-dy-open-tag-close')) return;
      e.stopPropagation();
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeMultiDropdown(trigger);
        return;
      }
      ensureMultiDropdown(trigger);
      trigger.setAttribute('aria-expanded', 'true');
      syncOptionChecked();
    });

    trigger.addEventListener('click', function (e) {
      const closeBtn = e.target.closest('.semi-dy-open-tag-close');
      if (!closeBtn) return;
      e.stopPropagation();
      const tag = closeBtn.closest('.flow-rate-app-tag');
      if (!tag) return;
      const removed = tag.getAttribute('data-value');
      const next = selectedValuesNormalized((window._flowRateAppSelected || []).filter(v => v !== removed));
      renderTags(trigger, next);
      syncOptionChecked();
      console.log('[flow-rate] APP 关闭标签:', removed, '=>', window._flowRateAppSelected);
      if (typeof window.updateFlowRateCards === 'function') {
        window.updateFlowRateCards();
      }
      if (typeof window.updateFlowRateTrendChart === 'function') {
        window.updateFlowRateTrendChart();
      }
      if (typeof window.updateFlowRateDetailTable === 'function') {
        window.updateFlowRateDetailTable();
      }
    });

    if (!_appDocEventsBound) {
      _appDocEventsBound = true;

      document.addEventListener('click', function (e) {
        const active = _activeAppTrigger;
        if (!active) return;
        const inTrigger = e.target.closest('.flow-rate-app-multi-filter');
        const inMenu = e.target.closest('#flow-rate-app-multi-wrapper');
        if (inTrigger || inMenu) return;
        closeMultiDropdown(active);
      });

      document.addEventListener('click', function (e) {
        const option = e.target.closest('#flow-rate-app-multi-dropdown .semi-dy-open-select-option');
        const active = _activeAppTrigger;
        if (!option || !active) return;
        const value = option.getAttribute('data-value');
        if (!value) return;
        let next = selectedValuesNormalized(window._flowRateAppSelected);

        if (value === 'all') {
          next = ['all'];
        } else if (next.includes(value)) {
          next = next.filter(v => v !== value);
        } else {
          next = next.filter(v => v !== 'all').concat(value);
        }
        next = selectedValuesNormalized(next);
        renderTags(active, next);
        syncOptionChecked();
        console.log('[flow-rate] APP 多选变更:', window._flowRateAppSelected);
        if (typeof window.updateFlowRateCards === 'function') {
          window.updateFlowRateCards();
        }
        if (typeof window.updateFlowRateTrendChart === 'function') {
          window.updateFlowRateTrendChart();
        }
        if (typeof window.updateFlowRateDetailTable === 'function') {
          window.updateFlowRateDetailTable();
        }
      });
    }
  }

  function singleConfigByKey(key) {
    if (key === 'os') {
      return {
        stateKey: '_flowRateOs',
        options: FLOW_RATE_OS_OPTIONS,
        triggerClass: '.flow-rate-os-filter'
      };
    }
    if (key === 'adtype') {
      return {
        stateKey: '_flowRateAdType',
        options: FLOW_RATE_ADTYPE_OPTIONS,
        triggerClass: '.flow-rate-adtype-filter'
      };
    }
    if (key === 'table-adtype') {
      return {
        stateKey: '_flowRateTableAdType',
        options: FLOW_RATE_ADTYPE_OPTIONS,
        triggerClass: '.flow-rate-table-adtype-filter'
      };
    }
    return {
      stateKey: '_flowRateAttribution',
      options: FLOW_RATE_ATTRIBUTION_OPTIONS,
      triggerClass: '.flow-rate-attribution-filter'
    };
  }

  function singleIds(key) {
    return {
      portal: `flow-rate-${key}-portal`,
      wrapper: `flow-rate-${key}-wrapper`,
      dropdown: `flow-rate-${key}-dropdown`
    };
  }

  function renderSingleSelectText(trigger, options, value) {
    const span = trigger.querySelector('.semi-dy-open-select-selection-text');
    if (!span) return;
    const hit = options.find(o => o.value === value);
    span.textContent = hit ? hit.label : '全部';
  }

  function syncSingleOptionChecked(key) {
    const cfg = singleConfigByKey(key);
    const ids = singleIds(key);
    const dropdown = document.getElementById(ids.dropdown);
    if (!dropdown) return;
    const selected = String(window[cfg.stateKey] || 'all');
    dropdown.querySelectorAll('.semi-dy-open-select-option').forEach(option => {
      const value = option.getAttribute('data-value');
      const checked = value === selected;
      option.classList.toggle('semi-dy-open-select-option-selected', checked);
      option.classList.toggle('semi-dy-open-select-option-focused', checked);
      option.setAttribute('aria-selected', checked ? 'true' : 'false');
    });
  }

  function closeSingleDropdown(key) {
    const ids = singleIds(key);
    const wrapper = document.getElementById(ids.wrapper);
    if (wrapper) wrapper.style.display = 'none';
    const cfg = singleConfigByKey(key);
    const trigger = document.querySelector(cfg.triggerClass);
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function ensureSingleDropdown(trigger, key) {
    const cfg = singleConfigByKey(key);
    const ids = singleIds(key);
    let portal = document.getElementById(ids.portal);
    if (!portal) {
      portal = document.createElement('div');
      portal.id = ids.portal;
      portal.className = 'semi-dy-open-portal';
      portal.style.zIndex = '1030';
      portal.innerHTML = `
        <div tabindex="-1" class="semi-dy-open-portal-inner" id="${ids.wrapper}" style="display:none;">
          <div class="semi-dy-open-popover-wrapper semi-dy-open-popover-wrapper-show" role="dialog" x-placement="bottomLeft">
            <div class="semi-dy-open-tooltip-content">
              <div class="semi-dy-open-popover">
                <div class="semi-dy-open-popover-content">
                  <div id="${ids.dropdown}" class="semi-dy-open-select-option-list-wrapper" style="width:100%;">
                    <div class="semi-dy-open-select-option-list semi-dy-open-select-option-list-chosen" role="listbox" aria-multiselectable="false" style="max-height:270px;">
                      ${cfg.options.map(option => `
                        <div class="semi-dy-open-select-option" role="option" data-value="${option.value}" aria-selected="false" aria-disabled="false">
                          <div class="semi-dy-open-select-option-icon">
                            <span role="img" aria-label="tick" class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-tick">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3516 4.2652C22.0336 4.73552 22.2052 5.66964 21.7348 6.35162L11.7348 20.8516C11.4765 21.2262 11.0622 21.4632 10.6084 21.4961C10.1546 21.529 9.71041 21.3541 9.40082 21.0207L2.90082 14.0207C2.33711 13.4136 2.37226 12.4645 2.97933 11.9008C3.5864 11.3371 4.53549 11.3723 5.0992 11.9793L10.3268 17.6091L19.2652 4.64842C19.7355 3.96644 20.6696 3.79487 21.3516 4.2652Z" fill="currentColor"></path>
                              </svg>
                            </span>
                          </div>
                          <div class="semi-dy-open-select-option-text">${option.label}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(portal);
    }

    const wrapper = document.getElementById(ids.wrapper);
    const rect = trigger.getBoundingClientRect();
    const top = (window.pageYOffset || document.documentElement.scrollTop) + rect.bottom + 4;
    const left = (window.pageXOffset || document.documentElement.scrollLeft) + rect.left;
    wrapper.style.cssText = `
      position:absolute;
      left:${left}px;
      top:${top}px;
      width:${rect.width}px;
      transform:translateX(0%) translateY(0%);
      z-index:1030;
      display:block !important;
    `;

    const dropdown = document.getElementById(ids.dropdown);
    dropdown.querySelectorAll('.semi-dy-open-select-option').forEach(option => {
      if (option.dataset.bound === '1') return;
      option.dataset.bound = '1';
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        const value = this.getAttribute('data-value') || 'all';
        window[cfg.stateKey] = value;
        renderSingleSelectText(trigger, cfg.options, value);
        syncSingleOptionChecked(key);
        closeSingleDropdown(key);
        console.log(`[flow-rate] ${key} 切换:`, value);
        if (key === 'table-adtype') {
          if (typeof window.updateFlowRateDetailTable === 'function') {
            window.updateFlowRateDetailTable();
          }
        } else {
          if (typeof window.updateFlowRateCards === 'function') {
            window.updateFlowRateCards();
          }
          if (typeof window.updateFlowRateTrendChart === 'function') {
            window.updateFlowRateTrendChart();
          }
          if (typeof window.updateFlowRateDetailTable === 'function') {
            window.updateFlowRateDetailTable();
          }
        }
      });
    });
    syncSingleOptionChecked(key);
  }

  function bindSingleSelectEvents(trigger, key) {
    if (!trigger || trigger.dataset.bound === '1') return;
    trigger.dataset.bound = '1';
    const cfg = singleConfigByKey(key);
    renderSingleSelectText(trigger, cfg.options, String(window[cfg.stateKey] || 'all'));

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeSingleDropdown(key);
        return;
      }
      ensureSingleDropdown(trigger, key);
      trigger.setAttribute('aria-expanded', 'true');
      syncSingleOptionChecked(key);
    });
  }

  function initFlowRateFilters() {
    initTimeRangeRadio();
    const appTrigger = document.querySelector('.flow-rate-app-multi-filter');
    if (appTrigger) {
      _activeAppTrigger = appTrigger;
      bindMultiSelectEvents(appTrigger);
    }
    const osTrigger = document.querySelector('.flow-rate-os-filter');
    const attributionTrigger = document.querySelector('.flow-rate-attribution-filter');
    const adtypeTrigger = document.querySelector('.flow-rate-adtype-filter');
    const tableAdtypeTrigger = document.querySelector('.flow-rate-table-adtype-filter');
    bindSingleSelectEvents(osTrigger, 'os');
    bindSingleSelectEvents(attributionTrigger, 'attribution');
    bindSingleSelectEvents(adtypeTrigger, 'adtype');
    bindSingleSelectEvents(tableAdtypeTrigger, 'table-adtype');

    initMetricRadioGroup();

    if (!_globalCloseEventsBound) {
      _globalCloseEventsBound = true;
      document.addEventListener('click', function (e) {
        const inAppTrigger = e.target.closest('.flow-rate-app-multi-filter');
        const inAppMenu = e.target.closest('#flow-rate-app-multi-wrapper');
        const inOsTrigger = e.target.closest('.flow-rate-os-filter');
        const inOsMenu = e.target.closest('#flow-rate-os-wrapper');
        const inAttributionTrigger = e.target.closest('.flow-rate-attribution-filter');
        const inAttributionMenu = e.target.closest('#flow-rate-attribution-wrapper');
        const inAdtypeTrigger = e.target.closest('.flow-rate-adtype-filter');
        const inAdtypeMenu = e.target.closest('#flow-rate-adtype-wrapper');
        const inTableAdtypeTrigger = e.target.closest('.flow-rate-table-adtype-filter');
        const inTableAdtypeMenu = e.target.closest('#flow-rate-table-adtype-wrapper');
        if (inAppTrigger || inAppMenu || inOsTrigger || inOsMenu || inAttributionTrigger || inAttributionMenu || inAdtypeTrigger || inAdtypeMenu || inTableAdtypeTrigger || inTableAdtypeMenu) return;
        if (_activeAppTrigger) closeMultiDropdown(_activeAppTrigger);
        closeSingleDropdown('os');
        closeSingleDropdown('attribution');
        closeSingleDropdown('adtype');
        closeSingleDropdown('table-adtype');
      });
    }
    console.log('✅ 流量主筛选控件初始化完成');
  }

  function setMetricRadioCheckedStyle(group, value) {
    group.querySelectorAll('label[data-metric]').forEach(label => {
      const matched = label.getAttribute('data-metric') === value;
      const inner = label.querySelector('.semi-dy-open-radio-inner');
      const addon = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
      const iconWrap = label.querySelector('.semi-dy-open-radio-inner > input + span');
      const input = label.querySelector('input[type="radio"]');

      label.classList.toggle('semi-dy-open-radio-checked', matched);
      if (inner) inner.classList.toggle('semi-dy-open-radio-inner-checked', matched);
      if (addon) addon.classList.toggle('semi-dy-open-radio-addon-buttonRadio-checked', matched);
      if (input) input.checked = matched;

      if (!iconWrap) return;
      if (matched && !iconWrap.querySelector('.semi-dy-open-icon-radio')) {
        iconWrap.innerHTML = '<span role="img" aria-label="radio" class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-radio">'
          + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">'
          + '<circle cx="12" cy="12" r="5" fill="currentColor"></circle></svg></span>';
      } else if (!matched) {
        iconWrap.innerHTML = '';
      }
    });
  }

  function initMetricRadioGroup() {
    const group = document.querySelector('.flow-rate-metric-radio-group');
    if (!group || group.dataset.bound === '1') return;
    group.dataset.bound = '1';

    setMetricRadioCheckedStyle(group, window._flowRateMetric);

    group.querySelectorAll('label[data-metric]').forEach(label => {
      label.addEventListener('click', function (e) {
        e.preventDefault();
        const metric = this.getAttribute('data-metric');
        if (!metric || metric === window._flowRateMetric) return;
        window._flowRateMetric = metric;
        setMetricRadioCheckedStyle(group, metric);
        console.log('[flow-rate] 指标切换:', metric);
        if (typeof window.updateFlowRateTrendChart === 'function') {
          window.updateFlowRateTrendChart();
        }
      });
    });
  }

  function setAdManageRadioCheckedStyle(group, value) {
    group.querySelectorAll('label[data-adtype]').forEach(label => {
      const matched = label.getAttribute('data-adtype') === value;
      const inner = label.querySelector('.semi-dy-open-radio-inner');
      const addon = label.querySelector('.semi-dy-open-radio-addon-buttonRadio');
      const iconWrap = label.querySelector('.semi-dy-open-radio-inner > input + span');
      const input = label.querySelector('input[type="radio"]');

      label.classList.toggle('semi-dy-open-radio-checked', matched);
      if (inner) inner.classList.toggle('semi-dy-open-radio-inner-checked', matched);
      if (addon) addon.classList.toggle('semi-dy-open-radio-addon-buttonRadio-checked', matched);
      if (input) input.checked = matched;

      if (!iconWrap) return;
      if (matched && !iconWrap.querySelector('.semi-dy-open-icon-radio')) {
        iconWrap.innerHTML = '<span role="img" aria-label="radio" class="semi-dy-open-icon semi-dy-open-icon-default semi-dy-open-icon-radio">'
          + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">'
          + '<circle cx="12" cy="12" r="5" fill="currentColor"></circle></svg></span>';
      } else if (!matched) {
        iconWrap.innerHTML = '';
      }
    });
  }

  function getEmptyHtml() {
    return `<tr class="ad-manage-empty-row"><td colspan="4">
      <div class="semi-dy-open-table-placeholder">
        <div class="semi-dy-open-table-empty">
          <div class="omg-flex omg-flex-col omg-items-center omg-justify-center omg-h-[400px]"><svg width="200"
                  height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false"
                  aria-hidden="true">
                  <rect width="200" height="200" fill="transparent"></rect>
                  <path d="M100.749 191.987C106.964 191.429 109.45 182.788 111.108 176.935L116.08 191.987H100.749Z"
                      fill="black" stroke="black"></path>
                  <path
                      d="M103.973 62.9743C100.032 57.9437 102.024 49.1557 111.318 39.9402C124.298 28.058 136.847 30.6854 137.435 30.9599C138.023 31.2344 150.439 40.0194 162.26 52.2647C174.082 64.5099 186.453 74.9969 186.605 91.7998C186.758 108.603 169.346 114.685 156.573 114.761C143.8 114.837 115.296 114.479 109.821 113.567C106.386 118.074 100.923 122.945 98.9086 124.001C103.135 127.633 118.226 142.977 120.041 146.217C121.856 149.458 129.763 160.736 126.133 178.496C124.47 186.634 117.964 190.801 111.242 192.108C111.242 192.108 102.036 192.056 98.9086 192.108C91.1323 192.238 10.8888 192.108 8.55541 192.108C6.222 192.108 5.5492 190.015 8.55541 183.91C11.5616 177.805 22.6451 158.542 28.4536 155.104C30.7651 153.8 35.9866 157.174 37.084 157.956C38.1102 158.687 39.1053 159.55 40.5277 159.432C41.9502 159.313 49.3665 159.28 51.736 159.357C47.4507 156.357 31.7028 141.672 29.7784 134.527C28.2491 128.849 30.0791 125.569 30.8918 124.812C22.3632 119.824 13.6851 109.92 17.0809 95.2047C18.0334 91.077 20.6121 86.7769 22.5345 85.5382C26.1497 83.2087 38.4163 82.0313 45.8547 81.352C78.5525 78.3659 153.04 79.448 155.302 79.4695C152.184 77.0944 140.103 63.5378 139.822 63.0812C139.049 65.2938 135.994 68.1035 133.711 67.7874C131.685 67.5069 130.558 64.3341 132.902 59.3074C132.095 60.1317 131.256 60.9141 130.411 61.6007C129.167 62.6124 127.607 62.8197 127.041 61.6007C126.542 60.5285 126.708 58.4841 127.86 55.7601C126.628 56.9222 125.401 57.8872 124.299 58.4453C120.61 60.312 119.698 53.2123 124.64 47.1704C117.537 50.6427 115.523 53.479 113.759 57.6388C112.672 60.2028 112.288 62.5533 109.297 63.8825C107.003 64.9022 105.082 64.3905 103.973 62.9743Z"
                      fill="white"></path>
                  <path
                      d="M124.64 47.1704C117.537 50.6427 115.523 53.479 113.759 57.6388C112.672 60.2028 112.288 62.5533 109.297 63.8825C107.003 64.9022 105.082 64.3905 103.973 62.9743C100.032 57.9437 102.024 49.1557 111.318 39.9402C124.298 28.058 136.847 30.6854 137.435 30.9599C138.023 31.2344 150.439 40.0194 162.26 52.2647C174.082 64.5099 186.453 74.9969 186.605 91.7998C186.758 108.603 169.346 114.685 156.573 114.761C143.8 114.837 115.296 114.479 109.821 113.567M124.64 47.1704C131.639 44.5726 131.278 42.1983 130.866 41.7279C130.454 41.2574 126.228 44.4651 124.64 47.1704ZM124.64 47.1704C119.698 53.2123 120.61 60.312 124.299 58.4453C129.147 55.9917 136.386 45.6727 135.941 45.3268C135.625 45.0809 133.867 46.0738 130.62 50.8241C127.079 56.0054 126.275 59.9522 127.041 61.6007C127.607 62.8197 129.167 62.6124 130.411 61.6007C135.204 57.7034 139.821 50.7163 139.575 50.5407C139.329 50.3651 137.732 50.9884 133.966 57.3084C130.287 63.4832 131.428 67.4713 133.711 67.7874C135.994 68.1035 139.049 65.2938 139.822 63.0812C140.103 63.5378 152.184 77.0944 155.302 79.4695M109.821 113.567C106.386 118.074 100.923 122.945 98.9086 124.001M109.821 113.567C113.405 108.653 116.582 103.629 118.134 98.2721M98.9086 124.001C103.135 127.633 118.226 142.977 120.041 146.217C121.856 149.458 129.763 160.736 126.133 178.496C124.47 186.634 117.964 190.801 111.242 192.108C111.242 192.108 102.036 192.056 98.9086 192.108C91.1323 192.238 10.8888 192.108 8.55541 192.108C6.222 192.108 5.5492 190.015 8.55541 183.91C11.5616 177.805 22.6451 158.542 28.4536 155.104C30.7651 153.8 35.9866 157.174 37.084 157.956C38.1102 158.687 39.1053 159.55 40.5277 159.432C41.9502 159.313 49.3665 159.28 51.736 159.357M98.9086 124.001C96.6167 124.001 90.7456 124.001 88.0966 124.001M51.736 159.357C54.7948 159.456 61.3309 158.866 63.5832 160.9C65.6281 162.747 64.1421 165.492 61.0498 164.742C57.4124 163.859 52.9214 160.186 51.736 159.357ZM51.736 159.357C47.4507 156.357 31.7028 141.672 29.7784 134.527C28.2491 128.849 30.0791 125.569 30.8918 124.812M30.8918 124.812C34.2266 126.6 42.7697 130.887 50.2638 133.724M30.8918 124.812C22.3632 119.824 13.6851 109.92 17.0809 95.2047C18.0334 91.077 20.6121 86.7769 22.5345 85.5382C26.1497 83.2087 38.4163 82.0313 45.8547 81.352C78.5525 78.3659 153.04 79.448 155.302 79.4695M50.2638 133.724C59.6315 137.271 69.4571 139.982 72.6403 143.62C75.8235 147.258 71.8789 152.292 70.7272 156.371C70.4366 157.4 70.1048 158.961 70.4618 159.864C70.9133 161.004 72.2371 161.227 74.2054 159.694C77.7306 156.949 80.858 150.129 81.5088 148.122C82.1596 146.116 77.0743 156.386 76.5319 160.921C75.9896 165.456 80.0201 164.713 82.7289 160.921C85.9014 156.479 87.5288 151.376 87.7457 150.4C87.9627 149.424 85.0131 155.845 84.1459 159.694C83.9122 160.732 83.3028 163.166 84.1459 164.136C85.1049 165.239 87.0172 164.95 89.222 161.41C91.7388 157.368 93.603 151.702 93.8199 150.4C94.0368 149.099 90.7659 157.706 90.2726 161.898C89.9262 164.84 90.9352 166.275 94.4502 161.898C96.4375 159.423 97.8853 155.616 98.7757 151.776M50.2638 133.724C48.2903 136.441 46.0127 139.015 39.4572 140.045M65.2851 104.111C59.5802 99.9652 56.319 99.5478 53.8286 99.5478C50.1876 99.5478 49.3512 101.504 52.6691 102.748C55.9869 103.993 62.0181 104.111 65.2851 104.111ZM65.2851 104.111C67.8364 104.111 70.981 104.111 72.1996 104.111M65.2851 104.111C70.3927 107.822 80.0089 115.502 88.0966 124.001M155.302 79.4695C157.563 79.491 161.438 80.1644 161.106 82.5709C160.89 84.1323 156.389 80.4494 155.302 79.4695ZM88.0966 124.001C88.9354 124.883 89.7578 125.773 90.5569 126.669C92.5004 128.847 99.0321 136.266 99.6819 140.816C100.051 143.403 99.7417 147.609 98.7757 151.776M98.7757 151.776C101.959 154.697 106.119 160.024 107.017 165.952C107.915 171.881 107.017 179.415 97.6169 187.298"
                      stroke="#515151"></path>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M115.942 192.126L110.767 176.459L110.643 176.896C109.814 179.826 108.782 183.434 107.185 186.38C105.586 189.328 103.443 191.576 100.406 191.848L100.418 192.126H115.942Z"
                      fill="#515151"></path>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M122.415 137.352L127.509 146.829H120.059L114.965 137.352H122.415Z" fill="#C6CACD"></path>
                  <path d="M104.096 141.476H138.046L152.872 168.908H118.922L104.096 141.476Z" fill="white"
                      stroke="#515151"></path>
                  <rect x="139.521" y="155.135" width="43.5958" height="38.8611" fill="#E6E8EA" stroke="#515151"></rect>
                  <path d="M139.868 154.692L149.154 137.852H192.608L183.322 154.692H139.868Z" fill="#E6E8EA"
                      stroke="#515151"></path>
                  <rect x="111.223" y="155.135" width="28.1841" height="38.8611" fill="#E6E8EA" stroke="#515151"></rect>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M166.556 154.913L170.458 147.944H164.326L160.735 154.356H160.423V154.913V167.735H166.556V154.913Z"
                      fill="#515151"></path>
                  <circle cx="45.5788" cy="38.675" r="33.1711" fill="var(--semi-color-primary-light-default)"></circle>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M48.8463 47.665C50.6181 47.215 51.7206 45.5669 51.3113 43.7853C51.0325 42.5717 51.5828 41.3761 52.45 40.4825C55.4775 37.3627 57.535 32.7049 56.1134 27.7053C55.3648 24.9884 53.3436 22.6095 50.6835 21.1086C47.7793 19.509 44.2103 19.2031 40.8077 20.2426L40.6363 20.3154C34.8598 22.2833 32.3353 27.3701 32.3807 32.2789C32.3997 34.3262 34.5 35.484 36.4693 34.924C38.4731 34.3542 39.442 32.1175 40.1036 30.1421C40.4947 28.9745 41.3605 27.9109 43.0324 27.3905C44.9908 26.7616 46.3831 27.1822 47.1884 27.6496C48.0665 28.2885 48.7731 29.0001 48.9654 29.9299C49.8126 32.4026 48.1403 35.1354 46.2287 36.3514C43.5455 38.0338 43.2023 41.8296 43.7716 45.1416C44.1326 47.2422 46.3167 48.3075 48.3825 47.7828L48.8463 47.665ZM48.8719 50.8187C51.0244 50.1214 53.3346 51.3012 54.0319 53.4537C54.7291 55.6062 53.5494 57.9164 51.3969 58.6136C49.2444 59.3109 46.9342 58.1312 46.2369 55.9787C45.5397 53.8262 46.7194 51.5159 48.8719 50.8187Z"
                      fill="var(--semi-color-primary)"></path>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M98.6325 82.5785L98.522 82.5688L98.4877 82.6743C97.7016 85.0957 96.8311 87.9064 96.9691 90.7095C97.1077 93.5236 98.262 96.323 101.502 98.7181C104.667 101.057 108.08 100.494 110.687 98.5588C113.288 96.6288 115.105 93.324 115.105 90.1368C115.105 88.8872 114.291 87.8175 113.058 86.9175C111.823 86.0155 110.141 85.2636 108.343 84.6522C104.746 83.4288 100.649 82.7556 98.6325 82.5785ZM115.813 104.266C114.483 107.369 111.185 111.947 109.698 113.851L109.813 113.705L115.054 114.077L115.091 113.997C115.323 113.505 115.5 112.803 115.638 111.998C115.776 111.191 115.875 110.269 115.944 109.334C116.082 107.464 116.103 105.529 116.08 104.318L115.813 104.266ZM30.8576 124.273L30.697 124.171L29.3633 129.209L29.4735 129.257C33.8679 131.154 43.5848 133.309 50.5631 133.867L50.625 133.599C42.8485 130.557 34.4308 126.532 30.8576 124.273Z"
                      fill="#515151"></path>
                  <path d="M71.0305 48.9888C76.2793 50.2249 87.15 55.3866 88.6431 66.1442" stroke="#515151"></path>
                  <path
                      d="M108.084 96.5775C102.358 96.5775 97.717 91.9361 97.717 86.2107C97.717 80.4852 102.358 75.8438 108.084 75.8438C113.809 75.8438 118.451 80.4852 118.451 86.2107C118.451 91.9361 113.809 96.5775 108.084 96.5775Z"
                      fill="white" stroke="#515151" stroke-miterlimit="10"></path>
                  <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M110.797 85.8621C110.694 85.6555 110.443 85.5718 110.236 85.6751C108.821 86.3824 107.28 86.5592 106.71 86.5592C106.479 86.5592 106.292 86.7464 106.292 86.9773C106.292 87.2082 106.479 87.3954 106.71 87.3954C107.379 87.3954 109.055 87.2008 110.61 86.4231C110.817 86.3198 110.9 86.0686 110.797 85.8621ZM108.135 89.3776C108.1 88.8916 108.465 88.469 108.951 88.4337C109.437 88.3983 109.86 88.7637 109.895 89.2497C109.93 89.7357 109.565 90.1584 109.079 90.1937C108.593 90.229 108.17 89.8637 108.135 89.3776ZM115.238 88.4333C114.752 88.4687 114.387 88.8913 114.422 89.3773C114.457 89.8633 114.88 90.2286 115.366 90.1933C115.852 90.158 116.217 89.7354 116.182 89.2494C116.147 88.7634 115.724 88.398 115.238 88.4333Z"
                      fill="#515151"></path>
                  <path
                      d="M100.584 87.3134C100.584 87.3134 94.8494 80.6963 99.9225 76.2848C106.54 70.3294 121.097 75.8437 121.097 75.8437C121.097 75.8437 120.877 82.902 116.245 83.7843C111.833 84.446 103.672 81.358 103.672 81.358L100.584 87.3134Z"
                      fill="#515151"></path>
                  <path
                      d="M98.3782 88.637C96.9164 88.637 95.7314 87.452 95.7314 85.9902C95.7314 84.5283 96.9164 83.3433 98.3782 83.3433C99.8401 83.3433 101.025 84.5283 101.025 85.9902C101.025 87.452 99.8401 88.637 98.3782 88.637Z"
                      fill="white" stroke="#515151" stroke-miterlimit="10"></path>
              </svg><span
                  class="semi-dy-open-typography !omg-mt-4 semi-dy-open-typography-tertiary semi-dy-open-typography-normal">暂无数据</span>
          </div>
        </div>
      </div>
    </td></tr>`;
  }

  function filterAdManageTable(adType) {
    const tbody = document.querySelector('.ad-manage-table-body');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('.ad-manage-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const rowType = row.getAttribute('data-adtype');
      if (adType === 'all' || rowType === adType) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    let emptyRow = tbody.querySelector('.ad-manage-empty-row');
    if (visibleCount === 0) {
      if (!emptyRow) {
        tbody.insertAdjacentHTML('beforeend', getEmptyHtml());
      } else {
        emptyRow.style.display = '';
      }
    } else {
      if (emptyRow) {
        emptyRow.style.display = 'none';
      }
    }
  }

  function initAdManageTypeRadio() {
    const group = document.querySelector('.ad-manage-type-radio-group');
    if (!group || group.dataset.bound === '1') return;
    group.dataset.bound = '1';

    const currentType = 'all';
    setAdManageRadioCheckedStyle(group, currentType);
    filterAdManageTable(currentType);

    group.querySelectorAll('label[data-adtype]').forEach(label => {
      label.addEventListener('click', function (e) {
        e.preventDefault();
        const adType = this.getAttribute('data-adtype');
        if (!adType) return;
        setAdManageRadioCheckedStyle(group, adType);
        filterAdManageTable(adType);
        console.log('[ad-manage] 广告位类型切换:', adType);
      });
    });
  }

  window.initFlowRateFilters = initFlowRateFilters;
  window.initAdManageTypeRadio = initAdManageTypeRadio;
})();
