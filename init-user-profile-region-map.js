// 用户画像 - 地域地图渲染
// ===============================================================
// 依赖：VChart 完整版（index.js，不是 index.min.js —— min 版去掉了 registerMap 地图模块）
// 地图数据：conf/china-geo.json（DataV 阿里云省级 GeoJSON 本地化副本）
//
// 对外 API：
//   window.ensureChinaMapRegistered() : Promise<void>
//       懒加载并注册一次中国省级地图（key = 'china'）；重复调用直接返回已完成的 Promise
//   window.renderUserProfileRegionMap(containerId, values)
//       values: [{ name: '广东' | '广东省', value: 2800 }, ...]
//       · 会自动把短名归一化为地图里的全名（"广东" → "广东省"）
//       · 容器若有旧 VChart 实例先释放再重建，避免 DOM 叠加
//
// 省份 name 归一化：
//   我们项目里 user-profile-data.json 的 province 用的是短名（"北京"、"广东"、"内蒙古"），
//   DataV GeoJSON 里 feature.properties.name 是全名（"北京市"、"广东省"、"内蒙古自治区"），
//   所以启动时根据 GeoJSON 自动构造 shortToFull Map（去掉常见后缀），渲染时查表转换。
//
// ⚠ rewind: true 为什么必传：
//   VChart 对地图数据严格按 RFC 7946 解析（外环逆时针 / 内环顺时针）。
//   DataV 阿里云 GeoJSON 遵循 GIS 传统（外环顺时针 / 内环逆时针），正好反了。
//   不加 rewind 时 VChart 把"整个画布"当成填充区，省界完全画不出来，只剩一个大色块
//   + 底部 legend 渐变条（和之前看到的"正方形"现象完全吻合）。
//   官方 issue #3919 明确建议：注册时传 { rewind: true } 反转环向。
// ===============================================================
(function () {
  'use strict';

  const GEO_URL = './conf/china-geo.json';
  const MAP_KEY = 'china';
  // 按长度从大到小排，保证"维吾尔自治区"优先于"自治区"匹配
  const NAME_SUFFIXES = [
    '维吾尔自治区', '壮族自治区', '回族自治区', '特别行政区',
    '自治区', '省', '市'
  ];

  let _registerPromise = null;
  let _shortToFull = null;

  function buildShortToFull(geoJson) {
    const map = new Map();
    (geoJson.features || []).forEach(f => {
      const full = f.properties && f.properties.name;
      if (!full) return;
      let short = full;
      for (const s of NAME_SUFFIXES) {
        if (short.endsWith(s)) { short = short.slice(0, -s.length); break; }
      }
      map.set(short, full);
      map.set(full, full);
    });
    return map;
  }

  function ensureChinaMapRegistered() {
    if (_registerPromise) return _registerPromise;
    _registerPromise = fetch(GEO_URL)
      .then(res => {
        if (!res.ok) throw new Error(`加载中国地图 GeoJSON 失败: ${res.status}`);
        return res.json();
      })
      .then(geo => {
        _shortToFull = buildShortToFull(geo);
        // VChart 完整版才有 registerMap；min 版会是 undefined
        const VChartLib = window.VChart && (window.VChart.VChart || window.VChart);
        const register = (VChartLib && VChartLib.registerMap) ||
                         (window.VChart && window.VChart.registerMap);
        if (typeof register !== 'function') {
          throw new Error('当前 VChart 不含 registerMap —— 请确认引入的是 build/index.js 而非 index.min.js');
        }
        register(MAP_KEY, geo, { type: 'geojson', rewind: true });
        return geo;
      })
      .catch(err => {
        _registerPromise = null;
        throw err;
      });
    return _registerPromise;
  }

  function normalizeValues(values) {
    if (!_shortToFull) return (values || []).slice();
    return (values || []).map(v => ({
      name: _shortToFull.get(v.name) || v.name,
      value: Number(v.value) || 0
    }));
  }

  function buildMapSpec(mapValues) {
    const maxVal = mapValues.reduce((m, d) => Math.max(m, d.value || 0), 0) || 1;
    return {
      type: 'map',
      map: MAP_KEY,
      data: [{ id: 'regionData', values: mapValues }],
      nameField: 'name',
      valueField: 'value',
      nameProperty: 'name',
      region: [{ roam: false }],
      animation: false,
      area: {
        style: {
          fill: (datum) => {
            const v = (datum && datum.value) || 0;
            if (v <= 0) return '#eef2f7';
            const t = Math.min(1, v / maxVal);
            const start = [232, 240, 255];
            const end = [22, 93, 255];
            const rgb = start.map((s, i) => Math.round(s + (end[i] - s) * t));
            return `rgb(${rgb.join(',')})`;
          },
          stroke: '#ffffff',
          lineWidth: 0.5
        },
        state: {
          hover: {
            stroke: '#165dff',
            lineWidth: 1,
            fillOpacity: 0.85
          }
        }
      },
      label: {
        visible: false
      },
      tooltip: {
        mark: {
          title: {
            value: (datum) => (datum && datum.name) || ''
          },
          content: [{
            key: '访问人数',
            value: (datum) => {
              const v = (datum && datum.value) || 0;
              return (Number(v) || 0).toLocaleString('en-US');
            }
          }]
        }
      },
      legends: {
        visible: true,
        type: 'color',
        orient: 'bottom',
        position: 'start',
        field: 'value'
      }
    };
  }

  function renderUserProfileRegionMap(containerId, values) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[region-map] 未找到容器:', containerId);
      return;
    }
    const CHART_KEY = 'userProfileRegionMap';

    ensureChinaMapRegistered().then(() => {
      const VChartLib = window.VChart && (window.VChart.VChart || window.VChart);
      const ChartClass = VChartLib || (window.VChart && window.VChart.VChart);
      if (!ChartClass) {
        console.warn('[region-map] VChart 未就绪');
        return;
      }

      if (window[CHART_KEY]) {
        try { window[CHART_KEY].release(); } catch (e) { /* ignore */ }
        window[CHART_KEY] = null;
      }
      container.innerHTML = '';

      const mapValues = normalizeValues(values);
      if (!mapValues.length) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#86909c;font-size:13px;">暂无数据</div>';
        return;
      }

      const spec = buildMapSpec(mapValues);
      const chart = new ChartClass(spec, {
        dom: container,
        width: container.offsetWidth || 536,
        height: container.offsetHeight || 305
      });
      chart.renderSync();
      window[CHART_KEY] = chart;
      console.log('✅ 用户画像-地域地图渲染完成，省份数:', mapValues.length);
    }).catch(err => {
      console.error('[region-map] 渲染失败:', err);
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f53f3f;font-size:13px;">' +
        '地图加载失败（' + (err && err.message ? err.message : 'unknown') + '）</div>';
    });
  }

  window.ensureChinaMapRegistered = ensureChinaMapRegistered;
  window.renderUserProfileRegionMap = renderUserProfileRegionMap;
})();
