(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg = style.getPropertyValue('--bg').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg3 = style.getPropertyValue('--bg3').trim();

  // Parameters
  var A = 1, omega = 1, phi = 0;
  var xMin = -4 * Math.PI, xMax = 4 * Math.PI;
  var steps = 800;

  function generateData(fn, a, w, p, ymin, ymax) {
    var data = [];
    for (var i = 0; i <= steps; i++) {
      var x = xMin + (xMax - xMin) * i / steps;
      var y = a * fn(w * x + p);
      if (ymin !== undefined && y < ymin) y = ymin;
      if (ymax !== undefined && y > ymax) y = ymax;
      data.push([x, y]);
    }
    return data;
  }

  function makeAxis() {
    return {
      type: 'value',
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontFamily: 'JetBrainsMono' },
      splitLine: { lineStyle: { color: bg2 } },
      axisTick: { lineStyle: { color: rule } }
    };
  }

  function makeOption(series, yMin, yMax) {
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 30, right: 30, bottom: 30, left: 50 },
      xAxis: makeAxis(),
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono' },
        splitLine: { lineStyle: { color: bg2 } },
        axisTick: { lineStyle: { color: rule } }
      },
      series: series,
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        backgroundColor: bg3,
        borderColor: rule,
        textStyle: { color: ink, fontFamily: 'JetBrainsMono' }
      }
    };
  }

  // Init charts
  var chartSin = echarts.init(document.getElementById('chartSin'), null, { renderer: 'svg' });
  var chartCos = echarts.init(document.getElementById('chartCos'), null, { renderer: 'svg' });
  var chartTan = echarts.init(document.getElementById('chartTan'), null, { renderer: 'svg' });
  var chartCompare = echarts.init(document.getElementById('chartCompare'), null, { renderer: 'svg' });

  function updateCharts() {
    var sinData = generateData(Math.sin, A, omega, phi);
    var cosData = generateData(Math.cos, A, omega, phi);
    var tanData = generateData(Math.tan, A, omega, phi, -8, 8);

    // Sin
    chartSin.setOption(makeOption([{
      type: 'line',
      data: sinData,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: accent, width: 2.5 },
      areaStyle: { color: accent + '18' }
    }], -3.5, 3.5));

    // Cos
    chartCos.setOption(makeOption([{
      type: 'line',
      data: cosData,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: accent2, width: 2.5 },
      areaStyle: { color: accent2 + '18' }
    }], -3.5, 3.5));

    // Tan
    chartTan.setOption(makeOption([{
      type: 'line',
      data: tanData,
      smooth: false,
      showSymbol: false,
      lineStyle: { color: accent3, width: 2 },
      connectNulls: false
    }], -8, 8));

    // Compare
    chartCompare.setOption(makeOption([
      {
        type: 'line',
        name: 'sin',
        data: sinData,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: accent, width: 2.5 }
      },
      {
        type: 'line',
        name: 'cos',
        data: cosData,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: accent2, width: 2.5 }
      }
    ], -3.5, 3.5));

    // Legend for compare
    chartCompare.setOption({
      legend: {
        data: ['sin', 'cos'],
        textStyle: { color: ink },
        top: 5,
        right: 10
      }
    });
  }

  function updateFormula() {
    var aStr = A.toFixed(1);
    var wStr = omega.toFixed(1);
    var pStr = phi.toFixed(1);
    var sign = phi >= 0 ? '+' : '-';
    var pAbs = Math.abs(phi).toFixed(1);
    document.getElementById('formulaText').textContent =
      'y = ' + aStr + ' · sin(' + wStr + ' · x ' + sign + ' ' + pAbs + ')';
  }

  function updateProperties() {
    var period = (2 * Math.PI / omega).toFixed(2);
    var freq = (omega / (2 * Math.PI)).toFixed(3);
    var maxVal = A.toFixed(1);
    var minVal = (-A).toFixed(1);

    var periodEl = document.getElementById('propPeriod');
    var freqEl = document.getElementById('propFreq');
    var maxEl = document.getElementById('propMax');
    var minEl = document.getElementById('propMin');

    if (periodEl) periodEl.textContent = period === '6.28' ? '2π' : period;
    if (freqEl) freqEl.textContent = freq;
    if (maxEl) maxEl.textContent = maxVal;
    if (minEl) minEl.textContent = minVal;
  }

  // Event listeners
  document.getElementById('rangeA').addEventListener('input', function(e) {
    A = parseFloat(e.target.value);
    document.getElementById('valA').textContent = A.toFixed(1);
    updateFormula();
    updateProperties();
    updateCharts();
  });

  document.getElementById('rangeOmega').addEventListener('input', function(e) {
    omega = parseFloat(e.target.value);
    document.getElementById('valOmega').textContent = omega.toFixed(1);
    updateFormula();
    updateProperties();
    updateCharts();
  });

  document.getElementById('rangePhi').addEventListener('input', function(e) {
    phi = parseFloat(e.target.value);
    document.getElementById('valPhi').textContent = phi.toFixed(1);
    updateFormula();
    updateCharts();
  });

  // Resize
  window.addEventListener('resize', function() {
    chartSin.resize();
    chartCos.resize();
    chartTan.resize();
    chartCompare.resize();
  });

  // Initial render
  updateProperties();
  updateCharts();
})();
