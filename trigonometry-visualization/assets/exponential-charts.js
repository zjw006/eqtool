(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var accent4 = style.getPropertyValue('--accent4').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg = style.getPropertyValue('--bg').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg3 = style.getPropertyValue('--bg3').trim();

  var A = 2, C = 1, xRange = 5;
  var steps = 600;
  var E = Math.E;

  function generateData(fn, c, a, xMin, xMax, yMin, yMax) {
    var data = [];
    for (var i = 0; i <= steps; i++) {
      var x = xMin + (xMax - xMin) * i / steps;
      var y = c * fn(a, x);
      if (yMin !== undefined && y < yMin) y = yMin;
      if (yMax !== undefined && y > yMax) y = yMax;
      data.push([x, y]);
    }
    return data;
  }

  function makeAxis(xMin, xMax) {
    return {
      type: 'value',
      min: xMin,
      max: xMax,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontFamily: 'JetBrainsMono' },
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

  var chartMain = echarts.init(document.getElementById('chartMain'), null, { renderer: 'svg' });
  var chartInverse = echarts.init(document.getElementById('chartInverse'), null, { renderer: 'svg' });
  var chartCompare = echarts.init(document.getElementById('chartCompare'), null, { renderer: 'svg' });

  function updateCharts() {
    var xMin = -xRange;
    var xMax = xRange;

    // Compute yMax for main chart
    var yMaxMain = C * Math.pow(Math.max(A, 1.01), xMax);
    var yMaxInv = C * Math.pow(Math.max(A, 1.01), xMax);
    var yMaxCompare = Math.pow(3, xMax);

    // y = c * a^x
    chartMain.setOption(makeOption([{
      type: 'line',
      data: generateData(function(a, x) { return Math.pow(a, x); }, C, A, xMin, xMax, -0.5, yMaxMain),
      smooth: true,
      showSymbol: false,
      lineStyle: { color: accent, width: 2.5 },
      areaStyle: { color: accent + '18' }
    }], xMin, xMax, -0.5, yMaxMain));

    // y = c * a^(-x)
    chartInverse.setOption(makeOption([{
      type: 'line',
      data: generateData(function(a, x) { return Math.pow(a, -x); }, C, A, xMin, xMax, -0.5, yMaxInv),
      smooth: true,
      showSymbol: false,
      lineStyle: { color: accent2, width: 2.5 },
      areaStyle: { color: accent2 + '18' }
    }], xMin, xMax, -0.5, yMaxInv));

    // Compare different bases
    var bases = [0.5, 0.7, 1, 1.5, 2, 3];
    var colors = [accent3, accent3 + '99', muted, accent4 + '99', accent4, accent];
    var compareSeries = [];
    bases.forEach(function(b, i) {
      compareSeries.push({
        type: 'line',
        name: 'a = ' + b,
        data: generateData(function(a, x) { return Math.pow(a, x); }, 1, b, xMin, xMax, -0.5, yMaxCompare),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: colors[i], width: b === 1 ? 1 : 2 }
      });
    });
    chartCompare.setOption({
      legend: {
        data: bases.map(function(b) { return 'a = ' + b; }),
        textStyle: { color: ink },
        top: 5,
        right: 10
      }
    });
    chartCompare.setOption(makeOption(compareSeries, xMin, xMax, -0.5, yMaxCompare));
  }

  function updateFormula() {
    var aStr = A === E ? 'e' : A.toFixed(1);
    var cStr = C.toFixed(1);
    var formula = 'y = ' + (C === 1 ? '' : cStr + ' · ') + aStr + '<sup>x</sup>';
    document.getElementById('formulaText').innerHTML = formula;
  }

  function updateProperties() {
    var typeEl = document.getElementById('propType');
    var fixedEl = document.getElementById('propFixed');
    var domainEl = document.getElementById('propDomain');
    var rangeEl = document.getElementById('propRangeVal');

    if (A > 1) {
      typeEl.textContent = '指数增长';
      typeEl.style.color = accent;
    } else if (A === 1) {
      typeEl.textContent = '常数函数';
      typeEl.style.color = muted;
    } else {
      typeEl.textContent = '指数衰减';
      typeEl.style.color = accent3;
    }

    fixedEl.textContent = '(0, ' + C.toFixed(1) + ')';
    domainEl.textContent = '(-∞, +∞)';
    rangeEl.textContent = '(0, +∞)';

    // Update half-life bar labels for main page
    if (document.getElementById('propRange')) {
      document.getElementById('propRange').textContent = (-xRange) + ' ~ ' + xRange;
    }
  }

  // Preset buttons
  document.querySelectorAll('.base-presets button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var base = this.dataset.base;
      if (base === 'e') {
        A = E;
        document.getElementById('rangeA').value = E;
        document.getElementById('valA').textContent = '2.72';
      } else {
        A = parseFloat(base);
        document.getElementById('rangeA').value = A;
        document.getElementById('valA').textContent = A.toFixed(1);
      }
      document.querySelectorAll('.base-presets button').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      updateFormula();
      updateProperties();
      updateCharts();
      if (window.setAnimParams) window.setAnimParams(A, C);
    });
  });

  // Sliders
  document.getElementById('rangeA').addEventListener('input', function(e) {
    A = parseFloat(e.target.value);
    document.getElementById('valA').textContent = A.toFixed(1);
    // Update preset active state
    document.querySelectorAll('.base-presets button').forEach(function(b) {
      b.classList.remove('active');
      var bv = b.dataset.base === 'e' ? E : parseFloat(b.dataset.base);
      if (Math.abs(bv - A) < 0.05) b.classList.add('active');
    });
    updateFormula();
    updateProperties();
    updateCharts();
    if (window.setAnimParams) window.setAnimParams(A, C);
  });

  document.getElementById('rangeC').addEventListener('input', function(e) {
    C = parseFloat(e.target.value);
    document.getElementById('valC').textContent = C.toFixed(1);
    updateFormula();
    updateProperties();
    updateCharts();
    if (window.setAnimParams) window.setAnimParams(A, C);
  });

  document.getElementById('rangeRange').addEventListener('input', function(e) {
    xRange = parseFloat(e.target.value);
    document.getElementById('valRange').textContent = (-xRange).toFixed(0) + ' ~ ' + xRange.toFixed(0);
    updateCharts();
  });

  // Resize
  window.addEventListener('resize', function() {
    chartMain.resize();
    chartInverse.resize();
    chartCompare.resize();
  });

  // Initial render
  updateFormula();
  updateProperties();
  updateCharts();
})();
