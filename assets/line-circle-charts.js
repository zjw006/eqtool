(function() {
  'use strict';

  var PRIMARY = '#a78bfa';
  var SECONDARY = '#f472b6';
  var ACCENT3 = '#38bdf8';
  var ACCENT4 = '#34d399';
  var ACCENT5 = '#fbbf24';
  var INK = '#f1f5f9';
  var MUTED = '#94a3b8';
  var RULE = '#334155';
  var BG3 = '#1e293b';
  var BG2 = '#151e32';
  var DEG = 180 / Math.PI;

  // ===================== Tool Functions =====================

  function tooltipStyle() {
    return { backgroundColor: BG3, borderColor: RULE, textStyle: { color: INK, fontFamily: 'Outfit, sans-serif' } };
  }

  function axisStyle() {
    return { axisLine: { lineStyle: { color: RULE } }, axisLabel: { color: MUTED, fontFamily: 'JetBrainsMono, monospace' }, splitLine: { lineStyle: { color: 'rgba(51,65,85,0.25)' } } };
  }

  function baseOption() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({ trigger: 'item' }, tooltipStyle()),
      grid: { left: 55, right: 30, top: 30, bottom: 45 },
      xAxis: Object.assign({ type: 'value', min: -6, max: 6, name: 'x' }, axisStyle()),
      yAxis: Object.assign({ type: 'value', min: -6, max: 6, name: 'y' }, axisStyle()),
      animation: true, animationDuration: 300
    };
  }

  function squareGrid(chartInst) {
    var w = chartInst.getWidth();
    var h = chartInst.getHeight();
    var padL = 55, padR = 30, padT = 30, padB = 45;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    if (plotW > plotH) {
      var diff = plotW - plotH;
      padL += diff / 2;
      padR += diff / 2;
    } else {
      var diff2 = plotH - plotW;
      padT += diff2 / 2;
      padB += diff2 / 2;
    }
    return { left: padL, right: padR, top: padT, bottom: padB, containLabel: false };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function fmt(v, d) {
    if (d === undefined) d = 2;
    var s = v.toFixed(d);
    return parseFloat(s).toString();
  }

  function makeMarkLine(p1, p2, color, dashed) {
    var ls = { color: color || PRIMARY, width: 2 };
    if (dashed) ls.type = 'dashed';
    return {
      type: 'line',
      data: [p1, p2],
      showSymbol: false,
      lineStyle: ls,
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: ls,
        data: [[ { coord: p1 }, { coord: p2 } ]]
      }
    };
  }

  function makeScatter(points, color, size) {
    return {
      type: 'scatter', data: points,
      symbolSize: size || 10,
      itemStyle: { color: color || PRIMARY }
    };
  }

  function makeLabelPoint(coord, text, color, offset, fontSize) {
    return {
      type: 'scatter',
      data: [coord],
      symbolSize: 1,
      label: {
        show: true,
        formatter: text,
        color: color || INK,
        fontFamily: 'JetBrainsMono, monospace',
        fontSize: fontSize || 11,
        position: offset || 'top'
      },
      itemStyle: { color: 'transparent' }
    };
  }

  function makeCircleData(a, b, r, n) {
    var data = [];
    var steps = n || 360;
    for (var i = 0; i <= steps; i++) {
      var t = i * 2 * Math.PI / steps;
      data.push([a + r * Math.cos(t), b + r * Math.sin(t)]);
    }
    return data;
  }

  function extendLine(k, b, xMin, xMax) {
    if (Math.abs(k) < 1e-9) {
      return [[xMin, b], [xMax, b]];
    }
    return [[xMin, k * xMin + b], [xMax, k * xMax + b]];
  }

  function pointToLineDistance(px, py, A, B, C) {
    return Math.abs(A * px + B * py + C) / Math.sqrt(A * A + B * B);
  }

  function footOfPerpendicular(px, py, A, B, C) {
    var denom = A * A + B * B;
    if (denom < 1e-12) return [px, py];
    var t = -(A * px + B * py + C) / denom;
    return [px + A * t, py + B * t];
  }

  // ===================== Chart Instances =====================

  var chart1, chart2, chart3, chart4, chart5;

  function initCharts() {
    var d1 = document.getElementById('chartLine');
    var d2 = document.getElementById('chartTwoLine');
    var d3 = document.getElementById('chartDist');
    var d4 = document.getElementById('chartCircle');
    var d5 = document.getElementById('chartLC');
    if (d1) chart1 = echarts.init(d1, null, { renderer: 'svg' });
    if (d2) chart2 = echarts.init(d2, null, { renderer: 'svg' });
    if (d3) chart3 = echarts.init(d3, null, { renderer: 'svg' });
    if (d4) chart4 = echarts.init(d4, null, { renderer: 'svg' });
    if (d5) chart5 = echarts.init(d5, null, { renderer: 'svg' });
  }

  function resizeAll() {
    if (chart1) chart1.resize();
    if (chart2) chart2.resize();
    if (chart3) chart3.resize();
    if (chart4) chart4.resize();
    if (chart5) chart5.resize();
  }

  // ===================== Section 1: \u76F4\u7EBF\u7684\u65B9\u7A0B =====================

  var lineForm = 'point-slope';
  var lineParams = { k: 1, x0: 0, y0: 0, b: 0, x1: -1, y1: -1, x2: 3, y2: 2, A: 1, B: -1, C: 0, a: 2, b_: 3 };

  var lineCtrlDefs = {
    'point-slope': [
      { label: '\u659C\u7387 k', key: 'k', min: -3, max: 3, step: 0.1, def: 1 },
      { label: 'x\u2080', key: 'x0', min: -4, max: 4, step: 0.1, def: 0 },
      { label: 'y\u2080', key: 'y0', min: -4, max: 4, step: 0.1, def: 0 }
    ],
    'slope-intercept': [
      { label: '\u659C\u7387 k', key: 'k', min: -3, max: 3, step: 0.1, def: 1 },
      { label: '\u622A\u8DDD b', key: 'b', min: -4, max: 4, step: 0.1, def: 0 }
    ],
    'two-point': [
      { label: 'x\u2081', key: 'x1', min: -4, max: 4, step: 0.1, def: -1 },
      { label: 'y\u2081', key: 'y1', min: -4, max: 4, step: 0.1, def: -1 },
      { label: 'x\u2082', key: 'x2', min: -4, max: 4, step: 0.1, def: 3 },
      { label: 'y\u2082', key: 'y2', min: -4, max: 4, step: 0.1, def: 2 }
    ],
    'general': [
      { label: 'A', key: 'A', min: -5, max: 5, step: 0.1, def: 1 },
      { label: 'B', key: 'B', min: -5, max: 5, step: 0.1, def: -1 },
      { label: 'C', key: 'C', min: -5, max: 5, step: 0.1, def: 0 }
    ],
    'intercept': [
      { label: 'x \u622A\u8DDD a', key: 'a', min: -5, max: 5, step: 0.1, def: 2 },
      { label: 'y \u622A\u8DDD b', key: 'b_', min: -5, max: 5, step: 0.1, def: 3 }
    ]
  };

  function buildLineControls(form) {
    var area = document.getElementById('lineCtrlArea');
    if (!area) return;
    area.innerHTML = '';
    var defs = lineCtrlDefs[form];
    if (!defs) return;
    defs.forEach(function(d) {
      var group = document.createElement('div');
      group.className = 'control-group';
      var lbl = document.createElement('label');
      lbl.textContent = d.label;
      var valSpan = document.createElement('span');
      valSpan.className = 'value';
      valSpan.textContent = fmt(lineParams[d.key]);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = d.min;
      input.max = d.max;
      input.step = d.step;
      input.value = d.def;
      input.setAttribute('data-key', d.key);
      input.addEventListener('input', function() {
        var key = this.getAttribute('data-key');
        var v = parseFloat(this.value);
        if (form === 'intercept') {
          if ((key === 'a' && Math.abs(v) < 0.5) || (key === 'b_' && Math.abs(v) < 0.5)) {
            v = v >= 0 ? 0.5 : -0.5;
            this.value = v;
          }
        }
        lineParams[key] = v;
        valSpan.textContent = fmt(v);
        updateLineChart();
      });
      lineParams[d.key] = d.def;
      group.appendChild(lbl);
      group.appendChild(valSpan);
      group.appendChild(input);
      area.appendChild(group);
    });
    updateLineChart();
  }

  function updateLineChart() {
    if (!chart1) return;
    var form = lineForm;
    var k, b, A_, B_, C_;
    var formulaHTML = '';
    var infoHTML = '';

    if (form === 'point-slope') {
      k = lineParams.k;
      b = lineParams.y0 - k * lineParams.x0;
      var kStr = fmt(k);
      var x0s = fmt(lineParams.x0);
      var y0s = fmt(lineParams.y0);
      formulaHTML = '<em>y</em> \u2212 ' + y0s + ' = ' + kStr + '(<em>x</em> \u2212 ' + x0s + ')';
    } else if (form === 'slope-intercept') {
      k = lineParams.k;
      b = lineParams.b;
      var ks = fmt(k);
      var bs = fmt(b);
      formulaHTML = '<em>y</em> = ' + ks + '<em>x</em>' + (b >= 0 ? ' + ' + bs : ' \u2212 ' + fmt(Math.abs(b)));
    } else if (form === 'two-point') {
      var dx = lineParams.x2 - lineParams.x1;
      var dy = lineParams.y2 - lineParams.y1;
      if (Math.abs(dx) < 1e-9) {
        k = NaN; b = NaN;
        formulaHTML = '<em>x</em> = ' + fmt(lineParams.x1);
      } else {
        k = dy / dx;
        b = lineParams.y1 - k * lineParams.x1;
        formulaHTML = '(<em>y</em> \u2212 ' + fmt(lineParams.y1) + ') / (<em>x</em> \u2212 ' + fmt(lineParams.x1) + ') = (' + fmt(lineParams.y2) + ' \u2212 ' + fmt(lineParams.y1) + ') / (' + fmt(lineParams.x2) + ' \u2212 ' + fmt(lineParams.x1) + ')';
      }
    } else if (form === 'general') {
      A_ = lineParams.A; B_ = lineParams.B; C_ = lineParams.C;
      if (Math.abs(B_) > 1e-9) {
        k = -A_ / B_;
        b = -C_ / B_;
      } else {
        k = NaN; b = NaN;
      }
      formulaHTML = fmt(A_) + '<em>x</em> + ' + fmt(B_) + '<em>y</em> + ' + fmt(C_) + ' = 0';
    } else if (form === 'intercept') {
      var a = lineParams.a;
      var bv = lineParams.b_;
      if (Math.abs(a) < 0.5 || Math.abs(bv) < 0.5) {
        k = NaN; b = NaN;
        formulaHTML = '\u53C2\u6570\u65E0\u6548';
      } else {
        k = -bv / a;
        b = bv;
        formulaHTML = '<em>x</em> / ' + fmt(a) + ' + <em>y</em> / ' + fmt(bv) + ' = 1';
      }
    }

    // Compute info
    var xInt = '\u2014', yInt = '\u2014', slopeStr = '\u2014', angleStr = '\u2014';
    if (!isNaN(k)) {
      slopeStr = fmt(k);
      angleStr = fmt(Math.atan(k) * DEG) + '\u00B0';
      if (Math.abs(k) > 1e-9) {
        xInt = fmt(-b / k);
      }
      yInt = fmt(b);
    } else if (form === 'general' && Math.abs(B_) < 1e-9 && Math.abs(A_) > 1e-9) {
      xInt = fmt(-C_ / A_);
      slopeStr = '\u221E';
      angleStr = '90\u00B0';
    } else if (form === 'two-point' && Math.abs(lineParams.x2 - lineParams.x1) < 1e-9) {
      xInt = fmt(lineParams.x1);
      slopeStr = '\u221E';
      angleStr = '90\u00B0';
    }

    var formulaEl = document.getElementById('lineFormula');
    if (formulaEl) formulaEl.innerHTML = formulaHTML;

    var infoK = document.getElementById('infoLineK');
    var infoAlpha = document.getElementById('infoLineAlpha');
    var infoYInt = document.getElementById('infoLineYInt');
    var infoXInt = document.getElementById('infoLineXInt');
    if (infoK) infoK.textContent = slopeStr;
    if (infoAlpha) infoAlpha.innerHTML = angleStr;
    if (infoYInt) infoYInt.textContent = yInt;
    if (infoXInt) infoXInt.textContent = xInt;

    // Build chart
    var series = [];
    var keyPoints = [];
    var keyLabels = [];

    if (!isNaN(k)) {
      var pts = extendLine(k, b, -10, 10);
      series.push(makeMarkLine(pts[0], pts[1], PRIMARY, false));
      // slope / angle label on the line
      var midX = (pts[0][0] + pts[1][0]) / 2;
      var midY = k * midX + b;
      series.push(makeLabelPoint([midX, midY], 'k=' + fmt(k) + ', α=' + fmt(Math.atan(k) * DEG) + '°', ACCENT5, k >= 0 ? 'top' : 'bottom'));
    } else {
      // vertical line x = const
      var xv = 0;
      if (form === 'general') xv = -C_ / A_;
      else if (form === 'two-point') xv = lineParams.x1;
      series.push(makeMarkLine([xv, -10], [xv, 10], PRIMARY, false));
      series.push(makeLabelPoint([xv, 2], 'k=∞, α=90°', ACCENT5, 'right'));
    }

    // Key points per form
    if (form === 'point-slope') {
      keyPoints.push([lineParams.x0, lineParams.y0]);
      keyLabels.push('P(' + fmt(lineParams.x0) + ',' + fmt(lineParams.y0) + ')');
    } else if (form === 'slope-intercept') {
      keyPoints.push([0, b]);
      keyLabels.push('(0,' + fmt(b) + ')');
    } else if (form === 'two-point') {
      keyPoints.push([lineParams.x1, lineParams.y1]);
      keyPoints.push([lineParams.x2, lineParams.y2]);
      keyLabels.push('P₁(' + fmt(lineParams.x1) + ',' + fmt(lineParams.y1) + ')');
      keyLabels.push('P₂(' + fmt(lineParams.x2) + ',' + fmt(lineParams.y2) + ')');
    } else if (form === 'general' && Math.abs(B_) > 1e-9) {
      keyPoints.push([0, -C_ / B_]);
      keyLabels.push('(0,' + fmt(-C_ / B_) + ')');
    } else if (form === 'intercept') {
      var ai = lineParams.a;
      var bi = lineParams.b_;
      if (Math.abs(ai) >= 0.5) {
        keyPoints.push([ai, 0]);
        keyLabels.push('(' + fmt(ai) + ',0)');
      }
      if (Math.abs(bi) >= 0.5) {
        keyPoints.push([0, bi]);
        keyLabels.push('(0,' + fmt(bi) + ')');
      }
    }

    keyPoints.forEach(function(p, i) {
      series.push(makeScatter([p], ACCENT3, 10));
      series.push(makeLabelPoint(p, keyLabels[i], ACCENT3, 'bottom'));
    });

    var opt = baseOption();
    opt.series = series;
    chart1.setOption(opt, true);
  }

  // ===================== Section 2: \u4E24\u76F4\u7EBF\u4F4D\u7F6E\u5173\u7CFB =====================

  function updateRelChart() {
    if (!chart2) return;
    var k1 = parseFloat(document.getElementById('sliderK1').value);
    var b1 = parseFloat(document.getElementById('sliderB1').value);
    var k2 = parseFloat(document.getElementById('sliderK2').value);
    var b2 = parseFloat(document.getElementById('sliderB2').value);

    document.getElementById('valK1').textContent = fmt(k1);
    document.getElementById('valB1').textContent = fmt(b1);
    document.getElementById('valK2').textContent = fmt(k2);
    document.getElementById('valB2').textContent = fmt(b2);

    // Update formula display
    var twoLineFormulaEl = document.getElementById('twoLineFormula');
    if (twoLineFormulaEl) {
      twoLineFormulaEl.innerHTML = 'l\u2081: <em>y</em> = ' + fmt(k1) + '<em>x</em>' + (b1 >= 0 ? ' + ' + fmt(b1) : ' \u2212 ' + fmt(Math.abs(b1))) + ' &nbsp;&nbsp; l\u2082: <em>y</em> = ' + fmt(k2) + '<em>x</em>' + (b2 >= 0 ? ' + ' + fmt(b2) : ' \u2212 ' + fmt(Math.abs(b2)));
    }

    var pts1 = extendLine(k1, b1, -10, 10);
    var pts2 = extendLine(k2, b2, -10, 10);
    var series = [
      makeMarkLine(pts1[0], pts1[1], PRIMARY, false),
      makeMarkLine(pts2[0], pts2[1], SECONDARY, false)
    ];
    // slope labels
    var m1x = (pts1[0][0] + pts1[1][0]) / 2;
    var m1y = k1 * m1x + b1;
    series.push(makeLabelPoint([m1x, m1y], 'k₁=' + fmt(k1), PRIMARY, k1 >= 0 ? 'top' : 'bottom'));
    var m2x = (pts2[0][0] + pts2[1][0]) / 2;
    var m2y = k2 * m2x + b2;
    series.push(makeLabelPoint([m2x, m2y], 'k₂=' + fmt(k2), SECONDARY, k2 >= 0 ? 'bottom' : 'top'));

    var relText = '';
    var angleText = '';
    var eps = 1e-9;
    var isVertical1 = Math.abs(k1) > 1e6;
    var isVertical2 = Math.abs(k2) > 1e6;

    var k1eff = isVertical1 ? Infinity : k1;
    var k2eff = isVertical2 ? Infinity : k2;

    if (Math.abs(k1eff - k2eff) < 0.01 && Math.abs(b1 - b2) < 0.01) {
      relText = '\u91CD\u5408';
      angleText = '0\u00B0';
    } else if (Math.abs(k1eff - k2eff) < 0.01) {
      relText = '\u5E73\u884C';
      angleText = '0\u00B0';
    } else {
      var ix, iy;
      if (isVertical1) {
        ix = -b1 / k1; iy = k2 * ix + b2;
      } else if (isVertical2) {
        ix = -b2 / k2; iy = k1 * ix + b1;
      } else {
        ix = (b2 - b1) / (k1 - k2);
        iy = k1 * ix + b1;
      }
      series.push(makeScatter([[ix, iy]], ACCENT3, 10));

      if (!isVertical1 && !isVertical2) {
        var tanA = Math.abs((k1 - k2) / (1 + k1 * k2));
        var angle = Math.atan(tanA) * DEG;
        angleText = fmt(angle) + '\u00B0';
        if (Math.abs(k1 * k2 + 1) < 0.05) {
          relText = '\u5782\u76F4';
        } else {
          relText = '\u76F8\u4EA4';
        }
      } else {
        angleText = '90\u00B0';
        relText = isVertical1 || isVertical2 ? '\u5782\u76F4' : '\u76F8\u4EA4';
      }
    }

    var relEl = document.getElementById('infoTwoLineRel');
    var angleEl = document.getElementById('infoTwoLineAngle');
    if (relEl) relEl.textContent = relText;
    if (angleEl) angleEl.textContent = angleText;

    // Update intersection point
    var ptEl = document.getElementById('infoTwoLinePt');
    if (ptEl) {
      if (Math.abs(k1eff - k2eff) < 0.01 && Math.abs(b1 - b2) < 0.01) {
        ptEl.textContent = '\u65E0\u9650\u591A';
      } else if (Math.abs(k1eff - k2eff) < 0.01) {
        ptEl.textContent = '\u65E0';
      } else {
        var ix2, iy2;
        if (isVertical1) {
          ix2 = -b1 / k1; iy2 = k2 * ix2 + b2;
        } else if (isVertical2) {
          ix2 = -b2 / k2; iy2 = k1 * ix2 + b1;
        } else {
          ix2 = (b2 - b1) / (k1 - k2);
          iy2 = k1 * ix2 + b1;
        }
        ptEl.textContent = '(' + fmt(ix2) + ', ' + fmt(iy2) + ')';
      }
    }

    var opt = baseOption();
    opt.series = series;
    chart2.setOption(opt, true);
  }

  // ===================== Section 3: \u70B9\u5230\u76F4\u7EBF\u8DDD\u79BB =====================

  function updateDistChart() {
    if (!chart3) return;
    var px = parseFloat(document.getElementById('sliderPx').value);
    var py = parseFloat(document.getElementById('sliderPy').value);
    var k = parseFloat(document.getElementById('sliderDistK').value);
    var b = parseFloat(document.getElementById('sliderDistB').value);

    document.getElementById('valPx').textContent = fmt(px);
    document.getElementById('valPy').textContent = fmt(py);
    document.getElementById('valDistK').textContent = fmt(k);
    document.getElementById('valDistB').textContent = fmt(b);

    // line: y = kx + b => kx - y + b = 0 => A=k, B=-1, C=b
    var A = k, B = -1, C = b;
    var d = pointToLineDistance(px, py, A, B, C);
    var foot = footOfPerpendicular(px, py, A, B, C);

    // Update formula display
    var distFormulaEl = document.getElementById('distFormula');
    if (distFormulaEl) {
      var aS = fmt(A);
      var bS = fmt(B);
      var cS = fmt(C);
      distFormulaEl.innerHTML = 'd = |' + aS + '\u00B7' + fmt(px) + ' + (' + bS + ')\u00B7' + fmt(py) + ' + ' + cS + '| / &radic;(' + fmt(A * A) + '+' + fmt(B * B) + ') = ' + fmt(d, 4);
    }

    var distEl = document.getElementById('infoDist');
    var footEl = document.getElementById('infoFoot');
    if (distEl) distEl.textContent = fmt(d, 4);
    if (footEl) footEl.textContent = '(' + fmt(foot[0]) + ', ' + fmt(foot[1]) + ')';

    var ptCoordEl = document.getElementById('infoPtCoord');
    if (ptCoordEl) ptCoordEl.textContent = '(' + fmt(px) + ', ' + fmt(py) + ')';

    var distLineEl = document.getElementById('infoDistLine');
    if (distLineEl) {
      var aStr = fmt(A);
      var bStr = fmt(B);
      var cStr = fmt(C);
      distLineEl.textContent = aStr + 'x ' + (B >= 0 ? '\u2212 ' + fmt(Math.abs(B)) : '+ ' + fmt(Math.abs(B))) + 'y ' + (C >= 0 ? '+ ' + cStr : '\u2212 ' + fmt(Math.abs(C))) + ' = 0';
    }

    var pts = extendLine(k, b, -10, 10);
    var series = [
      makeMarkLine(pts[0], pts[1], PRIMARY, false),
      makeScatter([[px, py]], ACCENT5, 14),
      makeMarkLine([px, py], foot, ACCENT4, true),
      makeScatter([foot], ACCENT3, 8)
    ];
    // slope & intercept label
    var mkX = (pts[0][0] + pts[1][0]) / 2;
    var mkY = k * mkX + b;
    series.push(makeLabelPoint([mkX, mkY], 'k=' + fmt(k) + ', b=' + fmt(b), ACCENT5, k >= 0 ? 'top' : 'bottom'));

    // Distance label at midpoint of perpendicular
    var mx = (px + foot[0]) / 2;
    var my = (py + foot[1]) / 2;
    series.push({
      type: 'scatter',
      data: [[mx, my]],
      symbolSize: 1,
      label: {
        show: true,
        formatter: 'd=' + fmt(d, 3),
        color: ACCENT4,
        fontFamily: 'JetBrainsMono, monospace',
        fontSize: 12,
        position: 'right'
      },
      itemStyle: { color: 'transparent' }
    });

    var opt = baseOption();
    opt.series = series;
    chart3.setOption(opt, true);
  }

  // ===================== Section 4: \u5706\u7684\u65B9\u7A0B =====================

  var circleEqType = 'standard';

  function updateCircleChart() {
    if (!chart4) return;
    var a = parseFloat(document.getElementById('sliderCa').value);
    var b = parseFloat(document.getElementById('sliderCb').value);
    var r = parseFloat(document.getElementById('sliderCr').value);

    document.getElementById('valCa').textContent = fmt(a);
    document.getElementById('valCb').textContent = fmt(b);
    document.getElementById('valCr').textContent = fmt(r);

    var circleData = makeCircleData(a, b, r, 360);
    var series = [
      {
        type: 'line', data: circleData, smooth: false, showSymbol: false,
        lineStyle: { color: PRIMARY, width: 2 }
      },
      makeScatter([[a, b]], ACCENT3, 10),
      makeMarkLine([a, b], [a + r, b], ACCENT5, true)
    ];

    // Radius label
    series.push({
      type: 'scatter',
      data: [[a + r / 2, b]],
      symbolSize: 1,
      label: {
        show: true,
        formatter: 'r=' + fmt(r),
        color: ACCENT5,
        fontFamily: 'JetBrainsMono, monospace',
        fontSize: 11,
        position: 'bottom'
      },
      itemStyle: { color: 'transparent' }
    });

    // Formula
    var formulaEl = document.getElementById('circleFormula');
    if (formulaEl) {
      if (circleEqType === 'standard') {
        var xPart = Math.abs(a) < 1e-9 ? 'x\u00B2' : '(x' + (a > 0 ? ' \u2212 ' : ' + ') + fmt(Math.abs(a)) + ')\u00B2';
        var yPart = Math.abs(b) < 1e-9 ? 'y\u00B2' : '(y' + (b > 0 ? ' \u2212 ' : ' + ') + fmt(Math.abs(b)) + ')\u00B2';
        formulaEl.innerHTML = xPart + ' + ' + yPart + ' = ' + fmt(r * r);
      } else {
        var D = -2 * a, E = -2 * b, F = a * a + b * b - r * r;
        formulaEl.innerHTML = '<em>x</em>\u00B2 + <em>y</em>\u00B2' +
          (D >= 0 ? ' + ' : ' \u2212 ') + fmt(Math.abs(D)) + '<em>x</em>' +
          (E >= 0 ? ' + ' : ' \u2212 ') + fmt(Math.abs(E)) + '<em>y</em>' +
          (F >= 0 ? ' + ' : ' \u2212 ') + fmt(Math.abs(F)) + ' = 0';
      }
    }

    // Update circle info panel
    var centerEl = document.getElementById('infoCircleCenter');
    var rEl = document.getElementById('infoCircleR');
    var areaEl = document.getElementById('infoCircleArea');
    var circumEl = document.getElementById('infoCircleCircum');
    if (centerEl) centerEl.textContent = '(' + fmt(a) + ', ' + fmt(b) + ')';
    if (rEl) rEl.textContent = fmt(r);
    if (areaEl) areaEl.textContent = fmt(Math.PI * r * r);
    if (circumEl) circumEl.textContent = fmt(2 * Math.PI * r);

    var opt = baseOption();
    opt.grid = squareGrid(chart4);
    opt.series = series;
    chart4.setOption(opt, true);
  }

  // ===================== Section 5: \u76F4\u7EBF\u4E0E\u5706\u4F4D\u7F6E\u5173\u7CFB =====================

  function updateLCChart() {
    if (!chart5) return;
    var k = parseFloat(document.getElementById('sliderLCK').value);
    var c = parseFloat(document.getElementById('sliderLCB').value);
    var a = parseFloat(document.getElementById('sliderLCCa').value);
    var b = parseFloat(document.getElementById('sliderLCCb').value);
    var r = parseFloat(document.getElementById('sliderLCR').value);

    document.getElementById('valLCK').textContent = fmt(k);
    document.getElementById('valLCB').textContent = fmt(c);
    document.getElementById('valLCCa').textContent = fmt(a);
    document.getElementById('valLCCb').textContent = fmt(b);
    document.getElementById('valLCR').textContent = fmt(r);

    // line: y = kx + c => kx - y + c = 0
    var A = k, B = -1, C = c;
    var d = pointToLineDistance(a, b, A, B, C);
    var foot = footOfPerpendicular(a, b, A, B, C);

    var relText = '';
    var intersections = [];
    var eps = 1e-6;

    if (d < r - eps) {
      relText = '\u76F8\u4EA4 (2 \u4E2A\u4EA4\u70B9)';
      // Solve: (x-a)^2 + (kx+c-b)^2 = r^2
      var Aq = 1 + k * k;
      var Bq = -2 * a + 2 * k * (c - b);
      var Cq = a * a + (c - b) * (c - b) - r * r;
      var disc = Bq * Bq - 4 * Aq * Cq;
      if (disc >= 0) {
        var sd = Math.sqrt(disc);
        var x3 = (-Bq + sd) / (2 * Aq);
        var x4 = (-Bq - sd) / (2 * Aq);
        var y3 = k * x3 + c;
        var y4 = k * x4 + c;
        intersections = [[x3, y3], [x4, y4]];
      }
    } else if (d < r + eps) {
      relText = '\u76F8\u5207 (1 \u4E2A\u4EA4\u70B9)';
      intersections = [foot];
    } else {
      relText = '\u76F8\u79BB';
    }

    var circleData = makeCircleData(a, b, r, 360);
    var linePts = extendLine(k, c, -10, 10);
    var series = [
      {
        type: 'line', data: circleData, smooth: false, showSymbol: false,
        lineStyle: { color: PRIMARY, width: 2 }
      },
      makeMarkLine(linePts[0], linePts[1], SECONDARY, false),
      makeScatter([[a, b]], ACCENT3, 8),
      makeMarkLine([a, b], foot, ACCENT4, true)
    ];
    // slope & intercept label on line
    var mlX = (linePts[0][0] + linePts[1][0]) / 2;
    var mlY = k * mlX + c;
    series.push(makeLabelPoint([mlX, mlY], 'k=' + fmt(k) + ', b=' + fmt(c), SECONDARY, k >= 0 ? 'top' : 'bottom'));

    if (intersections.length > 0) {
      series.push(makeScatter(intersections, ACCENT5, 12));
    }

    // d label
    var mx = (a + foot[0]) / 2;
    var my = (b + foot[1]) / 2;
    series.push({
      type: 'scatter',
      data: [[mx, my]],
      symbolSize: 1,
      label: {
        show: true,
        formatter: 'd=' + fmt(d, 3),
        color: ACCENT4,
        fontFamily: 'JetBrainsMono, monospace',
        fontSize: 11,
        position: 'right'
      },
      itemStyle: { color: 'transparent' }
    });

    var relEl = document.getElementById('infoLCRel');
    var dEl = document.getElementById('infoLCDist');
    if (relEl) relEl.textContent = relText;
    if (dEl) dEl.textContent = fmt(d, 4);

    // Update lcFormula
    var lcFormulaEl = document.getElementById('lcFormula');
    if (lcFormulaEl) {
      var relD = d < r - eps ? 'd < r' : (d < r + eps ? 'd = r' : 'd > r');
      var relArrow = d < r - eps ? '\u2192 \u76F8\u4EA4\uFF08\u4E24\u4E2A\u4EA4\u70B9\uFF09' : (d < r + eps ? '\u2192 \u76F8\u5207\uFF08\u4E00\u4E2A\u4EA4\u70B9\uFF09' : '\u2192 \u76F8\u79BB');
      lcFormulaEl.innerHTML = 'd = ' + fmt(d, 2) + ', r = ' + fmt(r) + ', ' + relD + ' ' + relArrow;
    }

    // Update infoLCR
    var rEl = document.getElementById('infoLCR');
    if (rEl) rEl.textContent = fmt(r);

    // Intersection coordinates
    var intEl = document.getElementById('infoLCIntersections');
    if (intEl) {
      if (intersections.length === 0) {
        intEl.textContent = '\u65E0';
      } else if (intersections.length === 1) {
        intEl.textContent = '(' + fmt(intersections[0][0]) + ', ' + fmt(intersections[0][1]) + ')';
      } else {
        intEl.textContent = '(' + fmt(intersections[0][0]) + ', ' + fmt(intersections[0][1]) + '), (' + fmt(intersections[1][0]) + ', ' + fmt(intersections[1][1]) + ')';
      }
    }

    var opt = baseOption();
    opt.grid = squareGrid(chart5);
    opt.series = series;
    chart5.setOption(opt, true);
  }

  // ===================== Event Binding =====================

  function bindEvents() {
    // Section 1: line form tabs
    var tabs = document.querySelectorAll('#lineFormGroup [data-form]');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        lineForm = this.getAttribute('data-form');
        tabs.forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        buildLineControls(lineForm);
      });
    });
    buildLineControls('point-slope');

    // Section 2: relation sliders
    var relSliders = ['sliderK1', 'sliderB1', 'sliderK2', 'sliderB2'];
    relSliders.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateRelChart);
    });
    updateRelChart();

    // Section 3: distance sliders
    var distSliders = ['sliderPx', 'sliderPy', 'sliderDistK', 'sliderDistB'];
    distSliders.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateDistChart);
    });
    updateDistChart();

    // Section 4: circle sliders & eq type toggle
    var circSliders = ['sliderCa', 'sliderCb', 'sliderCr'];
    circSliders.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateCircleChart);
    });

    var cTabs = document.querySelectorAll('[data-cform]');
    cTabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        circleEqType = this.getAttribute('data-cform');
        cTabs.forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        updateCircleChart();
      });
    });
    updateCircleChart();

    // Section 5: line-circle sliders
    var lcSliders = ['sliderLCK', 'sliderLCB', 'sliderLCCa', 'sliderLCCb', 'sliderLCR'];
    lcSliders.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateLCChart);
    });
    updateLCChart();

    // Resize
    window.addEventListener('resize', resizeAll);
  }

  // ===================== Init =====================

  document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    bindEvents();
  });

})();