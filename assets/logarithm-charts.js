(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var accent4 = style.getPropertyValue('--accent4').trim();
  var accent5 = style.getPropertyValue('--accent5').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg3 = style.getPropertyValue('--bg3').trim();
  var E = Math.E;

  var A = 2, C = 1;
  var steps = 600;

  function logFn(a, x) { return x > 0 ? Math.log(x) / Math.log(a) : null; }
  function expFn(a, x) { return Math.pow(a, x); }

  function generateData(fn, params, xMin, xMax, yMin, yMax) {
    var data = [];
    for (var i = 0; i <= steps; i++) {
      var x = xMin + (xMax - xMin) * i / steps;
      var y = fn.apply(null, [params].concat([x]));
      if (y === null) { data.push([x, '-']); continue; }
      if (yMin !== undefined && y < yMin) y = yMin;
      if (yMax !== undefined && y > yMax) y = yMax;
      data.push([x, y]);
    }
    return data;
  }

  function makeAxis(xMin, xMax) {
    return {
      type: 'value', min: xMin, max: xMax,
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

  var chartMain = echarts.init(document.getElementById('chartMain'), null, { renderer: 'svg' });
  var chartInv = echarts.init(document.getElementById('chartInverse'), null, { renderer: 'svg' });
  var chartSym = echarts.init(document.getElementById('chartSymmetry'), null, { renderer: 'svg' });

  function updateCharts() {
    var logA = Math.log(A);
    var xMin = 0.01, xMax = 10, yMinLog = -5, yMaxLog = 5;

    // y = c * log_a(x)
    var mainData = [];
    for (var i = 0; i <= steps; i++) {
      var x = xMin + (xMax - xMin) * i / steps;
      var y = C * Math.log(x) / logA;
      y = Math.max(yMinLog, Math.min(yMaxLog, y));
      mainData.push([x, y]);
    }
    chartMain.setOption(makeOption([{
      type: 'line', data: mainData, smooth: true, showSymbol: false,
      lineStyle: { color: accent, width: 2.5 },
      areaStyle: { color: accent + '15' }
    }], xMin, xMax, yMinLog, yMaxLog));

    // y = c * log_{1/a}(x)
    var invData = [];
    var invA = 1 / A;
    if (invA > 0 && invA !== 1) {
      var invLogA = Math.log(invA);
      for (var i = 0; i <= steps; i++) {
        var x = xMin + (xMax - xMin) * i / steps;
        var y = C * Math.log(x) / invLogA;
        y = Math.max(yMinLog, Math.min(yMaxLog, y));
        invData.push([x, y]);
      }
    }
    chartInv.setOption(makeOption([{
      type: 'line', data: invData, smooth: true, showSymbol: false,
      lineStyle: { color: accent2, width: 2.5 },
      areaStyle: { color: accent2 + '15' }
    }], xMin, xMax, yMinLog, yMaxLog));

    // Symmetry: log vs exp
    var symXMin = -3, symXMax = 5, symYMin = -3, symYMax = 8;
    var logData = [], expData = [], yeqxData = [];
    for (var i = 0; i <= steps; i++) {
      var x = symXMin + (symXMax - symXMin) * i / steps;
      yeqxData.push([x, x]);
      // log
      if (x > 0) {
        var ly = Math.log(x) / logA;
        ly = Math.max(symYMin, Math.min(symYMax, ly));
        logData.push([x, ly]);
      }
      // exp
      var ey = Math.pow(A, x);
      ey = Math.max(symYMin, Math.min(symYMax, ey));
      expData.push([x, ey]);
    }
    chartSym.setOption({
      legend: {
        data: ['y = log_a(x)', 'y = a^x', 'y = x'],
        textStyle: { color: ink }, top: 5, right: 10
      }
    });
    chartSym.setOption(makeOption([
      { type: 'line', name: 'y = log_a(x)', data: logData, smooth: true, showSymbol: false, lineStyle: { color: accent, width: 2.5 } },
      { type: 'line', name: 'y = a^x', data: expData, smooth: true, showSymbol: false, lineStyle: { color: accent5, width: 2.5 } },
      { type: 'line', name: 'y = x', data: yeqxData, showSymbol: false, lineStyle: { color: accent2, width: 1, type: 'dashed' } }
    ], symXMin, symXMax, symYMin, symYMax));
  }

  function updateFormula() {
    var aStr = A === E ? 'e' : A.toFixed(1);
    var cStr = C.toFixed(1);
    var formula = 'y = ' + (C === 1 ? '' : cStr + ' · ') + 'log<sub>' + aStr + '</sub>(x)';
    document.getElementById('formulaText').innerHTML = formula;
  }

  function updateProperties() {
    var typeEl = document.getElementById('propType');
    var fixedEl = document.getElementById('propFixed');
    if (A > 1) { typeEl.textContent = '对数增长'; typeEl.style.color = accent; }
    else if (A === 1) { typeEl.textContent = '常数 0'; typeEl.style.color = muted; }
    else { typeEl.textContent = '对数衰减'; typeEl.style.color = accent3; }
    fixedEl.textContent = '(1, ' + (C * 0).toFixed(1) + ') → (1, 0)';
    document.getElementById('propDomain').textContent = '(0, +∞)';
    document.getElementById('propRange').textContent = '(-∞, +∞)';
  }

  // Presets
  document.querySelectorAll('.base-presets button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var base = this.dataset.base;
      if (base === 'e') {
        A = E; document.getElementById('rangeA').value = E;
        document.getElementById('valA').textContent = '2.72';
      } else {
        A = parseFloat(base); document.getElementById('rangeA').value = A;
        document.getElementById('valA').textContent = A.toFixed(1);
      }
      document.querySelectorAll('.base-presets button').forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      updateFormula(); updateProperties(); updateCharts();
      if (window.setLogAnimParams) window.setLogAnimParams(A, C);
    });
  });

  document.getElementById('rangeA').addEventListener('input', function(e) {
    A = parseFloat(e.target.value);
    document.getElementById('valA').textContent = A.toFixed(1);
    document.querySelectorAll('.base-presets button').forEach(function(b){
      b.classList.remove('active');
      var bv = b.dataset.base === 'e' ? E : parseFloat(b.dataset.base);
      if (Math.abs(bv - A) < 0.05) b.classList.add('active');
    });
    updateFormula(); updateProperties(); updateCharts();
    if (window.setLogAnimParams) window.setLogAnimParams(A, C);
  });

  document.getElementById('rangeC').addEventListener('input', function(e) {
    C = parseFloat(e.target.value);
    document.getElementById('valC').textContent = C.toFixed(1);
    updateFormula(); updateProperties(); updateCharts();
    if (window.setLogAnimParams) window.setLogAnimParams(A, C);
  });

  window.addEventListener('resize', function() {
    chartMain.resize(); chartInv.resize(); chartSym.resize();
  });

  updateFormula(); updateProperties(); updateCharts();
})();
