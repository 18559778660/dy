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

  window.initFlowRateFilters = initFlowRateFilters;
})();
