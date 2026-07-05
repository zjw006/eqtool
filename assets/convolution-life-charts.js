(function() {
  'use strict';

  var charts = {};
  var maxAge = 80;
  var currentAge = 35;
  var viewMode = 'all'; // 'all' | 'stack' | 'individual'

  var colors = ['#f43f5e', '#f59e0b', '#22d3ee', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#ef4444', '#84cc16', '#a78bfa'];

  // 年龄段定义 [min, max]
  var ageGroups = [
    { min: 0, max: 6, label: '0-6\u5c81 \u5a74\u5e7c\u513f\u671f' },
    { min: 7, max: 12, label: '7-12\u5c81 \u5c0f\u5b66\u671f' },
    { min: 13, max: 18, label: '13-18\u5c81 \u4e2d\u5b66\u671f' },
    { min: 19, max: 24, label: '19-24\u5c81 \u5927\u5b66/\u521d\u5165\u793e\u4f1a' },
    { min: 25, max: 35, label: '25-35\u5c81 \u804c\u573a/\u6210\u5bb6\u671f' },
    { min: 36, max: 50, label: '36-50\u5c81 \u4e2d\u5e74\u671f' },
    { min: 51, max: 80, label: '51-80\u5c81 \u8001\u5e74\u671f' }
  ];

  function getAgeGroup(age) {
    for (var i = 0; i < ageGroups.length; i++) {
      if (age >= ageGroups[i].min && age <= ageGroups[i].max) return i;
    }
    return ageGroups.length - 1;
  }

  function getPresetIndicesForGroup(groupIdx) {
    var start = groupIdx * 3;
    return [start, start + 1, start + 2];
  }

  // 预设事件按年龄段分组，每段3个
  var presetEvents = [
    // 0-6岁 婴幼儿期
    { name: '\u51fa\u751f\u5728\u4e00\u4e2a\u6e29\u6696\u7684\u5bb6\u5ead', intensity: 7, type: 'gaussian', duration: 18 },
    { name: '\u7236\u6bcd\u957f\u671f\u7f3a\u5e2d/\u88ab\u5ffd\u89c6', intensity: -8, type: 'exponential', duration: 25 },
    { name: '\u6709\u5144\u5f1f\u59d0\u59b9\u4e00\u8d77\u6210\u957f', intensity: 3, type: 'gaussian', duration: 15 },
    // 7-12岁 小学期
    { name: '\u5c0f\u5b66\u6210\u7ee9\u4f18\u5f02\u88ab\u8868\u626c', intensity: 5, type: 'gaussian', duration: 8 },
    { name: '\u88ab\u540c\u5b66\u9738\u51cc/\u5b64\u7acb', intensity: -7, type: 'exponential', duration: 15 },
    { name: '\u9047\u5230\u6539\u53d8\u4e00\u751f\u7684\u597d\u8001\u5e08', intensity: 6, type: 'gaussian', duration: 10 },
    // 13-18岁 中学期
    { name: '\u4e2d\u8003/\u9ad8\u8003\u53d1\u6325\u51fa\u8272', intensity: 8, type: 'gaussian', duration: 6 },
    { name: '\u4e2d\u8003/\u9ad8\u8003\u5931\u5229', intensity: -7, type: 'exponential', duration: 12 },
    { name: '\u9752\u6625\u671f\u4e0e\u7236\u6bcd\u5173\u7cfb\u7d27\u5f20', intensity: -5, type: 'damped', duration: 6 },
    // 19-24岁 大学/初入社会
    { name: '\u8003\u4e0a\u7406\u60f3\u5927\u5b66/\u4e13\u4e1a', intensity: 8, type: 'gaussian', duration: 6 },
    { name: '\u521d\u604b/\u7b2c\u4e00\u6b21\u604b\u7231', intensity: 7, type: 'damped', duration: 5 },
    { name: '\u8003\u7814/\u8003\u516c\u5931\u8d25\u6216\u5931\u4e1a', intensity: -6, type: 'exponential', duration: 10 },
    // 25-35岁 职场/成家期
    { name: '\u627e\u5230\u7406\u60f3\u5de5\u4f5c/\u5347\u804c\u52a0\u85aa', intensity: 6, type: 'gaussian', duration: 5 },
    { name: '\u9047\u5230\u4eba\u751f\u4f34\u4fa3/\u7ed3\u5a5a', intensity: 9, type: 'step', duration: 50 },
    { name: '\u521b\u4e1a\u5931\u8d25/\u91cd\u5927\u6295\u8d44\u4e8f\u635f', intensity: -8, type: 'exponential', duration: 12 },
    // 36-50岁 中年期
    { name: '\u5b69\u5b50\u51fa\u751f/\u6210\u957f', intensity: 8, type: 'step', duration: 30 },
    { name: '\u4e2d\u5e74\u5371\u673a/\u804c\u4e1a\u5026\u6020', intensity: -5, type: 'damped', duration: 6 },
    { name: '\u4eb2\u4eba\u79bb\u4e16', intensity: -9, type: 'exponential', duration: 20 },
    // 51-80岁 老年期
    { name: '\u5b66\u4f1a\u653e\u4e0b/\u5f00\u59cb\u51a5\u60f3', intensity: 5, type: 'gaussian', duration: 8 },
    { name: '\u9000\u4f11/\u5931\u53bb\u793e\u4f1a\u89d2\u8272', intensity: -4, type: 'damped', duration: 5 },
    { name: '\u5b50\u5b59\u6ee1\u5802/\u4eab\u53d7\u5929\u4f26', intensity: 7, type: 'gaussian', duration: 10 }
  ];

  // 预设示例事件
  var defaultEvents = [
    { id: 1, name: '\u51fa\u751f\u5728\u4e00\u4e2a\u6e29\u6696\u7684\u5bb6\u5ead', age: 0, intensity: 7, type: 'gaussian', duration: 18, colorIdx: 0, presetIdx: 0 },
    { id: 2, name: '\u5c0f\u5b66\u88ab\u540c\u5b66\u9738\u51cc', age: 8, intensity: -6, type: 'exponential', duration: 15, colorIdx: 1, presetIdx: 4 },
    { id: 3, name: '\u9047\u5230\u4e00\u4f4d\u597d\u8001\u5e08', age: 12, intensity: 6, type: 'gaussian', duration: 10, colorIdx: 2, presetIdx: 5 },
    { id: 4, name: '\u4e2d\u8003/\u9ad8\u8003\u53d1\u6325\u51fa\u8272', age: 18, intensity: 8, type: 'gaussian', duration: 6, colorIdx: 3, presetIdx: 6 },
    { id: 5, name: '\u521d\u604b/\u7b2c\u4e00\u6b21\u604b\u7231', age: 20, intensity: 7, type: 'damped', duration: 5, colorIdx: 4, presetIdx: 10 },
    { id: 6, name: '\u5931\u604b/\u88ab\u80cc\u53db', age: 22, intensity: -8, type: 'damped', duration: 8, colorIdx: 5, presetIdx: undefined },
    { id: 7, name: '\u8003\u7814/\u8003\u516c\u5931\u8d25', age: 22, intensity: -6, type: 'exponential', duration: 10, colorIdx: 6, presetIdx: 11 },
    { id: 8, name: '\u627e\u5230\u7b2c\u4e00\u4efd\u5de5\u4f5c', age: 23, intensity: 5, type: 'gaussian', duration: 5, colorIdx: 7, presetIdx: undefined },
    { id: 9, name: '\u4eb2\u4eba/\u670b\u53cb\u79bb\u4e16', age: 25, intensity: -9, type: 'exponential', duration: 20, colorIdx: 1, presetIdx: undefined },
    { id: 10, name: '\u5347\u804c\u52a0\u85aa', age: 28, intensity: 6, type: 'gaussian', duration: 4, colorIdx: 3, presetIdx: 12 },
    { id: 11, name: '\u521b\u4e1a/\u6295\u8d44\u5931\u8d25', age: 32, intensity: -8, type: 'exponential', duration: 12, colorIdx: 1, presetIdx: 14 },
    { id: 12, name: '\u9047\u5230\u4eba\u751f\u4f34\u4fa3', age: 30, intensity: 9, type: 'step', duration: 50, colorIdx: 4, presetIdx: 13 },
    { id: 13, name: '\u5b69\u5b50\u51fa\u751f', age: 35, intensity: 8, type: 'step', duration: 30, colorIdx: 0, presetIdx: undefined },
    { id: 14, name: '\u4e2d\u5e74\u5371\u673a/\u7126\u8651', age: 40, intensity: -5, type: 'damped', duration: 6, colorIdx: 5, presetIdx: 16 },
    { id: 15, name: '\u5f00\u59cb\u953b\u70bc/\u51a5\u60f3', age: 42, intensity: 5, type: 'gaussian', duration: 8, colorIdx: 2, presetIdx: undefined }
  ];

  var events = JSON.parse(JSON.stringify(defaultEvents));
  var nextId = 16;

  var kernelTypes = [
    { value: 'gaussian', label: '\u9010\u6e10\u6de1\u5fd8\uff08\u9ad8\u65af\u8870\u51cf\uff09', desc: '\u65e5\u5e38\u7ecf\u5386\u81ea\u7136\u6d88\u9000' },
    { value: 'exponential', label: '\u523b\u9aa8\u94ed\u5fc3\uff08\u6307\u6570\u8870\u51cf\uff09', desc: '\u91cd\u5927\u4e8b\u4ef6\u957f\u671f\u70d9\u5370' },
    { value: 'impulse', label: '\u4e00\u95ea\u800c\u8fc7\uff08\u8109\u51b2\u51fd\u6570\uff09', desc: '\u77ac\u65f6\u4e8b\u4ef6' },
    { value: 'damped', label: '\u53cd\u590d\u7ea0\u7ed3\uff08\u963b\u5c3c\u632f\u8361\uff09', desc: '\u5fc3\u7406\u9707\u8361\u540e\u6062\u590d' },
    { value: 'step', label: '\u957f\u671f\u966a\u4f34\uff08\u9636\u8dc3\u51fd\u6570\uff09', desc: '\u957f\u671f\u73af\u5883\u5f71\u54cd' }
  ];

  // ===== 内核函数 =====
  function kernel(type, t, duration) {
    if (t < 0) return 0;
    var dur = duration || 10;
    switch (type) {
      case 'gaussian':
        var sigma = dur / 3;
        return Math.exp(-(t * t) / (2 * sigma * sigma));
      case 'exponential':
        var lambda = 3 / dur;
        return Math.exp(-lambda * t);
      case 'impulse':
        return t === 0 ? 1 : 0;
      case 'damped':
        var lam = 2 / dur;
        var omega = 0.8;
        return Math.exp(-lam * t) * Math.sin(omega * t + 0.5);
      case 'step':
        return t <= dur ? 1 : 0;
      default:
        return Math.exp(-t / dur);
    }
  }

  // ===== 判断事件是否已填写内容 =====
  function isEventActive(evt) {
    return evt.name && evt.name.length > 0;
  }

  // ===== 离散卷积 =====
  function convolve(age) {
    var sum = 0;
    events.forEach(function(evt) {
      if (!isEventActive(evt)) return;
      var dt = age - evt.age;
      if (dt >= 0) {
        sum += evt.intensity * kernel(evt.type, dt, evt.duration);
      }
    });
    return sum;
  }

  // ===== 单个事件的影响曲线 =====
  function eventCurve(evt) {
    if (!isEventActive(evt)) return [];
    var data = [];
    for (var a = 0; a <= maxAge; a++) {
      var dt = a - evt.age;
      var v = dt >= 0 ? evt.intensity * kernel(evt.type, dt, evt.duration) : 0;
      data.push([a, parseFloat(v.toFixed(2))]);
    }
    return data;
  }

  // ===== 生成完整时间轴数据 =====
  function generateTimeSeries() {
    var ages = [];
    var values = [];
    for (var a = 0; a <= maxAge; a++) {
      ages.push(a);
      values.push(parseFloat(convolve(a).toFixed(2)));
    }
    return { ages: ages, values: values };
  }

  // ===== ECharts 通用配置 =====
  function commonOption() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#f1f5f9', fontFamily: 'JetBrainsMono, monospace', fontSize: 12 }
      },
      grid: { left: 55, right: 30, top: 40, bottom: 45 },
      xAxis: {
        type: 'value',
        name: '\u5e74\u9f84',
        min: 0, max: maxAge,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono, monospace' },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '\u6027\u683c\u503c',
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono, monospace' },
        splitLine: { lineStyle: { color: '#33415540' } },
        min: function(value) { return Math.floor(value.min - 2); },
        max: function(value) { return Math.ceil(value.max + 2); }
      }
    };
  }

  // ===== 渲染事件列表 =====
  function renderEventList() {
    var container = document.getElementById('eventList');
    if (!container) return;
    container.innerHTML = '';
    events.forEach(function(evt) {
      var row = document.createElement('div');
      row.className = 'event-row';
      row.dataset.id = evt.id;

      var colorOpts = colors.map(function(c, i) {
        return '<option value="' + i + '"' + (i === evt.colorIdx ? ' selected' : '') + '>' + c + '</option>';
      }).join('');

      var typeOpts = kernelTypes.map(function(t) {
        return '<option value="' + t.value + '"' + (t.value === evt.type ? ' selected' : '') + '>' + t.label + '</option>';
      }).join('');

      // 构建预设下拉选项 - 只显示该年龄段对应的3个预设
      var groupIdx = getAgeGroup(evt.age);
      var presetIndices = getPresetIndicesForGroup(groupIdx);
      var presetOpts = presetIndices.map(function(i) {
        var pe = presetEvents[i];
        return '<option value="' + i + '"' + (evt.presetIdx === i ? ' selected' : '') + '>' + pe.name + '</option>';
      }).join('');

      var isCustom = (evt.presetIdx === undefined || evt.presetIdx === null);
      var customSelected = isCustom ? ' selected' : '';
      var nameInputVisible = isCustom ? ' visible' : '';

      row.innerHTML =
        '<div style="position:relative;">' +
          '<select class="evt-select">' + presetOpts + '<option value="custom"' + customSelected + '>\u270F\uFE0F \u81EA\u5B9A\u4E49\u4E8B\u4EF6...</option></select>' +
          '<input type="text" class="evt-in-name' + nameInputVisible + '" value="' + evt.name + '" placeholder="\u8BF7\u8F93\u5165\u4E8B\u4EF6\u540D\u79F0">' +
        '</div>' +
        '<input type="number" class="evt-in-age" value="' + evt.age + '" min="0" max="' + maxAge + '">' +
        '<input type="number" class="evt-in-int" value="' + evt.intensity + '" min="-10" max="10" step="0.5">' +
        '<select class="evt-in-type">' + typeOpts + '</select>' +
        '<input type="number" class="evt-in-dur" value="' + evt.duration + '" min="1" max="100">' +
        '<select class="evt-in-color" style="background:' + colors[evt.colorIdx] + '20;color:' + colors[evt.colorIdx] + ';">' + colorOpts + '</select>' +
        '<button class="evt-del" title="\u5220\u9664">\u00D7</button>';

      container.appendChild(row);

      // 预设下拉事件
      var selectEl = row.querySelector('.evt-select');
      var nameInput = row.querySelector('.evt-in-name');
      selectEl.addEventListener('change', function() {
        if (this.value === 'custom') {
          // 自定义模式
          evt.presetIdx = undefined;
          nameInput.classList.add('visible');
          nameInput.value = '';
          evt.name = '';
          updateAll();
        } else {
          // 选择预设
          var idx = parseInt(this.value);
          var preset = presetEvents[idx];
          evt.presetIdx = idx;
          evt.name = preset.name;
          evt.intensity = preset.intensity;
          evt.type = preset.type;
          evt.duration = preset.duration;
          nameInput.classList.remove('visible');
          nameInput.value = preset.name;
          // 更新同行输入框
          row.querySelector('.evt-in-int').value = preset.intensity;
          row.querySelector('.evt-in-type').value = preset.type;
          row.querySelector('.evt-in-dur').value = preset.duration;
          updateAll();
        }
      });

      // 绑定输入事件
      nameInput.addEventListener('input', function() { evt.name = this.value; updateMainChart(); updateIndividualChart(); updatePersonalitySummary(); });
      row.querySelector('.evt-in-age').addEventListener('input', function() {
        var newAge = parseInt(this.value) || 0;
        var oldGroup = getAgeGroup(evt.age);
        evt.age = newAge;
        var newGroup = getAgeGroup(newAge);
        if (newGroup !== oldGroup) {
          evt.presetIdx = undefined;
          evt.name = '';
          nameInput.classList.add('visible');
          nameInput.value = '';
          // 直接更新下拉选项，避免全量重新渲染
          var group = getAgeGroup(newAge);
          var indices = getPresetIndicesForGroup(group);
          var opts = indices.map(function(i) {
            var pe = presetEvents[i];
            return '<option value="' + i + '">' + pe.name + '</option>';
          }).join('');
          selectEl.innerHTML = opts + '<option value="custom" selected>\u270F\uFE0F \u81EA\u5B9A\u4E49\u4E8B\u4EF6...</option>';
        }
        updateMainChart(); updateIndividualChart(); updatePersonalitySummary(); updateStatsPanel();
      });
      row.querySelector('.evt-in-int').addEventListener('input', function() { evt.intensity = parseFloat(this.value) || 0; updateMainChart(); updateIndividualChart(); updatePersonalitySummary(); });
      row.querySelector('.evt-in-type').addEventListener('change', function() { evt.type = this.value; updateMainChart(); updateIndividualChart(); updatePersonalitySummary(); });
      row.querySelector('.evt-in-dur').addEventListener('input', function() { evt.duration = parseInt(this.value) || 1; updateMainChart(); updateIndividualChart(); updatePersonalitySummary(); });
      row.querySelector('.evt-in-color').addEventListener('change', function() {
        evt.colorIdx = parseInt(this.value);
        this.style.background = colors[evt.colorIdx] + '20';
        this.style.color = colors[evt.colorIdx];
        updateAll();
      });
      row.querySelector('.evt-del').addEventListener('click', function() {
        events = events.filter(function(e) { return e.id !== evt.id; });
        renderEventList();
        updateAll();
      });
    });
  }

  // ===== 主图表 =====
  function initMainChart() {
    var dom = document.getElementById('chartMain');
    if (!dom) return;
    if (charts.main) charts.main.dispose();
    charts.main = echarts.init(dom, null, { renderer: 'svg' });
    updateMainChart();
  }

  function updateMainChart() {
    if (!charts.main) return;
    var ts = generateTimeSeries();
    var series = [];

    if (viewMode === 'all') {
      series.push({
        type: 'line', name: '\u6027\u683c\u5f62\u6210\u66f2\u7ebf',
        data: ts.ages.map(function(a, i) { return [a, ts.values[i]]; }),
        smooth: true, showSymbol: false,
        lineStyle: { color: '#f43f5e', width: 3 },
        areaStyle: { color: 'rgba(244,63,94,0.1)' },
        markLine: {
          silent: true, symbol: 'none',
          data: [
            { yAxis: 0, lineStyle: { color: '#334155', type: 'dashed' } }
          ]
        }
      });
      // 叠加每个事件的影响（半透明）
      events.forEach(function(evt) {
        if (!isEventActive(evt)) return;
        var curve = eventCurve(evt);
        series.push({
          type: 'line', name: evt.name,
          data: curve,
          smooth: true, showSymbol: false,
          lineStyle: { color: colors[evt.colorIdx % colors.length], width: 1, opacity: 0.35 },
          silent: true
        });
      });
    } else if (viewMode === 'stack') {
      // 堆叠显示
      events.forEach(function(evt) {
        if (!isEventActive(evt)) return;
        var curve = eventCurve(evt);
        series.push({
          type: 'line', name: evt.name, stack: 'total',
          data: curve,
          smooth: true, showSymbol: false,
          lineStyle: { color: colors[evt.colorIdx % colors.length], width: 2 },
          areaStyle: { color: colors[evt.colorIdx % colors.length] + '30' }
        });
      });
    } else if (viewMode === 'individual') {
      // 只显示总曲线
      series.push({
        type: 'line', name: '\u6027\u683c\u5f62\u6210\u66f2\u7ebf',
        data: ts.ages.map(function(a, i) { return [a, ts.values[i]]; }),
        smooth: true, showSymbol: false,
        lineStyle: { color: '#f43f5e', width: 3 },
        areaStyle: { color: 'rgba(244,63,94,0.12)' },
        markLine: {
          silent: true, symbol: 'none',
          data: [
            { yAxis: 0, lineStyle: { color: '#334155', type: 'dashed' } }
          ]
        }
      });
    }

    // 标记事件点
    var markPoints = events.filter(isEventActive).map(function(evt) {
      return {
        name: evt.name,
        coord: [evt.age, convolve(evt.age)],
        value: evt.name,
        itemStyle: { color: colors[evt.colorIdx % colors.length] }
      };
    });

    if (series.length > 0 && viewMode !== 'stack') {
      series[0].markPoint = {
        data: markPoints,
        symbolSize: 10,
        label: { show: false }
      };
    }

    var opt = commonOption();
    opt.title = { text: '\u6027\u683c\u5f62\u6210\u66f2\u7ebf\uff08' + (viewMode === 'all' ? '\u53e0\u52a0+\u5206\u91cf' : viewMode === 'stack' ? '\u5806\u53e0' : '\u603b\u66f2\u7ebf') + '\uff09', left: 'center', top: 5, textStyle: { color: '#f43f5e', fontSize: 13 } };
    opt.legend = viewMode === 'individual' ? undefined : {
      data: series.map(function(s) { return s.name; }),
      top: 28, textStyle: { color: '#94a3b8', fontSize: 10 },
      itemWidth: 14, itemHeight: 3,
      type: 'scroll'
    };
    opt.tooltip.formatter = function(params) {
      if (!params || !params.length) return '';
      var res = '\u5e74\u9f84 ' + params[0].value[0] + ' \u5c81<br/>';
      params.forEach(function(p) {
        if (Math.abs(p.value[1]) > 0.01 || p.seriesName === '\u6027\u683c\u5f62\u6210\u66f2\u7ebf') {
          res += p.marker + ' ' + p.seriesName + ': ' + p.value[1].toFixed(2) + '<br/>';
        }
      });
      return res;
    };
    opt.series = series;
    charts.main.setOption(opt, true);

    // 更新统计面板
    updateStats(ts.values);
  }

  // ===== 单独影响图表 =====
  function initIndividualChart() {
    var dom = document.getElementById('chartIndividual');
    if (!dom) return;
    if (charts.individual) charts.individual.dispose();
    charts.individual = echarts.init(dom, null, { renderer: 'svg' });
    updateIndividualChart();
  }

  function updateIndividualChart() {
    if (!charts.individual) return;
    var series = events.map(function(evt) {
      var curve = eventCurve(evt);
      return {
        type: 'line', name: evt.name,
        data: curve,
        smooth: true, showSymbol: false,
        lineStyle: { color: colors[evt.colorIdx % colors.length], width: 2 },
        areaStyle: { color: colors[evt.colorIdx % colors.length] + '15' }
      };
    });

    var opt = commonOption();
    opt.title = { text: '\u6bcf\u4e2a\u4e8b\u4ef6\u7684"\u6655\u67d3"\u8f68\u8ff9\uff08\u672a\u53e0\u52a0\uff09', left: 'center', top: 5, textStyle: { color: '#f43f5e', fontSize: 13 } };
    opt.legend = {
      data: events.map(function(e) { return e.name; }),
      top: 28, textStyle: { color: '#94a3b8', fontSize: 10 },
      itemWidth: 14, itemHeight: 3,
      type: 'scroll'
    };
    opt.series = series;
    charts.individual.setOption(opt, true);
  }

  // ===== 统计面板 =====
  function updateStats(values) {
    var grid = document.getElementById('mainStats');
    if (!grid) return;

    var maxVal = Math.max.apply(null, values);
    var minVal = Math.min.apply(null, values);
    var maxIdx = values.indexOf(maxVal);
    var minIdx = values.indexOf(minVal);
    var lastVal = values[values.length - 1];
    var avgVal = values.reduce(function(a, b) { return a + b; }, 0) / values.length;
    var activeEvents = events.filter(isEventActive);

    grid.innerHTML =
      '<div class="stat-box"><div class="slabel">\u5f53\u524d\u6027\u683c\u503c</div><div class="svalue">' + lastVal.toFixed(1) + '</div></div>' +
      '<div class="stat-box"><div class="slabel">\u4eba\u751f\u5cf0\u503c</div><div class="svalue">' + maxVal.toFixed(1) + ' (' + maxIdx + '\u5c81)</div></div>' +
      '<div class="stat-box"><div class="slabel">\u4eba\u751f\u4f4e\u8c37</div><div class="svalue">' + minVal.toFixed(1) + ' (' + minIdx + '\u5c81)</div></div>' +
      '<div class="stat-box"><div class="slabel">\u5e73\u5747\u6027\u683c\u503c</div><div class="svalue">' + avgVal.toFixed(1) + '</div></div>' +
      '<div class="stat-box"><div class="slabel">\u4e8b\u4ef6\u6570\u91cf</div><div class="svalue">' + activeEvents.length + '</div></div>' +
      '<div class="stat-box"><div class="slabel">\u6b63/\u8d1f\u4e8b\u4ef6</div><div class="svalue">' +
      activeEvents.filter(function(e) { return e.intensity > 0; }).length + ' / ' +
      activeEvents.filter(function(e) { return e.intensity < 0; }).length + '</div></div>';
  }

  // ===== 更新所有图表 =====
  function updateAll() {
    updateMainChart();
    updateIndividualChart();
    updatePersonalitySummary();
  }

  function updateStatsPanel() {
    var ts = generateTimeSeries();
    updateStats(ts.values);
  }

  // ===== 性格画像生成 =====
  function updatePersonalitySummary() {
    var summaryEl = document.getElementById('personalitySummary');
    var traitsEl = document.getElementById('personalityTraits');
    if (!summaryEl || !traitsEl) return;
    if (events.length === 0) {
      summaryEl.innerHTML = '<p style="color:var(--muted);">\u6dfb\u52a0\u4eba\u751f\u4e8b\u4ef6\u540e\uff0c\u8fd9\u91cc\u4f1a\u81ea\u52a8\u751f\u6210\u4f60\u7684\u6027\u683c\u753b\u50cf\u63cf\u8ff0...</p>';
      traitsEl.innerHTML = '';
      return;
    }

    var lastVal = convolve(currentAge);
    var ts = generateTimeSeries();
    var values = ts.values;
    var maxVal = Math.max.apply(null, values);
    var minVal = Math.min.apply(null, values);
    var avgVal = values.reduce(function(a, b) { return a + b; }, 0) / values.length;
    var posCount = events.filter(function(e) { return isEventActive(e) && e.intensity > 0; }).length;
    var negCount = events.filter(function(e) { return isEventActive(e) && e.intensity < 0; }).length;

    // 计算波动性（标准差）
    var variance = values.reduce(function(sum, v) { return sum + (v - avgVal) * (v - avgVal); }, 0) / values.length;
    var stdDev = Math.sqrt(variance);

    // 计算趋势（后半段vs前半段）
    var half = Math.floor(values.length / 2);
    var firstHalf = values.slice(0, half);
    var secondHalf = values.slice(half);
    var firstAvg = firstHalf.reduce(function(a, b) { return a + b; }, 0) / firstHalf.length;
    var secondAvg = secondHalf.reduce(function(a, b) { return a + b; }, 0) / secondHalf.length;
    var trend = secondAvg - firstAvg;

    // 计算恢复力（从低谷恢复的速度）
    var minIdx = values.indexOf(minVal);
    var recoveryRange = values.slice(minIdx, Math.min(minIdx + 10, values.length));
    var recoverySpeed = recoveryRange.length > 1 ? (recoveryRange[recoveryRange.length - 1] - recoveryRange[0]) / recoveryRange.length : 0;

    // 生成性格描述
    var desc = '';

    // 整体基调
    if (lastVal > 5) {
      desc += '\u5f53\u524d\u4f60\u7684\u6027\u683c\u72b6\u6001\u503c\u4e3a <span class="highlight">' + lastVal.toFixed(1) + '</span>\uff0c\u5904\u4e8e<span class="positive">\u79ef\u6781\u5065\u5eb7</span>\u7684\u8303\u7574\u3002';
    } else if (lastVal > 1) {
      desc += '\u5f53\u524d\u4f60\u7684\u6027\u683c\u72b6\u6001\u503c\u4e3a <span class="highlight">' + lastVal.toFixed(1) + '</span>\uff0c\u6574\u4f53\u504f<span class="positive">\u4e50\u89c2\u79ef\u6781</span>\uff0c\u4f46\u5e76\u975e\u6ca1\u6709\u9634\u5f71\u3002';
    } else if (lastVal > -2) {
      desc += '\u5f53\u524d\u4f60\u7684\u6027\u683c\u72b6\u6001\u503c\u4e3a <span class="highlight">' + lastVal.toFixed(1) + '</span>\uff0c\u5904\u4e8e<span class="negative">\u5185\u8017\u4e0e\u4e50\u89c2\u4ea4\u7ec7</span>\u7684\u72b6\u6001\u3002';
    } else {
      desc += '\u5f53\u524d\u4f60\u7684\u6027\u683c\u72b6\u6001\u503c\u4e3a <span class="highlight">' + lastVal.toFixed(1) + '</span>\uff0c\u5904\u4e8e<span class="negative">\u8f83\u4e3a\u56f0\u96be</span>\u7684\u5fc3\u7406\u72b6\u6001\u3002';
    }

    // 波动性
    if (stdDev > 8) {
      desc += '\u4f60\u7684\u6027\u683c\u66f2\u7ebf<span class="highlight">\u6ce2\u52a8\u5267\u70c8</span>\uff0c\u5927\u8d77\u5927\u843d\u662f\u4f60\u7684\u5e38\u6001\u3002\u8fd9\u610f\u5473\u7740\u4f60\u53ef\u80fd\u662f\u4e00\u4e2a\u611f\u53d7\u529b\u5f88\u5f3a\u7684\u4eba\uff0c\u4f46\u4e5f\u5bb9\u6613\u88ab\u60c5\u7eea\u5e26\u8d70\u3002';
    } else if (stdDev > 4) {
      desc += '\u4f60\u7684\u6027\u683c\u66f2\u7ebf\u6709<span class="highlight">\u660e\u663e\u7684\u8d77\u4f0f</span>\uff0c\u4f60\u7ecf\u5386\u8fc7\u663e\u8457\u7684\u9ad8\u5cf0\u548c\u4f4e\u8c37\u3002\u8fd9\u79cd\u6ce2\u6298\u8d4b\u4e88\u4e86\u4f60\u8f83\u6df1\u7684\u4eba\u751f\u4f53\u9a8c\u3002';
    } else {
      desc += '\u4f60\u7684\u6027\u683c\u66f2\u7ebf<span class="highlight">\u76f8\u5bf9\u5e73\u7a33</span>\uff0c\u6ca1\u6709\u592a\u5927\u7684\u5267\u70c8\u6ce2\u52a8\u3002\u4f60\u53ef\u80fd\u662f\u4e00\u4e2a\u60c5\u7eea\u7a33\u5b9a\u7684\u4eba\uff0c\u4e5f\u53ef\u80fd\u662f\u5df2\u7ecf\u5b66\u4f1a\u4e86\u5e73\u9759\u5730\u63a5\u53d7\u4e00\u5207\u3002';
    }

    // 趋势
    if (trend > 3) {
      desc += '\u4f60\u7684\u4eba\u751f\u8d70\u5411<span class="positive">\u8d8a\u6765\u8d8a\u597d</span>\uff0c\u540e\u534a\u6bb5\u660e\u663e\u4f18\u4e8e\u524d\u534a\u6bb5\u3002\u8bf4\u660e\u4f60\u6709\u5f88\u5f3a\u7684\u81ea\u6211\u4fee\u590d\u80fd\u529b\u3002';
    } else if (trend > 0) {
      desc += '\u4f60\u7684\u4eba\u751f<span class="positive">\u7f13\u6162\u4e0a\u5347</span>\u4e2d\uff0c\u867d\u7136\u4e0d\u662f\u4e00\u5e06\u98ce\u987a\uff0c\u4f46\u6574\u4f53\u5728\u5411\u597d\u7684\u65b9\u5411\u53d1\u5c55\u3002';
    } else if (trend > -3) {
      desc += '\u4f60\u7684\u4eba\u751f<span class="negative">\u6709\u4e9b\u4e0b\u6ed1</span>\u7684\u8d8b\u52bf\uff0c\u53ef\u80fd\u662f\u8fd1\u671f\u7684\u4e00\u4e9b\u632b\u6298\u8ba9\u4f60\u611f\u5230\u7591\u60d1\u3002\u4f46\u8bb0\u4f4f\uff0c\u5377\u79ef\u544a\u8bc9\u6211\u4eec\uff0c\u65b0\u7684\u6b63\u5411\u4e8b\u4ef6\u53ef\u4ee5\u9010\u6e10\u8986\u76d6\u8fc7\u53bb\u3002';
    } else {
      desc += '\u4f60\u7684\u4eba\u751f\u76ee\u524d<span class="negative">\u5904\u4e8e\u4e0b\u964d\u901a\u9053</span>\uff0c\u8fd1\u671f\u53ef\u80fd\u7ecf\u5386\u4e86\u591a\u6b21\u6253\u51fb\u3002\u4f46\u5377\u79ef\u7684\u7ebf\u6027\u6027\u8d28\u610f\u5473\u7740\uff1a\u5f15\u5165\u65b0\u7684\u6301\u7eed\u6b63\u5411\u4e8b\u4ef6\uff0c\u5c31\u80fd\u9010\u6e10\u53cd\u8f6c\u8d70\u52bf\u3002';
    }

    // 恢复力
    if (recoverySpeed > 0.5) {
      desc += '\u4ece\u4eba\u751f\u4f4e\u8c37\u4e2d\uff0c\u4f60\u5c55\u73b0\u51fa<span class="positive">\u5f3a\u5927\u7684\u6062\u590d\u529b</span>\u3002\u4f24\u75db\u5bf9\u4f60\u6765\u8bf4\u662f\u6709\u6548\u7684\u8bfe\u7a0b\uff0c\u800c\u4e0d\u662f\u6c38\u8fdc\u7684\u7eca\u9501\u3002';
    } else if (recoverySpeed > 0) {
      desc += '\u4ece\u4f4e\u8c37\u4e2d\u6062\u590d\u7684\u901f\u5ea6<span class="neutral">\u4e0d\u7d27\u4e0d\u6162</span>\uff0c\u4f60\u9700\u8981\u8f83\u957f\u65f6\u95f4\u6765\u6d88\u5316\u4f24\u75db\uff0c\u4f46\u6700\u7ec8\u80fd\u8d70\u51fa\u6765\u3002';
    } else {
      desc += '\u4f60\u7684\u6062\u590d\u529b<span class="negative">\u8f83\u5f31</span>\uff0c\u4f24\u75db\u7684\u5f71\u54cd\u5f88\u96be\u81ea\u884c\u6d88\u9000\u3002\u5982\u679c\u8fd9\u6837\uff0c\u5bfb\u6c42\u5916\u90e8\u652f\u6301\uff08\u5fc3\u7406\u54a8\u8be2\u3001\u4eb2\u5bc6\u5173\u7cfb\uff09\u662f\u5f88\u91cd\u8981\u7684\u3002';
    }

    // 事件构成
    if (posCount > negCount * 2) {
      desc += '\u4f60\u7684\u4eba\u751f\u4e2d<span class="positive">\u79ef\u6781\u4e8b\u4ef6\u8fdc\u8d85\u8d1f\u9762\u4e8b\u4ef6</span>\uff0c\u4f60\u53ef\u80fd\u662f\u4e00\u4e2a\u5929\u751f\u4e50\u89c2\u6d3e\u3002';
    } else if (negCount > posCount * 2) {
      desc += '\u4f60\u7684\u4eba\u751f\u4e2d<span class="negative">\u8d1f\u9762\u4e8b\u4ef6\u660e\u663e\u591a\u4e8e\u79ef\u6781\u4e8b\u4ef6</span>\uff0c\u4f46\u4f60\u4ecd\u7136\u5728\u8fd9\u91cc\u2014\u2014\u8fd9\u672c\u8eab\u5c31\u8bc1\u660e\u4e86\u4f60\u7684\u97e7\u6027\u3002';
    } else {
      desc += '\u4f60\u7684\u4eba\u751f\u4e2d\u79ef\u6781\u548c\u8d1f\u9762\u4e8b\u4ef6<span class="neutral">\u53c2\u534a\u5f00</span>\uff0c\u8fd9\u662f\u5927\u591a\u6570\u4eba\u7684\u771f\u5b9e\u72b6\u6001\u3002';
    }

    summaryEl.innerHTML = '<p>' + desc + '</p>';

    // 性格标签
    var traits = [];
    // 核心性格维度
    if (lastVal > 3) traits.push({ label: '\u5b89\u5168\u611f', value: '\u8f83\u9ad8', type: 'positive' });
    else if (lastVal < -3) traits.push({ label: '\u5b89\u5168\u611f', value: '\u8f83\u4f4e', type: 'negative' });
    else traits.push({ label: '\u5b89\u5168\u611f', value: '\u4e2d\u7b49', type: 'neutral' });

    if (stdDev > 6) traits.push({ label: '\u60c5\u7eea\u7a33\u5b9a\u6027', value: '\u6ce2\u52a8\u578b', type: 'neutral' });
    else traits.push({ label: '\u60c5\u7eea\u7a33\u5b9a\u6027', value: '\u7a33\u5b9a\u578b', type: 'positive' });

    if (trend > 2) traits.push({ label: '\u4eba\u751f\u8d70\u52bf', value: '\u2191 \u4e0a\u5347\u671f', type: 'positive' });
    else if (trend < -2) traits.push({ label: '\u4eba\u751f\u8d70\u52bf', value: '\u2193 \u4e0b\u964d\u671f', type: 'negative' });
    else traits.push({ label: '\u4eba\u751f\u8d70\u52bf', value: '\u2194 \u5e73\u7a33\u671f', type: 'neutral' });

    if (recoverySpeed > 0.3) traits.push({ label: '\u5fc3\u7406\u97e7\u6027', value: '\u5f3a', type: 'positive' });
    else traits.push({ label: '\u5fc3\u7406\u97e7\u6027', value: '\u5f85\u589e\u5f3a', type: 'neutral' });

    if (maxVal - minVal > 15) traits.push({ label: '\u4eba\u751f\u5e45\u5ea6', value: '\u5927\u8d77\u5927\u843d', type: 'neutral' });
    else if (maxVal - minVal > 8) traits.push({ label: '\u4eba\u751f\u5e45\u5ea6', value: '\u6709\u6ce2\u6298', type: 'neutral' });
    else traits.push({ label: '\u4eba\u751f\u5e45\u5ea6', value: '\u5e73\u7a33', type: 'positive' });

    // 衰减类型统计
    var activeEvtList = events.filter(isEventActive);
    var expCount = activeEvtList.filter(function(e) { return e.type === 'exponential'; }).length;
    var gaussCount = activeEvtList.filter(function(e) { return e.type === 'gaussian'; }).length;
    var dampedCount = activeEvtList.filter(function(e) { return e.type === 'damped'; }).length;
    var stepCount = activeEvtList.filter(function(e) { return e.type === 'step'; }).length;

    if (expCount >= 3) traits.push({ label: '\u8bb0\u5fc6\u6a21\u5f0f', value: '\u6df1\u523b\u578b', type: 'neutral' });
    else if (gaussCount >= 3) traits.push({ label: '\u8bb0\u5fc6\u6a21\u5f0f', value: '\u6de1\u5fd8\u578b', type: 'positive' });
    else traits.push({ label: '\u8bb0\u5fc6\u6a21\u5f0f', value: '\u6df7\u5408\u578b', type: 'neutral' });

    if (dampedCount >= 2) traits.push({ label: '\u60c5\u7eea\u6a21\u5f0f', value: '\u53cd\u590d\u7ea0\u7ed3\u578b', type: 'negative' });
    if (stepCount >= 2) traits.push({ label: '\u4f9d\u604b\u6a21\u5f0f', value: '\u957f\u671f\u4f9d\u604b\u578b', type: 'positive' });

    // 正负比
    var ratio = posCount / (negCount || 1);
    if (ratio > 2) traits.push({ label: '\u4e8b\u4ef6\u5f3a\u5ea6\u6bd4', value: posCount + ':' + negCount + ' \u504f\u6b63', type: 'positive' });
    else if (ratio < 0.5) traits.push({ label: '\u4e8b\u4ef6\u5f3a\u5ea6\u6bd4', value: posCount + ':' + negCount + ' \u504f\u8d1f', type: 'negative' });
    else traits.push({ label: '\u4e8b\u4ef6\u5f3a\u5ea6\u6bd4', value: posCount + ':' + negCount, type: 'neutral' });

    traitsEl.innerHTML = traits.map(function(t) {
      return '<div class="trait-tag ' + t.type + '"><div class="trait-label">' + t.label + '</div><div class="trait-value">' + t.value + '</div></div>';
    }).join('');
  }

  // ===== 绑定全局控制 =====
  function bindControls() {
    // 年龄范围
    var rangeMaxAge = document.getElementById('rangeMaxAge');
    var valRange = document.getElementById('valRange');
    if (rangeMaxAge && valRange) {
      rangeMaxAge.addEventListener('input', function() {
        maxAge = parseInt(this.value);
        valRange.textContent = '0 ~ ' + maxAge;
        updateAll();
      });
    }

    // 当前年龄
    var rangeCurrentAge = document.getElementById('rangeCurrentAge');
    var valCurrentAge = document.getElementById('valCurrentAge');
    if (rangeCurrentAge && valCurrentAge) {
      rangeCurrentAge.addEventListener('input', function() {
        var oldAge = currentAge;
        currentAge = parseInt(this.value);
        maxAge = currentAge;
        valCurrentAge.textContent = currentAge;
        // 同步更新时间范围滑块
        var rangeMaxAge = document.getElementById('rangeMaxAge');
        var valRange = document.getElementById('valRange');
        if (rangeMaxAge) {
          rangeMaxAge.value = currentAge;
          rangeMaxAge.max = currentAge;
        }
        if (valRange) valRange.textContent = '0 ~ ' + currentAge;
        // 移除超过当前年龄的事件
        events = events.filter(function(e) { return e.age <= currentAge; });
        // 如果年龄调高，为新增的年龄段自动添加空白事件行
        if (currentAge > oldAge) {
          var existingAges = events.map(function(e) { return e.age; });
          for (var a = oldAge + 1; a <= currentAge; a++) {
            // 只在每个年龄段的开头加一行（如果该年龄段还没有事件）
            var group = getAgeGroup(a);
            var hasEventInGroup = false;
            events.forEach(function(e) {
              if (getAgeGroup(e.age) === group) hasEventInGroup = true;
            });
            // 在年龄段的首个年龄添加
            if (a === ageGroups[group].min && !hasEventInGroup) {
              events.push({
                id: nextId++,
                name: '',
                age: ageGroups[group].min,
                intensity: 0,
                type: 'gaussian',
                duration: 5,
                colorIdx: (nextId - 1) % colors.length,
                presetIdx: undefined
              });
            }
          }
          // 按年龄排序
          events.sort(function(a, b) { return a.age - b.age; });
        }
        renderEventList();
        updateAll();
      });
    }

    // 视图模式
    document.querySelectorAll('#viewMode button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#viewMode button').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        viewMode = this.dataset.mode;
        var valMode = document.getElementById('valMode');
        if (valMode) valMode.textContent = this.textContent;
        updateAll();
      });
    });

    // 添加事件
    var btnAdd = document.getElementById('btnAddEvent');
    if (btnAdd) {
      btnAdd.addEventListener('click', function() {
        events.push({
          id: nextId++,
          name: '',
          age: Math.floor(maxAge / 2),
          intensity: 3,
          type: 'gaussian',
          duration: 5,
          colorIdx: (nextId - 1) % colors.length,
          presetIdx: undefined
        });
        renderEventList();
        updateAll();
      });
    }

    // 重置
    var btnReset = document.getElementById('btnReset');
    if (btnReset) {
      btnReset.addEventListener('click', function() {
        events = JSON.parse(JSON.stringify(defaultEvents));
        nextId = 16;
        renderEventList();
        updateAll();
      });
    }
  }

  // ===== 初始化 =====
  function initAll() {
    renderEventList();
    bindControls();
    initMainChart();
    initIndividualChart();
    updatePersonalitySummary();
  }

  window.addEventListener('resize', function() {
    if (charts.main) charts.main.resize();
    if (charts.individual) charts.individual.resize();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
