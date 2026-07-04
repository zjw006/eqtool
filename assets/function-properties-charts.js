(function() {
  var fnDefs = {
    poly2: { label: 'x²', domainArr: [-6, 6], rangeArr: [0, 36], fn: function(x){ return x*x; },
             mono: [{start:-6,end:0,type:'dec'},{start:0,end:6,type:'inc'}], parity:'even' },
    poly3: { label: 'x³', domainArr: [-6, 6], rangeArr: [-216, 216], fn: function(x){ return x*x*x; },
             mono: [{start:-6,end:6,type:'inc'}], parity:'odd' },
    sqrt:  { label: '√x', domainArr: [0, 6], rangeArr: [0, 2.45], fn: function(x){ return x>=0?Math.sqrt(x):NaN; },
             mono: [{start:0,end:6,type:'inc'}], parity:'none' },
    recip: { label: '1/x', domainArr: [-6, 6], rangeArr: [-6, 6], fn: function(x){ return x!==0?1/x:NaN; },
             mono: [{start:-6,end:0,type:'dec'},{start:0,end:6,type:'dec'}], parity:'odd' },
    exp:   { label: 'eˣ', domainArr: [-4, 4], rangeArr: [0.018, 54.6], fn: function(x){ return Math.exp(x); },
             mono: [{start:-4,end:4,type:'inc'}], parity:'none' },
    ln:    { label: 'ln(x)', domainArr: [0.1, 6], rangeArr: [-2.3, 1.79], fn: function(x){ return x>0?Math.log(x):NaN; },
             mono: [{start:0.1,end:6,type:'inc'}], parity:'none' },
    sin:   { label: 'sin(x)', domainArr: [-6.28, 6.28], rangeArr: [-1, 1], fn: function(x){ return Math.sin(x); },
             mono: [{start:-6.28,end:-4.71,type:'dec'},{start:-4.71,end:-1.57,type:'inc'},{start:-1.57,end:1.57,type:'dec'},{start:1.57,end:4.71,type:'inc'},{start:4.71,end:6.28,type:'dec'}], parity:'odd' },
    cos:   { label: 'cos(x)', domainArr: [-6.28, 6.28], rangeArr: [-1, 1], fn: function(x){ return Math.cos(x); },
             mono: [{start:-6.28,end:-3.14,type:'inc'},{start:-3.14,end:0,type:'dec'},{start:0,end:3.14,type:'inc'},{start:3.14,end:6.28,type:'dec'}], parity:'even' },
    abs:   { label: '|x|', domainArr: [-6, 6], rangeArr: [0, 6], fn: function(x){ return Math.abs(x); },
             mono: [{start:-6,end:0,type:'dec'},{start:0,end:6,type:'inc'}], parity:'even' },
    tan:   { label: 'tan(x)', domainArr: [-4.71, 4.71], rangeArr: [-10, 10], fn: function(x){
               var p=Math.PI/2; var k=Math.round(x/p); if(Math.abs(x-k*p)<0.05 && Math.abs(x-k*p-Math.PI)>0.05) return NaN; return Math.tan(x);
             }, mono: [{start:-4.71,end:-1.57,type:'inc'},{start:-1.57,end:1.57,type:'inc'},{start:1.57,end:4.71,type:'inc'}], parity:'odd' }
  };

  var charts = {};

  function isInDomain(fnKey, x) {
    if (fnKey === 'recip') return x !== 0;
    if (fnKey === 'tan') {
      var p = Math.PI/2;
      var k = Math.round(x / p);
      return Math.abs(x - k * p) > 0.08 || Math.abs(x - k * p - Math.PI) < 0.08;
    }
    if (fnKey === 'sqrt') return x >= 0;
    if (fnKey === 'ln') return x > 0;
    return true;
  }

  function genData(fnKey, n) {
    var d = fnDefs[fnKey];
    var data = [];
    for (var i = 0; i <= n; i++) {
      var x = d.domainArr[0] + (d.domainArr[1] - d.domainArr[0]) * i / n;
      if (!isInDomain(fnKey, x)) continue;
      var y = d.fn(x);
      if (isFinite(y)) data.push([x, y]);
    }
    return data;
  }

  function genNegData(fnKey, n) {
    var d = fnDefs[fnKey];
    var data = [];
    for (var i = 0; i <= n; i++) {
      var x = d.domainArr[0] + (d.domainArr[1] - d.domainArr[0]) * i / n;
      if (!isInDomain(fnKey, x)) continue;
      var y = d.fn(-x);
      if (isFinite(y)) data.push([x, y]);
    }
    return data;
  }

  function commonOption() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
      grid: { left: 50, right: 30, top: 30, bottom: 40 },
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } }
    };
  }

  // ===== Domain Chart: shows domain interval on x-axis =====
  function initDomainChart(fnKey) {
    var d = fnDefs[fnKey];
    var dom = document.getElementById('chartDomain');
    if (!dom) return;
    if (charts.domain) charts.domain.dispose();
    charts.domain = echarts.init(dom, null, { renderer: 'svg' });

    var data = genData(fnKey, 200);
    var markAreas = [];

    // Domain markArea
    if (fnKey === 'recip') {
      markAreas.push([{ xAxis: -6 }, { xAxis: 0, itemStyle: { color: 'rgba(20,184,166,0.12)' } }]);
      markAreas.push([{ xAxis: 0 }, { xAxis: 6, itemStyle: { color: 'rgba(20,184,166,0.12)' } }]);
    } else if (fnKey === 'tan') {
      markAreas.push([{ xAxis: -4.71 }, { xAxis: -1.57, itemStyle: { color: 'rgba(20,184,166,0.12)' } }]);
      markAreas.push([{ xAxis: -1.57 }, { xAxis: 1.57, itemStyle: { color: 'rgba(20,184,166,0.12)' } }]);
      markAreas.push([{ xAxis: 1.57 }, { xAxis: 4.71, itemStyle: { color: 'rgba(20,184,166,0.12)' } }]);
    } else {
      markAreas.push([{ xAxis: d.domainArr[0] }, { xAxis: d.domainArr[1], itemStyle: { color: 'rgba(20,184,166,0.12)' } }]);
    }

    var opt = commonOption();
    opt.title = { text: '有效定义域区间（青色背景）', left: 'center', top: 5, textStyle: { color: '#14b8a6', fontSize: 12 } };
    opt.xAxis.min = d.domainArr[0] - 1;
    opt.xAxis.max = d.domainArr[1] + 1;
    opt.yAxis.min = -1; opt.yAxis.max = 1;
    opt.yAxis.axisLabel.show = false;
    opt.yAxis.splitLine.show = false;
    opt.series = [{
      type: 'line', data: data, showSymbol: false, smooth: true,
      lineStyle: { color: '#22d3ee', width: 2 },
      markArea: { silent: true, data: markAreas },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
        data: fnKey === 'recip' ? [{ xAxis: 0, label: { formatter: 'x=0 无定义', color: '#ef4444', fontSize: 10 } }] :
              fnKey === 'tan' ? [{ xAxis: -1.57, label: { formatter: 'x=-π/2', color: '#ef4444', fontSize: 10 } },
                                  { xAxis: 1.57, label: { formatter: 'x=π/2', color: '#ef4444', fontSize: 10 } }] :
              fnKey === 'sqrt' ? [{ xAxis: 0, label: { formatter: 'x=0 起点', color: '#f59e0b', fontSize: 10 } }] :
              fnKey === 'ln' ? [{ xAxis: 0, label: { formatter: 'x=0 渐近线', color: '#ef4444', fontSize: 10 } }] : []
      }
    }];
    charts.domain.setOption(opt);
  }

  // ===== Range Chart: shows range on y-axis =====
  function initRangeChart(fnKey) {
    var d = fnDefs[fnKey];
    var dom = document.getElementById('chartRange');
    if (!dom) return;
    if (charts.range) charts.range.dispose();
    charts.range = echarts.init(dom, null, { renderer: 'svg' });

    var data = genData(fnKey, 200);
    var yMin = Infinity, yMax = -Infinity;
    for (var i = 0; i < data.length; i++) {
      yMin = Math.min(yMin, data[i][1]);
      yMax = Math.max(yMax, data[i][1]);
    }
    if (!isFinite(yMin)) { yMin = -3; yMax = 3; }
    var yPad = (yMax - yMin) * 0.15 || 1;

    var opt = commonOption();
    opt.title = { text: '有效值域区间（橙色背景）', left: 'center', top: 5, textStyle: { color: '#f59e0b', fontSize: 12 } };
    opt.xAxis.min = d.domainArr[0]; opt.xAxis.max = d.domainArr[1];
    opt.yAxis.min = yMin - yPad; opt.yAxis.max = yMax + yPad;
    opt.series = [{
      type: 'line', data: data, showSymbol: false, smooth: true,
      lineStyle: { color: '#22d3ee', width: 2 },
      markArea: { silent: true, data: [[
        { yAxis: yMin, itemStyle: { color: 'rgba(245,158,11,0.10)' } },
        { yAxis: yMax }
      ]]}
    }];
    charts.range.setOption(opt);
  }

  // ===== Monotonicity Chart: colored intervals =====
  function initMonoChart(fnKey) {
    var d = fnDefs[fnKey];
    var dom = document.getElementById('chartMono');
    if (!dom) return;
    if (charts.mono) charts.mono.dispose();
    charts.mono = echarts.init(dom, null, { renderer: 'svg' });

    // Generate multiple series for different monotonic intervals
    var series = [];
    var mono = d.mono;

    // First, generate full curve data
    var fullData = genData(fnKey, 300);

    // Split data by monotonic intervals
    if (mono && mono.length > 0) {
      mono.forEach(function(m, idx) {
        var segData = [];
        for (var i = 0; i < fullData.length; i++) {
          var pt = fullData[i];
          if (pt[0] >= m.start - 0.01 && pt[0] <= m.end + 0.01) {
            segData.push(pt);
          }
        }
        if (segData.length > 0) {
          series.push({
            type: 'line', data: segData, showSymbol: false, smooth: true,
            lineStyle: { color: m.type === 'inc' ? '#10b981' : '#ef4444', width: 3 },
            name: m.type === 'inc' ? '递增' : '递减'
          });
        }
      });
    } else {
      series.push({
        type: 'line', data: fullData, showSymbol: false, smooth: true,
        lineStyle: { color: '#22d3ee', width: 2 }
      });
    }

    // Add legend for mono chart
    var legendData = [];
    if (mono && mono.length > 0) {
      var hasInc = mono.some(function(m){ return m.type === 'inc'; });
      var hasDec = mono.some(function(m){ return m.type === 'dec'; });
      if (hasInc) legendData.push('递增');
      if (hasDec) legendData.push('递减');
    }

    var opt = commonOption();
    opt.title = { text: '单调区间：绿色=递增，红色=递减', left: 'center', top: 5, textStyle: { color: '#f1f5f9', fontSize: 12 } };
    opt.xAxis.min = d.domainArr[0]; opt.xAxis.max = d.domainArr[1];
    var yMin = Infinity, yMax = -Infinity;
    for (var i = 0; i < fullData.length; i++) {
      yMin = Math.min(yMin, fullData[i][1]); yMax = Math.max(yMax, fullData[i][1]);
    }
    var yPad = (yMax - yMin) * 0.1 || 1;
    opt.yAxis.min = yMin - yPad; opt.yAxis.max = yMax + yPad;
    opt.legend = legendData.length > 0 ? {
      data: legendData, top: 25, textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 18, itemHeight: 3
    } : undefined;
    opt.series = series;
    charts.mono.setOption(opt);
  }

  // ===== Parity Chart: compare f(x) and f(-x) =====
  function initParityChart(fnKey) {
    var d = fnDefs[fnKey];
    var dom = document.getElementById('chartParity');
    if (!dom) return;
    if (charts.parity) charts.parity.dispose();
    charts.parity = echarts.init(dom, null, { renderer: 'svg' });

    var data = genData(fnKey, 200);
    var negData = genNegData(fnKey, 200);

    var series = [{
      type: 'line', data: data, showSymbol: false, smooth: true,
      lineStyle: { color: '#22d3ee', width: 2.5 }, name: 'f(x)'
    }];

    if (d.parity !== 'none') {
      series.push({
        type: 'line', data: negData, showSymbol: false, smooth: true,
        lineStyle: { color: d.parity === 'even' ? '#14b8a6' : '#ef4444', width: 2, type: 'dashed' },
        name: d.parity === 'even' ? 'f(-x) = f(x)' : 'f(-x) = -f(x)'
      });
    } else {
      series.push({
        type: 'line', data: negData, showSymbol: false, smooth: true,
        lineStyle: { color: '#94a3b8', width: 2, type: 'dashed' },
        name: 'f(-x) ≠ ±f(x)'
      });
    }

    var yMin = Infinity, yMax = -Infinity;
    for (var i = 0; i < data.length; i++) {
      yMin = Math.min(yMin, data[i][1], negData[i] ? negData[i][1] : Infinity);
      yMax = Math.max(yMax, data[i][1], negData[i] ? negData[i][1] : -Infinity);
    }
    var yPad = (yMax - yMin) * 0.15 || 1;

    var opt = commonOption();
    var titleText = d.parity === 'even' ? '偶函数：f(x) 与 f(-x) 完全重合（关于 y 轴对称）' :
                    d.parity === 'odd' ? '奇函数：f(-x) = -f(x)（关于原点对称）' :
                    '非奇非偶：f(x) 与 f(-x) 无对称关系';
    opt.title = { text: titleText, left: 'center', top: 5, textStyle: { color: '#f1f5f9', fontSize: 12 } };
    opt.xAxis.min = d.domainArr[0]; opt.xAxis.max = d.domainArr[1];
    opt.yAxis.min = yMin - yPad; opt.yAxis.max = yMax + yPad;
    opt.legend = { data: ['f(x)', series[1].name], top: 25, textStyle: { color: '#94a3b8', fontSize: 11 } };
    opt.series = series;
    charts.parity.setOption(opt);
  }

  // ===== Update all charts =====
  function updateAll(fnKey) {
    initDomainChart(fnKey);
    initRangeChart(fnKey);
    initMonoChart(fnKey);
    initParityChart(fnKey);
  }

  window.updateFunctionCharts = updateAll;

  // Initial render
  document.addEventListener('DOMContentLoaded', function() {
    updateAll('poly2');
  });

  window.addEventListener('resize', function() {
    Object.values(charts).forEach(function(c) { if (c) c.resize(); });
  });
})();
