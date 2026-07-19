(function() {
  var charts = {};
  var _projectileAnimId = null;

  function tooltipStyle() {
    return {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9', fontFamily: 'Outfit, sans-serif' }
    };
  }

  function axisStyle() {
    return {
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono, monospace' },
      splitLine: { lineStyle: { color: 'rgba(51,65,85,0.25)' } }
    };
  }

  // ========== 1. Profit Chart (ECharts) ==========
  function initProfitChart(price) {
    var dom = document.getElementById('chartProfit');
    if (!dom) return;
    if (charts.profit) charts.profit.dispose();
    charts.profit = echarts.init(dom, null, { renderer: 'svg' });

    // P(p) = -5p^2 + 500p - 10500, p in [30, 70]
    var lineData = [];
    var n = 80;
    for (var i = 0; i <= n; i++) {
      var p = 30 + (70 - 30) * i / n;
      var P = -5 * p * p + 500 * p - 10500;
      lineData.push([parseFloat(p.toFixed(2)), parseFloat(P.toFixed(2))]);
    }

    // Vertex at p=50, P=2000
    var vertexP = 50, vertexProfit = 2000;

    // Current profit at given price
    var currentProfit = -5 * price * price + 500 * price - 10500;

    // Break-even points (roots of -5p^2+500p-10500=0)
    var be1 = 30.22, be2 = 69.78;

    // Loss zone mark areas
    var markAreaLoss = {
      silent: true,
      itemStyle: { color: 'rgba(244,63,94,0.08)' },
      data: [
        [
          { xAxis: 25, label: { show: true, position: 'insideTop', color: '#f43f5e',
            formatter: '\u4e8f\u635f\u533a', fontSize: 10 } },
          { xAxis: be1 }
        ],
        [
          { xAxis: be2, label: { show: true, position: 'insideTop', color: '#f43f5e',
            formatter: '\u4e8f\u635f\u533a', fontSize: 10 } },
          { xAxis: 75 }
        ]
      ]
    };

    charts.profit.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var p = params[0] ? params[0].data[0] : 0;
          var v = params[0] ? params[0].data[1] : 0;
          return '\u552e\u4ef7: ' + p + ' \u5143\n\u5229\u6da6: ' + v + ' \u5143';
        }
      }, tooltipStyle()),
      title: {
        text: '\u5546\u54c1\u5b9a\u4ef7\u4e0e\u5229\u6da6\u66f2\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 65, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u552e\u4ef7(\u5143)',
        nameTextStyle: { color: '#94a3b8' },
        min: 25, max: 75
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u5229\u6da6(\u5143)',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: '\u5229\u6da6\u66f2\u7ebf',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2.5 },
          markArea: markAreaLoss,
          z: 2
        },
        {
          name: '\u6700\u5927\u5229\u6da6\u70b9',
          type: 'scatter',
          data: [[vertexP, vertexProfit]],
          symbolSize: 12,
          itemStyle: { color: '#10b981' },
          label: {
            show: true, position: 'top',
            color: '#10b981', fontWeight: 'bold', fontSize: 11,
            formatter: '\u6700\u5927\u5229\u6da6: 2000\u5143'
          },
          z: 10
        },
        {
          name: '\u5f53\u524d\u552e\u4ef7',
          type: 'scatter',
          data: [[price, currentProfit]],
          symbolSize: 10,
          itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 1.5 },
          z: 10
        },
        {
          name: '\u76c8\u4e8f\u5e73\u8861\u70b9',
          type: 'scatter',
          data: [[be1, 0], [be2, 0]],
          symbolSize: 10,
          itemStyle: { color: '#f43f5e' },
          label: {
            show: true, position: 'bottom',
            color: '#f43f5e', fontSize: 10,
            formatter: '\u76c8\u4e8f\u5e73\u8861\u70b9'
          },
          z: 10
        }
      ]
    });
  }

  // ========== 2. Projectile Chart (Canvas) ==========
  function drawProjectile(canvas, v0, angleDeg) {
    if (!canvas) return;
    if (_projectileAnimId) {
      cancelAnimationFrame(_projectileAnimId);
      _projectileAnimId = null;
    }

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    var W = rect.width, H = rect.height;

    var pad = { left: 60, right: 20, top: 20, bottom: 40 };
    var plotW = W - pad.left - pad.right;
    var plotH = H - pad.top - pad.bottom;

    var rad = angleDeg * Math.PI / 180;
    var vx = v0 * Math.cos(rad);
    var vy = v0 * Math.sin(rad);
    var T = 2 * vy / 9.8;
    var maxH = vy * vy / (2 * 9.8);
    var range = vx * T;

    // Scale: fit range and maxH into plot area with margin
    var scaleX = plotW / (range * 1.15 + 1);
    var scaleY = plotH / (maxH * 1.2 + 1);
    var scale = Math.min(scaleX, scaleY);

    var originX = pad.left;
    var originY = pad.top + plotH;

    function toCanvasX(x) { return originX + x * scale; }
    function toCanvasY(y) { return originY - y * scale; }

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(51,65,85,0.2)';
    ctx.lineWidth = 0.5;
    var gridCountX = 5;
    var gridCountY = 4;
    for (var gi = 0; gi <= gridCountX; gi++) {
      var gx = pad.left + plotW * gi / gridCountX;
      ctx.beginPath();
      ctx.moveTo(gx, pad.top);
      ctx.lineTo(gx, originY);
      ctx.stroke();
    }
    for (var gj = 0; gj <= gridCountY; gj++) {
      var gy = pad.top + plotH * gj / gridCountY;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + plotW, gy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, pad.top);
    ctx.lineTo(originX, originY);
    ctx.lineTo(pad.left + plotW, originY);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrainsMono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u6c34\u5e73\u8ddd\u79bb(m)', pad.left + plotW / 2, H - 5);
    ctx.save();
    ctx.translate(15, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('\u9ad8\u5ea6(m)', 0, 0);
    ctx.restore();

    // Tick labels
    ctx.font = '10px JetBrainsMono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var ti = 0; ti <= gridCountX; ti++) {
      var tx = (range * 1.15) * ti / gridCountX;
      ctx.fillText(tx.toFixed(0), toCanvasX(tx), originY + 5);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var tj = 0; tj <= gridCountY; tj++) {
      var ty = (maxH * 1.2) * tj / gridCountY;
      ctx.fillText(ty.toFixed(1), originX - 5, toCanvasY(ty));
    }

    // Ground line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + plotW, originY);
    ctx.stroke();

    // Launch pad
    ctx.fillStyle = '#475569';
    ctx.fillRect(originX - 6, originY - 8, 12, 8);

    // Full trajectory as faded dashed line
    ctx.strokeStyle = 'rgba(245,158,11,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    var steps = 100;
    for (var si = 0; si <= steps; si++) {
      var t = T * si / steps;
      var px = vx * t;
      var py = vy * t - 4.9 * t * t;
      if (si === 0) ctx.moveTo(toCanvasX(px), toCanvasY(py));
      else ctx.lineTo(toCanvasX(px), toCanvasY(py));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertex marker
    var vertexT = vy / 9.8;
    var vertexX = vx * vertexT;
    var vertexY = maxH;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(toCanvasX(vertexX), toCanvasY(vertexY), 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.font = '11px JetBrainsMono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('\u6700\u9ad8\u70b9: ' + vertexY.toFixed(1) + 'm', toCanvasX(vertexX) + 8, toCanvasY(vertexY) - 4);

    // Landing point marker
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    var landSize = 6;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(range) - landSize, toCanvasY(0) - landSize);
    ctx.lineTo(toCanvasX(range) + landSize, toCanvasY(0) + landSize);
    ctx.moveTo(toCanvasX(range) + landSize, toCanvasY(0) - landSize);
    ctx.lineTo(toCanvasX(range) - landSize, toCanvasY(0) + landSize);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrainsMono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u5c04\u7a0b: ' + range.toFixed(1) + 'm', toCanvasX(range), toCanvasY(0) + 10);

    // Animation: dot traveling along trajectory
    var animStart = null;
    var animDuration = 2000; // ms

    function animateFrame(timestamp) {
      if (!animStart) animStart = timestamp;
      var elapsed = timestamp - animStart;
      var progress = Math.min(elapsed / animDuration, 1);

      // Ease in-out
      var eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      var currentT = T * eased;
      var cx = vx * currentT;
      var cy = vy * currentT - 4.9 * currentT * currentT;
      if (cy < 0) cy = 0;

      // Bright trajectory trail up to current position
      ctx.strokeStyle = 'rgba(245,158,11,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      var trailSteps = Math.floor(steps * eased);
      for (var tri = 0; tri <= trailSteps; tri++) {
        var tt = T * tri / steps;
        var tpx = vx * tt;
        var tpy = vy * tt - 4.9 * tt * tt;
        if (tpy < 0) tpy = 0;
        if (tri === 0) ctx.moveTo(toCanvasX(tpx), toCanvasY(tpy));
        else ctx.lineTo(toCanvasX(tpx), toCanvasY(tpy));
      }
      ctx.stroke();

      // Animated dot
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(toCanvasX(cx), toCanvasY(cy), 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (progress < 1) {
        _projectileAnimId = requestAnimationFrame(animateFrame);
      }
    }

    _projectileAnimId = requestAnimationFrame(animateFrame);
  }

  function initProjectileChart(velocity, angle) {
    var canvas = document.getElementById('chartProjectile');
    if (!canvas) return;
    drawProjectile(canvas, velocity, angle);
  }

  // ========== 3. Bridge Chart (ECharts) ==========
  function initBridgeChart(span, height) {
    var dom = document.getElementById('chartBridge');
    if (!dom) return;
    if (charts.bridge) charts.bridge.dispose();
    charts.bridge = echarts.init(dom, null, { renderer: 'svg' });

    var W = span;
    var H = height;
    var a = -4 * H / (W * W);
    var halfW = W / 2;

    // Generate parabola data
    var archData = [];
    var n = 80;
    for (var i = 0; i <= n; i++) {
      var x = -halfW + W * i / n;
      var y = a * x * x + H;
      archData.push([parseFloat(x.toFixed(2)), parseFloat(y.toFixed(2))]);
    }

    // Quarter-span point
    var qX = W / 4;
    var qY = a * qX * qX + H;

    // Water area data (below y=0)
    var waterData = [
      [-halfW, 0],
      [halfW, 0],
      [halfW, -5],
      [-halfW, -5]
    ];

    charts.bridge.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var p = params[0];
          if (!p) return '';
          return '\u4f4d\u7f6e: ' + p.data[0] + ' m\n\u9ad8\u5ea6: ' + p.data[1] + ' m';
        }
      }, tooltipStyle()),
      title: {
        text: '\u62f1\u6865\u629b\u7269\u7ebf\u622a\u9762',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 65, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u6c34\u5e73\u4f4d\u7f6e(m)',
        nameTextStyle: { color: '#94a3b8' },
        min: -halfW - 5,
        max: halfW + 5
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u9ad8\u5ea6(m)',
        nameTextStyle: { color: '#94a3b8' },
        min: -6,
        max: H * 1.3
      }, axisStyle()),
      series: [
        {
          name: '\u62f1\u5f62\u66f2\u7ebf',
          type: 'line',
          data: archData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2.5 },
          areaStyle: { color: 'rgba(245,158,11,0.15)' },
          markPoint: {
            data: [{
              coord: [0, H],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: { color: '#10b981' },
              label: {
                show: true, position: 'top',
                color: '#10b981', fontWeight: 'bold', fontSize: 11,
                formatter: '\u62f1\u9ad8: ' + H + 'm'
              }
            }],
            z: 10
          },
          z: 3
        },
        {
          name: '\u56db\u5206\u4e00\u8de8\u5ea6\u70b9',
          type: 'scatter',
          data: [[qX, qY], [-qX, qY]],
          symbolSize: 8,
          itemStyle: { color: '#06b6d4' },
          label: {
            show: true, position: 'top',
            color: '#06b6d4', fontSize: 10,
            formatter: function(p) { return p.data[1].toFixed(1) + 'm'; }
          },
          z: 10
        },
        {
          name: '\u6c34\u9762/\u6865\u9762',
          type: 'line',
          data: [[-halfW, 0], [halfW, 0]],
          showSymbol: false,
          silent: true,
          lineStyle: { color: '#06b6d4', width: 1.5, type: 'dashed' },
          z: 2
        },
        {
          name: '\u6c34\u57df',
          type: 'line',
          data: waterData,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 0 },
          areaStyle: { color: 'rgba(6,182,212,0.05)' },
          z: 1
        },
        {
          name: '\u6869\u5de6',
          type: 'line',
          data: [[-halfW, 0], [-halfW, -5]],
          showSymbol: false,
          silent: true,
          lineStyle: { color: '#475569', width: 3 },
          z: 2
        },
        {
          name: '\u6869\u53f3',
          type: 'line',
          data: [[halfW, 0], [halfW, -5]],
          showSymbol: false,
          silent: true,
          lineStyle: { color: '#475569', width: 3 },
          z: 2
        }
      ]
    });
  }

  // ========== 4. Break-Even Chart (ECharts) ==========
  function initBreakEvenChart(quantity) {
    var dom = document.getElementById('chartBreakEven');
    if (!dom) return;
    if (charts.breakEven) charts.breakEven.dispose();
    charts.breakEven = echarts.init(dom, null, { renderer: 'svg' });

    // R(x) = 200x, C(x) = 2x^2 + 20x + 5000
    var lineData = [];
    var revenueData = [];
    var costData = [];
    var n = 80;
    for (var i = 0; i <= n; i++) {
      var x = 100 * i / n;
      var r = 200 * x;
      var c = 2 * x * x + 20 * x + 5000;
      revenueData.push([parseFloat(x.toFixed(2)), parseFloat(r.toFixed(2))]);
      costData.push([parseFloat(x.toFixed(2)), parseFloat(c.toFixed(2))]);
    }

    // Break-even points: -2x^2+180x-5000=0
    var be1 = 33.04, be2 = 56.96;

    // Current quantity
    var curR = 200 * quantity;
    var curC = 2 * quantity * quantity + 20 * quantity + 5000;

    // Build fill series: profit zone (green) between break-even points
    var profitFillData = [];
    var lossFillData1 = [];
    var lossFillData2 = [];
    for (var j = 0; j <= n; j++) {
      var xf = 100 * j / n;
      var rf = 200 * xf;
      var cf = 2 * xf * xf + 20 * xf + 5000;
      if (xf >= be1 && xf <= be2) {
        profitFillData.push([parseFloat(xf.toFixed(2)), parseFloat(rf.toFixed(2))]);
      }
      if (xf < be1) {
        lossFillData1.push([parseFloat(xf.toFixed(2)), parseFloat(rf.toFixed(2))]);
      }
      if (xf > be2) {
        lossFillData2.push([parseFloat(xf.toFixed(2)), parseFloat(rf.toFixed(2))]);
      }
    }

    charts.breakEven.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var x = params[0] ? params[0].data[0] : 0;
          var s = '\u4ea7\u91cf: ' + x + ' \u4ef6\n';
          for (var i = 0; i < params.length; i++) {
            if (params[i].seriesName === '\u6536\u5165\u66f2\u7ebf' || params[i].seriesName === '\u6210\u672c\u66f2\u7ebf') {
              s += params[i].seriesName + ': ' + params[i].data[1] + ' \u5143\n';
            }
          }
          return s;
        }
      }, tooltipStyle()),
      title: {
        text: '\u6536\u5165\u4e0e\u6210\u672c\u66f2\u7ebf\u5bf9\u6bd4',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      legend: {
        data: ['\u6536\u5165\u66f2\u7ebf', '\u6210\u672c\u66f2\u7ebf'],
        top: 28, textStyle: { color: '#94a3b8' }
      },
      grid: { left: 70, right: 30, top: 60, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u4ea7\u91cf(\u4ef6)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: 100
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u91d1\u989d(\u5143)',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: '\u6536\u5165\u66f2\u7ebf',
          type: 'line',
          data: revenueData,
          showSymbol: false,
          lineStyle: { color: '#06b6d4', width: 2, type: 'dashed' },
          z: 3
        },
        {
          name: '\u6210\u672c\u66f2\u7ebf',
          type: 'line',
          data: costData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2.5 },
          z: 3
        },
        {
          name: '\u76c8\u5229\u533a\u57df',
          type: 'line',
          data: profitFillData,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 0 },
          areaStyle: { color: 'rgba(16,185,129,0.1)' },
          z: 1
        },
        {
          name: '\u4e8f\u635f\u533a\u57df1',
          type: 'line',
          data: lossFillData1,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 0 },
          areaStyle: { color: 'rgba(244,63,94,0.08)' },
          z: 1
        },
        {
          name: '\u4e8f\u635f\u533a\u57df2',
          type: 'line',
          data: lossFillData2,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 0 },
          areaStyle: { color: 'rgba(244,63,94,0.08)' },
          z: 1
        },
        {
          name: '\u76c8\u4e8f\u5e73\u8861\u70b9',
          type: 'scatter',
          data: [[be1, 200 * be1], [be2, 200 * be2]],
          symbolSize: 10,
          itemStyle: { color: '#f43f5e' },
          label: {
            show: true, position: 'top',
            color: '#f43f5e', fontSize: 10,
            formatter: '\u76c8\u4e8f\u5e73\u8861'
          },
          z: 10
        },
        {
          name: '\u5f53\u524d\u4ea7\u91cf-\u6536\u5165',
          type: 'scatter',
          data: [[quantity, curR]],
          symbolSize: 9,
          itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 1.5 },
          z: 10
        },
        {
          name: '\u5f53\u524d\u4ea7\u91cf-\u6210\u672c',
          type: 'scatter',
          data: [[quantity, curC]],
          symbolSize: 9,
          itemStyle: { color: '#f59e0b', borderColor: '#fff', borderWidth: 1.5 },
          z: 10
        },
        {
          name: '\u5f53\u524d\u4ea7\u91cf\u7ebf',
          type: 'line',
          data: [[quantity, 0], [quantity, Math.max(curR, curC) * 1.05]],
          showSymbol: false,
          silent: true,
          lineStyle: { color: 'rgba(245,158,11,0.3)', width: 1, type: 'dotted' },
          z: 2
        }
      ]
    });
  }

  // ========== 5. Inequality Chart (ECharts) ==========
  function initInequalityChart(budget) {
    var dom = document.getElementById('chartInequality');
    if (!dom) return;
    if (charts.inequality) charts.inequality.dispose();
    charts.inequality = echarts.init(dom, null, { renderer: 'svg' });

    // C(x) = 0.5x^2 + 10x + 200
    var costData = [];
    var feasibleData = [];
    var infeasData = [];
    var n = 80;
    var maxBudget = Math.max(budget * 1.3, 400);

    // Solve 0.5x^2 + 10x + (200 - B) = 0
    // delta = 100 - 4*0.5*(200-B) = 100 - 2*(200-B) = 2B - 300
    var delta = 2 * budget - 300;
    var x1 = -10 + Math.sqrt(Math.max(0, delta));
    var x2 = -10 - Math.sqrt(Math.max(0, delta));
    var hasRoots = delta >= 0;
    var maxFeasibleX = hasRoots ? Math.max(0, x1) : -1; // positive root

    // Determine x range: 0 to enough to see the parabola exceed budget
    var xMax = maxBudget > 0 ? Math.sqrt(maxBudget * 2) + 15 : 50;
    xMax = Math.max(xMax, 50);

    for (var i = 0; i <= n; i++) {
      var x = xMax * i / n;
      var c = 0.5 * x * x + 10 * x + 200;
      costData.push([parseFloat(x.toFixed(2)), parseFloat(c.toFixed(2))]);
      if (hasRoots) {
        if (x >= 0 && x <= maxFeasibleX) {
          feasibleData.push([parseFloat(x.toFixed(2)), parseFloat(c.toFixed(2))]);
        }
        if (x > maxFeasibleX) {
          infeasData.push([parseFloat(x.toFixed(2)), parseFloat(c.toFixed(2))]);
        }
      } else {
        // If delta < 0 and parabola is always above budget line (no roots)
        if (c <= budget) {
          feasibleData.push([parseFloat(x.toFixed(2)), parseFloat(c.toFixed(2))]);
        } else {
          infeasData.push([parseFloat(x.toFixed(2)), parseFloat(c.toFixed(2))]);
        }
      }
    }

    // Root scatter points
    var rootScatter = [];
    if (hasRoots && x1 >= 0) {
      rootScatter.push([parseFloat(x1.toFixed(2)), budget]);
    }

    // MarkLine at max feasible x
    var markLines = [];
    if (hasRoots && maxFeasibleX >= 0) {
      markLines.push({
        xAxis: parseFloat(maxFeasibleX.toFixed(1)),
        label: {
          show: true, position: 'start',
          color: '#10b981', fontSize: 10,
          formatter: 'x=' + maxFeasibleX.toFixed(1)
        },
        lineStyle: { color: '#10b981', width: 1.5, type: 'dashed' }
      });
    }

    charts.inequality.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var x = params[0] ? params[0].data[0] : 0;
          var c = 0.5 * x * x + 10 * x + 200;
          return '\u4ea7\u91cf: ' + x + ' \u4ef6\n\u6210\u672c: ' + c.toFixed(1) + ' \u4e07\u5143\n\u9884\u7b97: ' + budget + ' \u4e07\u5143';
        }
      }, tooltipStyle()),
      title: {
        text: '\u6210\u672c\u4e0e\u9884\u7b97\u7ea6\u675f',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      legend: {
        data: ['\u6210\u672c\u66f2\u7ebf', '\u9884\u7b97\u7ebf'],
        top: 28, textStyle: { color: '#94a3b8' }
      },
      grid: { left: 70, right: 30, top: 60, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u4ea7\u91cf(\u4ef6)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: xMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u6210\u672c(\u4e07\u5143)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: maxBudget
      }, axisStyle()),
      series: [
        {
          name: '\u6210\u672c\u66f2\u7ebf',
          type: 'line',
          data: costData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2.5 },
          markLine: markLines.length > 0 ? { silent: true, data: markLines, z: 5 } : undefined,
          z: 4
        },
        {
          name: '\u9884\u7b97\u7ebf',
          type: 'line',
          data: [[0, budget], [xMax, budget]],
          showSymbol: false,
          lineStyle: { color: '#06b6d4', width: 2, type: 'dashed' },
          z: 3
        },
        {
          name: '\u53ef\u884c\u533a\u57df',
          type: 'line',
          data: feasibleData,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 0 },
          areaStyle: { color: 'rgba(16,185,129,0.1)' },
          z: 1
        },
        {
          name: '\u8d85\u9884\u7b97\u533a\u57df',
          type: 'line',
          data: infeasData,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 0 },
          areaStyle: { color: 'rgba(244,63,94,0.08)' },
          z: 1
        },
        {
          name: '\u8fb9\u754c\u70b9',
          type: 'scatter',
          data: rootScatter,
          symbolSize: 10,
          itemStyle: { color: '#f43f5e' },
          label: {
            show: true, position: 'top',
            color: '#f43f5e', fontSize: 10,
            formatter: function(p) { return '(' + p.data[0].toFixed(1) + ', ' + p.data[1] + ')'; }
          },
          z: 10
        }
      ]
    });
  }

  // ========== Helper: update text in DOM ==========
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateProfitInfo(price) {
    setText('valPrice', price);
    var demand = Math.max(0, 100 - 5 * (price - 50));
    var revenue = price * demand;
    var cost = 30 * demand;
    var profit = revenue - cost;
    setText('infoDemand', demand);
    setText('infoRevenue', revenue);
    setText('infoCost', cost);
    setText('infoProfitVal', profit);
    setText('formulaProfit', 'P(' + price + ') = ' + profit + '\u5143');
  }

  function updateProjectileInfo(v0, angleDeg) {
    setText('valVelocity', v0);
    setText('valAngle', angleDeg);
    var rad = angleDeg * Math.PI / 180;
    var vy = v0 * Math.sin(rad);
    var maxH = (vy * vy) / (2 * 9.8);
    var T = 2 * vy / 9.8;
    var range = v0 * Math.cos(rad) * T;
    setText('infoMaxH', maxH.toFixed(1));
    setText('infoRange', range.toFixed(1));
    setText('infoFlightT', T.toFixed(1));
    setText('formulaProjectile', 'h(t) = -4.9t\u00b2 + ' + vy.toFixed(1) + 't');
  }

  function updateBridgeInfo(span, height) {
    setText('valSpan', span);
    setText('valHeight', height);
    var a = -4 * height / (span * span);
    var q1 = a * Math.pow(span / 4, 2) + height;
    var q2 = height;
    setText('infoBridgeQ1', q1.toFixed(1));
    setText('infoBridgeQ2', q2.toFixed(1));
    setText('infoCoefA', a.toFixed(4));
    setText('formulaBridge', 'y = ' + a.toFixed(4) + 'x\u00b2 + ' + height);
  }

  function updateBreakEvenInfo(quantity) {
    setText('valQuantity', quantity);
    var revenue = 200 * quantity;
    var cost = 2 * quantity * quantity + 20 * quantity + 5000;
    var profit = revenue - cost;
    var status = profit > 0 ? '\u76c8\u5229' : profit === 0 ? '\u5e73\u8861' : '\u4e8f\u635f';
    setText('infoBERevenue', revenue);
    setText('infoBECost', cost);
    setText('infoBEProfit', profit);
    setText('infoBEStatus', status);
    var statusEl = document.getElementById('infoBEStatus');
    if (statusEl) {
      statusEl.style.color = profit > 0 ? '#10b981' : profit < 0 ? '#f43f5e' : '#94a3b8';
    }
    setText('formulaBreakEven', 'P(' + quantity + ') = -2(' + quantity + ')\u00b2 + 180(' + quantity + ') - 5000 = ' + profit);
  }

  function updateInequalityInfo(budget) {
    setText('valBudget', budget);
    var delta = 2 * budget - 300;
    setText('infoDelta', delta.toFixed(1));
    if (delta < 0) {
      setText('infoIneqSolution', '\u59cb\u7ec8\u6ee1\u8db3 (\u0394<0)');
      setText('infoMaxProd', '\u65e0\u9650\u5236');
    } else {
      var xMax = -10 + Math.sqrt(delta);
      if (xMax < 0) {
        setText('infoIneqSolution', '\u65e0\u89e3 (x<0)');
        setText('infoMaxProd', '0');
      } else {
        setText('infoIneqSolution', '0 \u2264 x \u2264 ' + xMax.toFixed(1));
        setText('infoMaxProd', xMax.toFixed(1));
      }
    }
    setText('formulaInequality', '0.5x\u00b2 + 10x + 200 \u2264 ' + budget);
  }

  // ========== 6. Avg Cost Chart (ECharts) ==========
  function initAvgCostChart(targetCost) {
    var dom = document.getElementById('chartAvgCost');
    if (!dom) return;
    if (charts.avgCost) charts.avgCost.dispose();
    charts.avgCost = echarts.init(dom, null, { renderer: 'svg' });

    var lineData = [];
    var n = 100;
    var xMin = 10, xMax = 500;
    var xThresh = (targetCost > 20) ? 5000 / (targetCost - 20) : Infinity;
    var markAreaData = [];

    if (targetCost > 20) {
      var xStart = Math.max(xMin, Math.ceil(xThresh));
      if (xStart <= xMax) {
        markAreaData.push([
          { xAxis: xThresh, label: { show: true, position: 'insideTop', color: '#10b981',
            formatter: '\u6ee1\u8db3\u533a\u95f4', fontSize: 10 } },
          { xAxis: xMax }
        ]);
      }
    }

    for (var i = 0; i <= n; i++) {
      var x = xMin + (xMax - xMin) * i / n;
      var y = (5000 + 20 * x) / x;
      lineData.push([parseFloat(x.toFixed(2)), parseFloat(y.toFixed(4))]);
    }

    var yMin = (5000 + 20 * xMin) / xMin;
    var yMax = Math.max(targetCost * 1.2, yMin);

    charts.avgCost.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var x = params[0] ? params[0].data[0] : 0;
          var y = (5000 + 20 * x) / x;
          return '\u4ea7\u91cf: ' + x + ' \u4ef6\n\u5e73\u5747\u6210\u672c: ' + y.toFixed(2) + ' \u5143/\u4ef6';
        }
      }, tooltipStyle()),
      title: {
        text: '\u5e73\u5747\u6210\u672c\u66f2\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 75, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u4ea7\u91cf(\u4ef6)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: xMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u5e73\u5747\u6210\u672c(\u5143/\u4ef6)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: yMax
      }, axisStyle()),
      series: [
        {
          name: 'AC(x)',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#06b6d4', width: 2.5 },
          markArea: markAreaData.length > 0 ? { silent: true, itemStyle: { color: 'rgba(16,185,129,0.1)' }, data: markAreaData } : undefined,
          z: 3
        },
        {
          name: '\u76ee\u6807\u6210\u672c',
          type: 'line',
          data: [[0, targetCost], [xMax, targetCost]],
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          z: 2
        }
      ]
    }, true);
  }

  function updateAvgCostInfo(C0) {
    setText('valTargetCost', C0);
    if (C0 <= 20) {
      setText('infoACIneq', '(5000+20x)/x \u2264 ' + C0 + '\uff0c\u65e0\u89e3');
      setText('infoMinProd', '\u65e0\u89e3');
      setText('infoCurAC', '-');
      return;
    }
    var minX = 5000 / (C0 - 20);
    setText('infoACIneq', 'x \u2265 ' + minX.toFixed(0));
    setText('infoMinProd', minX.toFixed(0) + '\u4ef6');
    setText('infoCurAC', C0 + '.0\u5143');
  }

  // ========== 7. Drug Concentration Chart (ECharts) ==========
  function initDrugChart(thresh) {
    var dom = document.getElementById('chartDrug');
    if (!dom) return;
    if (charts.drug) charts.drug.dispose();
    charts.drug = echarts.init(dom, null, { renderer: 'svg' });

    var lineData = [];
    var n = 120;
    var tMin = 0, tMax = 12;
    var delta = 100 - 16 * thresh * thresh;
    var markAreaData = [];

    if (delta >= 0) {
      var sqrtD = Math.sqrt(delta);
      var t1 = (10 - sqrtD) / (2 * thresh);
      var t2 = (10 + sqrtD) / (2 * thresh);
      if (t1 >= 0 && t2 <= tMax) {
        markAreaData.push([
          { xAxis: parseFloat(t1.toFixed(3)), label: { show: true, position: 'insideTop', color: '#10b981',
            formatter: '\u6709\u6548\u7a97\u53e3', fontSize: 10 } },
          { xAxis: parseFloat(t2.toFixed(3)) }
        ]);
      }
    }

    for (var i = 0; i <= n; i++) {
      var t = tMin + (tMax - tMin) * i / n;
      var denom = t * t + 4;
      if (denom < 0.001) continue;
      var y = 10 * t / denom;
      lineData.push([parseFloat(t.toFixed(3)), parseFloat(y.toFixed(4))]);
    }

    var yMaxVal = 2.5;
    var yTop = Math.max(thresh * 1.3, yMaxVal * 1.2);

    charts.drug.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var t = params[0] ? params[0].data[0] : 0;
          var y = 10 * t / (t * t + 4);
          return '\u65f6\u95f4: ' + t + ' \u5c0f\u65f6\n\u6d53\u5ea6: ' + y.toFixed(3) + ' mg/L';
        }
      }, tooltipStyle()),
      title: {
        text: '\u8840\u836f\u6d53\u5ea6\u66f2\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 65, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u65f6\u95f4(\u5c0f\u65f6)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: tMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u6d53\u5ea6(mg/L)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: yTop
      }, axisStyle()),
      series: [
        {
          name: 'C(t)',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#ec4899', width: 2.5 },
          markArea: markAreaData.length > 0 ? { silent: true, itemStyle: { color: 'rgba(16,185,129,0.1)' }, data: markAreaData } : undefined,
          z: 3
        },
        {
          name: '\u9608\u503c',
          type: 'line',
          data: [[0, thresh], [tMax, thresh]],
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          z: 2
        }
      ]
    }, true);
  }

  function updateDrugInfo(C0) {
    setText('valDrugThresh', C0);
    var peakC = 2.5;
    setText('infoDrugPeak', peakC + ' mg/L');
    var delta = 100 - 16 * C0 * C0;
    if (delta < 0) {
      setText('infoDrugWindow', '\u65e0\u89e3\uff08\u5cf0\u503c\u6d53\u5ea6\u90fd\u8fbe\u4e0d\u5230\u9608\u503c\uff09');
      setText('infoDrugDuration', '-');
      return;
    }
    var sqrtD = Math.sqrt(delta);
    var t1 = (10 - sqrtD) / (2 * C0);
    var t2 = (10 + sqrtD) / (2 * C0);
    var len = t2 - t1;
    setText('infoDrugWindow', '[' + t1.toFixed(2) + ', ' + t2.toFixed(2) + '] \u5c0f\u65f6');
    setText('infoDrugDuration', len.toFixed(1) + 'h');
  }

  // ========== 8. Pollution Chart (ECharts) ==========
  function initPollutionChart(thresh) {
    var dom = document.getElementById('chartPollution');
    if (!dom) return;
    if (charts.pollution) charts.pollution.dispose();
    charts.pollution = echarts.init(dom, null, { renderer: 'svg' });

    var lineData = [];
    var n = 100;
    var dMin = 0, dMax = 50;
    var markAreaData = [];

    var srcC = 80;
    var val = 8000 / thresh - 100;

    if (val <= 0) {
      markAreaData.push([
        { xAxis: dMin, label: { show: true, position: 'insideTop', color: '#10b981',
          formatter: '\u5904\u5904\u5b89\u5168', fontSize: 10 } },
        { xAxis: dMax }
      ]);
    } else {
      var dSafe = Math.sqrt(val);
      if (dSafe < dMax) {
        markAreaData.push([
          { xAxis: parseFloat(dSafe.toFixed(2)), label: { show: true, position: 'insideTop', color: '#10b981',
            formatter: '\u5b89\u5168\u533a\u95f4', fontSize: 10 } },
          { xAxis: dMax }
        ]);
      }
    }

    for (var i = 0; i <= n; i++) {
      var d = dMin + (dMax - dMin) * i / n;
      var y = 8000 / (d * d + 100);
      lineData.push([parseFloat(d.toFixed(2)), parseFloat(y.toFixed(4))]);
    }

    var yTop = Math.max(thresh * 1.3, srcC);

    charts.pollution.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var d = params[0] ? params[0].data[0] : 0;
          var y = 8000 / (d * d + 100);
          return '\u8ddd\u79bb: ' + d + ' m\n\u6d53\u5ea6: ' + y.toFixed(2) + ' \u03bcg/m\u00b3';
        }
      }, tooltipStyle()),
      title: {
        text: '\u6c61\u67d3\u7269\u6d53\u5ea6\u8870\u51cf\u66f2\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 75, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u8ddd\u79bb(m)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: dMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u6d53\u5ea6(\u03bcg/m\u00b3)',
        nameTextStyle: { color: '#94a3b8' },
        min: 0, max: yTop
      }, axisStyle()),
      series: [
        {
          name: 'C(d)',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#ef4444', width: 2.5 },
          markArea: markAreaData.length > 0 ? { silent: true, itemStyle: { color: 'rgba(16,185,129,0.1)' }, data: markAreaData } : undefined,
          z: 3
        },
        {
          name: '\u5b89\u5168\u6807\u51c6',
          type: 'line',
          data: [[0, thresh], [dMax, thresh]],
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          z: 2
        }
      ]
    }, true);
  }

  function updatePollutionInfo(C0) {
    setText('valPollThresh', C0);
    var srcC = 80;
    setText('infoPollSrc', srcC + ' \u03bcg/m\u00b3');
    setText('infoPollRatio', (srcC / C0).toFixed(1) + 'x');
    var val = 8000 / C0 - 100;
    if (val <= 0) {
      setText('infoPollSafe', '\u5904\u5904\u5b89\u5168');
      return;
    }
    var dSafe = Math.sqrt(val);
    setText('infoPollSafe', 'd \u2265 ' + dSafe.toFixed(1) + 'm');
  }

  // ========== 9. Material Strength Chart (ECharts) ==========
  function initMaterialChart(temp) {
    var dom = document.getElementById('chartMaterial');
    if (!dom) return;
    if (charts.material) charts.material.dispose();
    charts.material = echarts.init(dom, null, { renderer: 'svg' });

    var lineData = [];
    var n = 150;
    var TMin = -50, TMax = 400;

    var markAreaData = [];
    markAreaData.push([
      { xAxis: -20, label: { show: true, position: 'insideTop', color: '#f43f5e',
        formatter: '\u5371\u9669', fontSize: 10 } },
      { xAxis: 100, itemStyle: { color: 'rgba(16,185,129,0.1)' },
        label: { show: true, position: 'insideTop', color: '#10b981',
          formatter: '\u5b89\u5168', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 100, label: { show: false },
        itemStyle: { color: 'rgba(244,63,94,0.08)' } },
      { xAxis: 300, label: { show: true, position: 'insideTop', color: '#f43f5e',
        formatter: '\u5371\u9669', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 300, label: { show: false },
        itemStyle: { color: 'rgba(16,185,129,0.1)' } },
      { xAxis: TMax, label: { show: true, position: 'insideTop', color: '#10b981',
        formatter: '\u5b89\u5168', fontSize: 10 } }
    ]);

    for (var i = 0; i <= n; i++) {
      var T = TMin + (TMax - TMin) * i / n;
      var y = (T + 20) * (T - 100) * (T - 300) / 100000;
      lineData.push([parseFloat(T.toFixed(2)), parseFloat(y.toFixed(4))]);
    }

    charts.material.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var T = params[0] ? params[0].data[0] : 0;
          var y = (T + 20) * (T - 100) * (T - 300) / 100000;
          return '\u6e29\u5ea6: ' + T + ' \u2103\n\u5f3a\u5ea6\u7cfb\u6570: ' + y.toFixed(4);
        }
      }, tooltipStyle()),
      title: {
        text: '\u6750\u6599\u5f3a\u5ea6\u7cfb\u6570',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 65, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u6e29\u5ea6(\u2103)',
        nameTextStyle: { color: '#94a3b8' },
        min: TMin, max: TMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u5f3a\u5ea6\u7cfb\u6570',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: 'S(T)',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#a855f7', width: 2.5 },
          markArea: { silent: true, data: markAreaData },
          z: 3
        },
        {
          name: 'y=0',
          type: 'line',
          data: [[TMin, 0], [TMax, 0]],
          showSymbol: false,
          lineStyle: { color: '#64748b', width: 1.5, type: 'dashed' },
          z: 2
        },
        {
          name: '\u5f53\u524d\u6e29\u5ea6',
          type: 'scatter',
          data: [[temp, (temp + 20) * (temp - 100) * (temp - 300) / 100000]],
          symbolSize: 10,
          itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 1.5 },
          z: 10
        }
      ]
    }, true);
  }

  function updateMaterialInfo(T) {
    setText('valTemp', T);
    var sVal = (T + 20) * (T - 100) * (T - 300) / 100000;
    setText('infoMatSafe', '(-20, 100) \u222a (300, +\u221e) \u2103');
    setText('infoMatS', sVal.toFixed(4));
    var safe = sVal > 0;
    setText('infoMatStatus', safe ? '\u5b89\u5168' : '\u5371\u9669');
    var statusEl = document.getElementById('infoMatStatus');
    if (statusEl) {
      statusEl.style.color = safe ? '#10b981' : '#f43f5e';
    }
  }

  // ========== 10. Multi-Product Profit Chart (ECharts) ==========
  function initMultiProdChart(price) {
    var dom = document.getElementById('chartMultiProd');
    if (!dom) return;
    if (charts.multiProd) charts.multiProd.dispose();
    charts.multiProd = echarts.init(dom, null, { renderer: 'svg' });

    var lineData = [];
    var n = 140;
    var pMin = 10, pMax = 150;

    var markAreaData = [];
    markAreaData.push([
      { xAxis: pMin, label: { show: true, position: 'insideTop', color: '#10b981',
        formatter: '\u76c8\u5229', fontSize: 10 } },
      { xAxis: 30, itemStyle: { color: 'rgba(244,63,94,0.08)' },
        label: { show: true, position: 'insideTop', color: '#f43f5e',
          formatter: '\u4e8f\u635f', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 30, label: { show: false },
        itemStyle: { color: 'rgba(16,185,129,0.1)' } },
      { xAxis: 60, label: { show: true, position: 'insideTop', color: '#10b981',
        formatter: '\u76c8\u5229', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 60, label: { show: false },
        itemStyle: { color: 'rgba(244,63,94,0.08)' } },
      { xAxis: 120, label: { show: true, position: 'insideTop', color: '#f43f5e',
        formatter: '\u4e8f\u635f', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 120, label: { show: false },
        itemStyle: { color: 'rgba(16,185,129,0.1)' } },
      { xAxis: pMax, label: { show: true, position: 'insideTop', color: '#10b981',
        formatter: '\u76c8\u5229', fontSize: 10 } }
    ]);

    for (var i = 0; i <= n; i++) {
      var p = pMin + (pMax - pMin) * i / n;
      var y = -(p - 30) * (p - 60) * (p - 120) / 100;
      lineData.push([parseFloat(p.toFixed(2)), parseFloat(y.toFixed(4))]);
    }

    var pVal = -(price - 30) * (price - 60) * (price - 120) / 100;

    charts.multiProd.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var p = params[0] ? params[0].data[0] : 0;
          var y = -(p - 30) * (p - 60) * (p - 120) / 100;
          return '\u5b9a\u4ef7: ' + p + ' \u5143\n\u5229\u6da6: ' + y.toFixed(2) + ' \u4e07\u5143';
        }
      }, tooltipStyle()),
      title: {
        text: '\u7efc\u5408\u5229\u6da6\u66f2\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 65, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u5b9a\u4ef7(\u5143)',
        nameTextStyle: { color: '#94a3b8' },
        min: pMin, max: pMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u5229\u6da6(\u4e07\u5143)',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: 'P(p)',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#06b6d4', width: 2.5 },
          markArea: { silent: true, data: markAreaData },
          z: 3
        },
        {
          name: 'y=0',
          type: 'line',
          data: [[pMin, 0], [pMax, 0]],
          showSymbol: false,
          lineStyle: { color: '#64748b', width: 1.5, type: 'dashed' },
          z: 2
        },
        {
          name: '\u6839\u70b9',
          type: 'scatter',
          data: [[30, 0], [60, 0], [120, 0]],
          symbolSize: 10,
          itemStyle: { color: '#f43f5e' },
          label: {
            show: true, position: 'bottom',
            color: '#f43f5e', fontSize: 10,
            formatter: function(p) { return 'p=' + p.data[0]; }
          },
          z: 10
        },
        {
          name: '\u5f53\u524d\u5b9a\u4ef7',
          type: 'scatter',
          data: [[price, pVal]],
          symbolSize: 10,
          itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 1.5 },
          z: 10
        }
      ]
    }, true);
  }

  function updateMultiProdInfo(p) {
    setText('valMultiPrice', p);
    var pVal = -(p - 30) * (p - 60) * (p - 120) / 100;
    setText('infoMultiRange', '[30, 60] \u222a [120, +\u221e)');
    setText('infoMultiProfit', pVal.toFixed(1) + '\u4e07\u5143');
    var profit = pVal >= 0;
    setText('infoMultiStatus', profit ? '\u76c8\u5229' : '\u4e8f\u635f');
    var statusEl = document.getElementById('infoMultiStatus');
    if (statusEl) {
      statusEl.style.color = profit ? '#10b981' : '#f43f5e';
    }
  }

  // ========== 11. Population Model Chart (ECharts) ==========
  function initPopChart(popN, rCoeff) {
    var dom = document.getElementById('chartPop');
    if (!dom) return;
    if (charts.pop) charts.pop.dispose();
    charts.pop = echarts.init(dom, null, { renderer: 'svg' });

    var lineData = [];
    var n = 200;
    var NMin = 0, NMax = 1000;

    var markAreaData = [];
    markAreaData.push([
      { xAxis: NMin, label: { show: true, position: 'insideTop', color: '#f43f5e',
        formatter: '\u7f29\u51cf', fontSize: 10 } },
      { xAxis: 200, itemStyle: { color: 'rgba(16,185,129,0.1)' },
        label: { show: true, position: 'insideTop', color: '#10b981',
          formatter: '\u589e\u957f', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 200, label: { show: false },
        itemStyle: { color: 'rgba(16,185,129,0.1)' } },
      { xAxis: 500, label: { show: true, position: 'insideTop', color: '#10b981',
        formatter: '\u589e\u957f', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 500, label: { show: false },
        itemStyle: { color: 'rgba(244,63,94,0.08)' } },
      { xAxis: 800, label: { show: true, position: 'insideTop', color: '#f43f5e',
        formatter: '\u7f29\u51cf', fontSize: 10 } }
    ]);
    markAreaData.push([
      { xAxis: 800, label: { show: false },
        itemStyle: { color: 'rgba(16,185,129,0.1)' } },
      { xAxis: NMax, label: { show: true, position: 'insideTop', color: '#10b981',
        formatter: '\u589e\u957f', fontSize: 10 } }
    ]);

    for (var i = 0; i <= n; i++) {
      var N = NMin + (NMax - NMin) * i / n;
      var y = rCoeff * (N - 200) * (500 - N) * (N - 800) / 10000;
      lineData.push([parseFloat(N.toFixed(2)), parseFloat(y.toFixed(4))]);
    }

    var gVal = rCoeff * (popN - 200) * (500 - popN) * (popN - 800) / 10000;

    charts.pop.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var N = params[0] ? params[0].data[0] : 0;
          var y = rCoeff * (N - 200) * (500 - N) * (N - 800) / 10000;
          return '\u79cd\u7fa4\u6570\u91cf: ' + N + ' \u53ea\n\u51c0\u589e\u957f\u7387: ' + y.toFixed(4);
        }
      }, tooltipStyle()),
      title: {
        text: '\u79cd\u7fa4\u51c0\u589e\u957f\u7387\u66f2\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 75, right: 30, top: 55, bottom: 50 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u79cd\u7fa4\u6570\u91cf(\u53ea)',
        nameTextStyle: { color: '#94a3b8' },
        min: NMin, max: NMax
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u51c0\u589e\u957f\u7387',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: 'g(N)',
          type: 'line',
          data: lineData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#22c55e', width: 2.5 },
          markArea: { silent: true, data: markAreaData },
          z: 3
        },
        {
          name: 'y=0',
          type: 'line',
          data: [[NMin, 0], [NMax, 0]],
          showSymbol: false,
          lineStyle: { color: '#64748b', width: 1.5, type: 'dashed' },
          z: 2
        },
        {
          name: '\u6839\u70b9',
          type: 'scatter',
          data: [[200, 0], [500, 0], [800, 0]],
          symbolSize: 10,
          itemStyle: { color: '#f43f5e' },
          label: {
            show: true, position: 'bottom',
            color: '#f43f5e', fontSize: 10,
            formatter: function(p) { return 'N=' + p.data[0]; }
          },
          z: 10
        },
        {
          name: '\u5f53\u524d\u79cd\u7fa4',
          type: 'scatter',
          data: [[popN, gVal]],
          symbolSize: 10,
          itemStyle: { color: '#22c55e', borderColor: '#fff', borderWidth: 1.5 },
          z: 10
        }
      ]
    }, true);
  }

  function updatePopInfo(N, r) {
    setText('valPop', N);
    setText('valPopR', r);
    var gVal = r * (N - 200) * (500 - N) * (N - 800) / 10000;
    setText('infoPopGrow', '(200, 500) \u222a (800, +\u221e)');
    var growing = gVal > 0;
    setText('infoPopG', growing ? '\u6b63\u503c' : '\u8d1f\u503c');
    var gEl = document.getElementById('infoPopG');
    if (gEl) {
      gEl.style.color = growing ? '#10b981' : '#f43f5e';
    }
    setText('infoPopTrend', growing ? '\u589e\u957f' : '\u7f29\u51cf');
    var trendEl = document.getElementById('infoPopTrend');
    if (trendEl) {
      trendEl.style.color = growing ? '#10b981' : '#f43f5e';
    }
  }

  // ========== Init All ==========
  function initAllCharts() {
    var defaultPrice = 50;
    var defaultVelocity = 30;
    var defaultAngle = 45;
    var defaultSpan = 100;
    var defaultHeight = 30;
    var defaultQuantity = 50;
    var defaultBudget = 400;

    // Initialize all charts with default values
    initProfitChart(defaultPrice);
    updateProfitInfo(defaultPrice);
    initProjectileChart(defaultVelocity, defaultAngle);
    updateProjectileInfo(defaultVelocity, defaultAngle);
    initBridgeChart(defaultSpan, defaultHeight);
    updateBridgeInfo(defaultSpan, defaultHeight);
    initBreakEvenChart(defaultQuantity);
    updateBreakEvenInfo(defaultQuantity);
    initInequalityChart(defaultBudget);
    updateInequalityInfo(defaultBudget);
    initAvgCostChart(60);
    updateAvgCostInfo(60);
    initDrugChart(1.5);
    updateDrugInfo(1.5);
    initPollutionChart(40);
    updatePollutionInfo(40);
    initMaterialChart(50);
    updateMaterialInfo(50);
    initMultiProdChart(50);
    updateMultiProdInfo(50);
    initPopChart(350, 1.0);
    updatePopInfo(350, 1.0);

    // Slider: Price
    var sliderPrice = document.getElementById('sliderPrice');
    if (sliderPrice) {
      sliderPrice.addEventListener('input', function() {
        var v = parseInt(this.value);
        updateProfitInfo(v);
        initProfitChart(v);
      });
    }

    // Slider: Velocity
    var sliderVelocity = document.getElementById('sliderVelocity');
    if (sliderVelocity) {
      sliderVelocity.addEventListener('input', function() {
        var v = parseInt(this.value);
        var a = document.getElementById('sliderAngle') ? parseInt(document.getElementById('sliderAngle').value) : defaultAngle;
        updateProjectileInfo(v, a);
        initProjectileChart(v, a);
      });
    }

    // Slider: Angle
    var sliderAngle = document.getElementById('sliderAngle');
    if (sliderAngle) {
      sliderAngle.addEventListener('input', function() {
        var a = parseInt(this.value);
        var v = document.getElementById('sliderVelocity') ? parseInt(document.getElementById('sliderVelocity').value) : defaultVelocity;
        updateProjectileInfo(v, a);
        initProjectileChart(v, a);
      });
    }

    // Slider: Span
    var sliderSpan = document.getElementById('sliderSpan');
    if (sliderSpan) {
      sliderSpan.addEventListener('input', function() {
        var s = parseInt(this.value);
        var h = document.getElementById('sliderHeight') ? parseInt(document.getElementById('sliderHeight').value) : defaultHeight;
        updateBridgeInfo(s, h);
        initBridgeChart(s, h);
      });
    }

    // Slider: Height
    var sliderHeight = document.getElementById('sliderHeight');
    if (sliderHeight) {
      sliderHeight.addEventListener('input', function() {
        var h = parseInt(this.value);
        var s = document.getElementById('sliderSpan') ? parseInt(document.getElementById('sliderSpan').value) : defaultSpan;
        updateBridgeInfo(s, h);
        initBridgeChart(s, h);
      });
    }

    // Slider: Quantity
    var sliderQuantity = document.getElementById('sliderQuantity');
    if (sliderQuantity) {
      sliderQuantity.addEventListener('input', function() {
        var q = parseInt(this.value);
        updateBreakEvenInfo(q);
        initBreakEvenChart(q);
      });
    }

    // Slider: Budget
    var sliderBudget = document.getElementById('sliderBudget');
    if (sliderBudget) {
      sliderBudget.addEventListener('input', function() {
        var b = parseInt(this.value);
        updateInequalityInfo(b);
        initInequalityChart(b);
      });
    }

    // Slider: Target Cost
    var sliderTargetCost = document.getElementById('sliderTargetCost');
    if (sliderTargetCost) {
      sliderTargetCost.addEventListener('input', function() {
        var v = parseInt(this.value);
        updateAvgCostInfo(v);
        initAvgCostChart(v);
      });
    }

    // Slider: Drug Threshold
    var sliderDrugThresh = document.getElementById('sliderDrugThresh');
    if (sliderDrugThresh) {
      sliderDrugThresh.addEventListener('input', function() {
        var v = parseFloat(this.value);
        updateDrugInfo(v);
        initDrugChart(v);
      });
    }

    // Slider: Pollution Threshold
    var sliderPollThresh = document.getElementById('sliderPollThresh');
    if (sliderPollThresh) {
      sliderPollThresh.addEventListener('input', function() {
        var v = parseInt(this.value);
        updatePollutionInfo(v);
        initPollutionChart(v);
      });
    }

    // Slider: Temperature
    var sliderTemp = document.getElementById('sliderTemp');
    if (sliderTemp) {
      sliderTemp.addEventListener('input', function() {
        var v = parseInt(this.value);
        updateMaterialInfo(v);
        initMaterialChart(v);
      });
    }

    // Slider: Multi-Product Price
    var sliderMultiPrice = document.getElementById('sliderMultiPrice');
    if (sliderMultiPrice) {
      sliderMultiPrice.addEventListener('input', function() {
        var v = parseInt(this.value);
        updateMultiProdInfo(v);
        initMultiProdChart(v);
      });
    }

    // Slider: Population N
    var sliderPop = document.getElementById('sliderPop');
    if (sliderPop) {
      sliderPop.addEventListener('input', function() {
        var v = parseInt(this.value);
        var r = document.getElementById('sliderPopR') ? parseFloat(document.getElementById('sliderPopR').value) : 1.0;
        updatePopInfo(v, r);
        initPopChart(v, r);
      });
    }

    // Slider: Population r
    var sliderPopR = document.getElementById('sliderPopR');
    if (sliderPopR) {
      sliderPopR.addEventListener('input', function() {
        var r = parseFloat(this.value);
        var popN = document.getElementById('sliderPop') ? parseInt(document.getElementById('sliderPop').value) : 350;
        updatePopInfo(popN, r);
        initPopChart(popN, r);
      });
    }
  }

  // ========== Responsive resize ==========
  window.addEventListener('resize', function() {
    Object.keys(charts).forEach(function(k) {
      if (charts[k] && charts[k].resize) charts[k].resize();
    });
  });

  // ========== DOM ready ==========
  document.addEventListener('DOMContentLoaded', initAllCharts);
})();