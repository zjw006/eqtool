(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg3 = style.getPropertyValue('--bg3').trim();

  function makeAxis(xMin, xMax) {
    return {
      type: 'value', min: xMin, max: xMax,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontFamily: 'JetBrainsMono', formatter: function(v){return v.toFixed(1);} },
      splitLine: { lineStyle: { color: bg2 } },
      axisTick: { lineStyle: { color: rule } }
    };
  }

  function makeOption(series, xMin, xMax, yMin, yMax) {
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 30, right: 30, bottom: 35, left: 55 },
      xAxis: makeAxis(xMin, xMax),
      yAxis: {
        type: 'value', min: yMin, max: yMax,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono' },
        splitLine: { lineStyle: { color: bg2 } },
        axisTick: { lineStyle: { color: rule } }
      },
      series: series,
      tooltip: {
        trigger: 'axis', appendToBody: true,
        backgroundColor: bg3, borderColor: rule,
        textStyle: { color: ink, fontFamily: 'JetBrainsMono' }
      }
    };
  }

  function genData(fn, xMin, xMax, n) {
    var data = [];
    for (var i = 0; i <= (n || 400); i++) {
      var x = xMin + (xMax - xMin) * i / (n || 400);
      var y = fn(x);
      data.push([x, isFinite(y) ? y : null]);
    }
    return data;
  }

  // Dichotomy chart
  var chartDichotomy = echarts.init(document.getElementById('chartDichotomy'), null, { renderer: 'svg' });
  var defaultFn = function(x) { return x*x*x - 2*x - 5; };
  var defaultLabel = 'f(x) = x³ − 2x − 5';

  function initDichotomy(fn, label, a, b) {
    var yVals = [];
    for (var i = 0; i <= 200; i++) {
      var x = a - 1 + (b - a + 2) * i / 200;
      var y = fn(x);
      if (isFinite(y)) yVals.push(y);
    }
    var yMin = Math.min.apply(null, yVals);
    var yMax = Math.max.apply(null, yVals);
    var yPad = (yMax - yMin) * 0.2 || 1;
    yMin -= yPad; yMax += yPad;

    chartDichotomy.setOption(makeOption([
      {
        type: 'line', name: label, data: genData(fn, a - 1, b + 1),
        smooth: true, showSymbol: false,
        lineStyle: { color: accent3, width: 2.5 },
        areaStyle: { color: 'transparent' }
      }
    ], a - 1, b + 1, yMin, yMax));

    chartDichotomy.setOption({
      title: {
        text: '点击"二分法求零点"按钮查看收敛过程',
        left: 'center', top: 40,
        textStyle: { color: muted, fontSize: 14, fontWeight: 400 }
      }
    });
  }

  window.updateDichotomyChart = function(fn, label, a, b) {
    initDichotomy(fn, label, a, b);
  };

  window.showDichotomySteps = function(steps) {
    if (!steps || steps.length === 0) return;
    var last = steps[steps.length - 1];
    var fn = defaultFn;
    var a = steps[0].a, b = steps[0].b;

    var yVals = [];
    for (var i = 0; i <= 200; i++) {
      var x = a - 1 + (b - a + 2) * i / 200;
      var y = fn(x);
      if (isFinite(y)) yVals.push(y);
    }
    var yMin = Math.min.apply(null, yVals);
    var yMax = Math.max.apply(null, yVals);
    var yPad = (yMax - yMin) * 0.2 || 1;
    yMin -= yPad; yMax += yPad;

    var markLines = [];
    var totalSteps = Math.min(steps.length, 8); // show last 8 steps
    var startIdx = steps.length - totalSteps;
    for (var i = startIdx; i < steps.length; i++) {
      var s = steps[i];
      var alpha = 0.15 + 0.1 * (i - startIdx);
      markLines.push({
        xAxis: s.mid,
        lineStyle: { color: accent, width: 1, type: 'solid', opacity: alpha }
      });
    }

    var markPoints = [{
      coord: [last.mid, last.fmid],
      symbol: 'circle', symbolSize: 10,
      itemStyle: { color: accent },
      label: {
        show: true, formatter: '零点 ≈ ' + last.mid.toFixed(6),
        color: accent2, fontSize: 13, fontWeight: 700,
        position: 'top'
      }
    }];

    // Show interval shading for last step
    var markAreas = [{
      xAxis: last.a, itemStyle: { color: 'rgba(244,63,94,0.06)' }
    }, {
      xAxis: last.b, itemStyle: { color: 'rgba(244,63,94,0.06)' }
    }];

    chartDichotomy.setOption(makeOption([
      {
        type: 'line', name: defaultLabel, data: genData(fn, a - 1, b + 1),
        smooth: true, showSymbol: false,
        lineStyle: { color: accent3, width: 2.5 },
        markLine: { silent: true, data: markLines },
        markPoint: { data: markPoints },
        markArea: { silent: true, data: markAreas }
      }
    ], a - 1, b + 1, yMin, yMax));

    chartDichotomy.setOption({
      title: {
        text: '二分法 ' + steps.length + ' 步，误差 ≤ ' + ((steps[0].b - steps[0].a) / Math.pow(2, steps.length)).toExponential(2),
        left: 'center', top: 40,
        textStyle: { color: accent2, fontSize: 14, fontWeight: 600 }
      }
    });

    defaultFn = fn;
    defaultLabel = defaultLabel;
  };

  initDichotomy(defaultFn, defaultLabel, 2, 3);

  // Multi-zero charts
  var chartMulti1 = echarts.init(document.getElementById('chartMulti1'), null, { renderer: 'svg' });
  var chartMulti2 = echarts.init(document.getElementById('chartMulti2'), null, { renderer: 'svg' });

  // x^3 - 3x = 0 has zeros at -√3, 0, √3
  var fn1 = function(x) { return x*x*x - 3*x; };
  chartMulti1.setOption(makeOption([
    { type: 'line', name: 'x³-3x', data: genData(fn1, -3, 3), smooth: true, showSymbol: false,
      lineStyle: { color: accent, width: 2.5 },
      markPoint: {
        data: [
          { coord: [-Math.sqrt(3), 0], symbol: 'circle', symbolSize: 8, itemStyle: { color: accent2 }, label: { show: true, formatter: '-√3', color: accent2, fontSize: 11, position: 'bottom' } },
          { coord: [0, 0], symbol: 'circle', symbolSize: 8, itemStyle: { color: accent2 }, label: { show: true, formatter: '0', color: accent2, fontSize: 11, position: 'top' } },
          { coord: [Math.sqrt(3), 0], symbol: 'circle', symbolSize: 8, itemStyle: { color: accent2 }, label: { show: true, formatter: '√3', color: accent2, fontSize: 11, position: 'bottom' } }
        ]
      }
    }
  ], -3, 3, -5, 5));
  chartMulti1.setOption({
    title: { text: 'x³ − 3x（3 个零点）', left: 'center', top: 5, textStyle: { color: ink, fontSize: 13, fontWeight: 600 } }
  });

  // sin(x) on [0, 4π] has zeros at 0, π, 2π, 3π, 4π
  var fn2 = function(x) { return Math.sin(x); };
  var sinZeros = [0, Math.PI, 2*Math.PI, 3*Math.PI, 4*Math.PI];
  var sinMarks = sinZeros.map(function(z) {
    return {
      coord: [z, 0], symbol: 'circle', symbolSize: 7,
      itemStyle: { color: accent2 },
      label: { show: true, formatter: (z/Math.PI).toFixed(0) === z/Math.PI ? (z/Math.PI) + 'π' : z.toFixed(1), color: accent2, fontSize: 10, position: 'bottom' }
    };
  });
  chartMulti2.setOption(makeOption([
    { type: 'line', name: 'sin(x)', data: genData(fn2, -0.5, 13), smooth: true, showSymbol: false,
      lineStyle: { color: accent3, width: 2.5 },
      markPoint: { data: sinMarks }
    }
  ], -0.5, 13, -1.5, 1.5));
  chartMulti2.setOption({
    title: { text: 'sin(x) 在 [0, 4π] 内（5 个零点）', left: 'center', top: 5, textStyle: { color: ink, fontSize: 13, fontWeight: 600 } }
  });

  window.addEventListener('resize', function() {
    chartDichotomy.resize(); chartMulti1.resize(); chartMulti2.resize();
  });
})();
