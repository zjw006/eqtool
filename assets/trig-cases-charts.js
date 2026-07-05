(function() {
  'use strict';

  var charts = {};

  // ===== CSS 变量读取 =====
  var style = getComputedStyle(document.documentElement);
  var accent  = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var accent4 = style.getPropertyValue('--accent4').trim();
  var ink     = style.getPropertyValue('--ink').trim();
  var muted   = style.getPropertyValue('--muted').trim();
  var rule    = style.getPropertyValue('--rule').trim();
  var bg2     = style.getPropertyValue('--bg2').trim();
  var bg3     = style.getPropertyValue('--bg3').trim();

  // ===== 通用 ECharts 配置 =====
  function commonOption() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: bg3,
        borderColor: rule,
        textStyle: { color: ink, fontFamily: 'JetBrainsMono, monospace', fontSize: 12 }
      },
      grid: { left: 55, right: 30, top: 40, bottom: 45 },
      xAxis: {
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono, monospace', fontSize: 11 },
        splitLine: { show: false }
      },
      yAxis: {
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono, monospace' },
        splitLine: { lineStyle: { color: '#33415540' } }
      }
    };
  }

  // ===== 通用滑块绑定工具函数 =====
  function bindSlider(rangeId, valId, parseFn, callback) {
    var range = document.getElementById(rangeId);
    var val = document.getElementById(valId);
    if (!range || !val) return;
    range.addEventListener('input', function() {
      val.textContent = parseFn(this.value);
      callback();
    });
  }

  // ===== Canvas 设备像素比适配 =====
  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: rect.width, height: rect.height, dpr: dpr };
  }

  // ============================================================
  // 案例1：测量高度（仰角与正切）
  // ============================================================
  function initBuildingCase() {
    var canvas = document.getElementById('buildingCanvas');
    if (!canvas) return;
    var c = setupCanvas(canvas);
    var ctx = c.ctx, W = c.width, H = c.height;

    var dist = 50, angle = 60, eye = 1.6;

    function drawScene() {
      c = setupCanvas(canvas);
      ctx = c.ctx; W = c.width; H = c.height;
      ctx.clearRect(0, 0, W, H);

      var groundY = H - 50;
      var padLeft = 40, padRight = 40;
      var availW = W - padLeft - padRight;
      var scale = availW / 120; // 120m max range

      var buildingX = padLeft;
      var observerX = buildingX + dist * scale;

      var rad = angle * Math.PI / 180;
      var buildingH = dist * Math.tan(rad);
      var totalH = buildingH + eye;
      var maxH = 120 * Math.tan(80 * Math.PI / 180) + 2;
      var scaleY = (groundY - 30) / maxH;

      var buildingPxH = buildingH * scaleY;
      var eyePx = eye * scaleY;
      var totalPxH = totalH * scaleY;

      // 地面线
      ctx.strokeStyle = rule;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // 建筑物
      var bw = Math.max(30, dist * scale * 0.25);
      ctx.fillStyle = '#06b6d430';
      ctx.fillRect(buildingX, groundY - buildingPxH, bw, buildingPxH);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(buildingX, groundY - buildingPxH, bw, buildingPxH);

      // 观察者（小圆点）
      ctx.fillStyle = accent2;
      ctx.beginPath();
      ctx.arc(observerX, groundY - eyePx, 5, 0, Math.PI * 2);
      ctx.fill();

      // 视线虚线
      ctx.strokeStyle = accent3;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(observerX, groundY - eyePx);
      ctx.lineTo(buildingX + bw / 2, groundY - buildingPxH);
      ctx.stroke();
      ctx.setLineDash([]);

      // 水平参考线
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(buildingX + bw / 2, groundY - buildingPxH);
      ctx.lineTo(observerX, groundY - buildingPxH);
      ctx.stroke();
      ctx.setLineDash([]);

      // 角度弧
      var arcR = 30;
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(observerX, groundY - eyePx, arcR, -Math.PI, -Math.PI + rad);
      ctx.stroke();

      // 标注
      ctx.fillStyle = ink;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('θ = ' + angle + '°', observerX - arcR - 15, groundY - eyePx - 5);

      ctx.fillStyle = muted;
      ctx.fillText('L = ' + dist + ' m', (buildingX + observerX) / 2, groundY + 20);

      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      ctx.fillText('H = ' + buildingH.toFixed(1) + ' m', buildingX + bw + 8, groundY - buildingPxH / 2);

      ctx.fillStyle = accent2;
      ctx.textAlign = 'center';
      ctx.fillText('h = ' + eye.toFixed(1) + ' m', observerX, groundY - eyePx - 10);
    }

    function updateResult() {
      var rad = angle * Math.PI / 180;
      var h = dist * Math.tan(rad);
      var total = h + eye;
      var el = document.getElementById('b-result');
      if (el) {
        el.innerHTML =
          '<div class="res-label">计算过程</div>' +
          '<div>H = h + L × tan θ = ' + eye.toFixed(1) + ' + ' + dist + ' × tan(' + angle + '°)</div>' +
          '<div>H = ' + eye.toFixed(1) + ' + ' + dist + ' × ' + Math.tan(rad).toFixed(3) + ' = ' + total.toFixed(1) + ' m</div>' +
          '<div>建筑高度 ≈ <span class="res-value">' + total.toFixed(1) + '</span> 米</div>';
      }
    }

    bindSlider('b-dist', 'val-b-dist', function(v) {
      dist = parseFloat(v); return dist;
    }, function() { drawScene(); updateResult(); });

    bindSlider('b-angle', 'val-b-angle', function(v) {
      angle = parseFloat(v); return angle + '°';
    }, function() { drawScene(); updateResult(); });

    bindSlider('b-eye', 'val-b-eye', function(v) {
      eye = parseFloat(v); return eye.toFixed(1);
    }, function() { drawScene(); updateResult(); });

    drawScene();
    updateResult();
  }

  // ============================================================
  // 案例2：航海定向（余弦定理）
  // ============================================================
  function initNavCase() {
    var canvas = document.getElementById('navCanvas');
    if (!canvas) return;
    var c = setupCanvas(canvas);
    var ctx = c.ctx, W = c.width, H = c.height;

    var AB = 40, BC = 30, angleB = 120;
    var shipProgress = 0; // 0~3, 0:A->B, 1:B->C, 2:C->A
    var animId = null;

    function calcTriangle() {
      var radB = angleB * Math.PI / 180;
      var AC = Math.sqrt(AB * AB + BC * BC - 2 * AB * BC * Math.cos(radB));
      var angleA = Math.asin(BC * Math.sin(radB) / AC) * 180 / Math.PI;
      var angleC = 180 - angleB - angleA;
      return { AC: AC, angleA: angleA, angleC: angleC };
    }

    function getShipPos() {
      var t = shipProgress % 3;
      var seg = Math.floor(t);
      var frac = t - seg;
      if (seg === 0) {
        return { x: AB * frac, y: 0 };
      } else if (seg === 1) {
        var radB = angleB * Math.PI / 180;
        return { x: AB + BC * Math.cos(Math.PI - radB) * frac, y: BC * Math.sin(Math.PI - radB) * frac };
      } else {
        var tri = calcTriangle();
        var radA = tri.angleA * Math.PI / 180;
        var AC = tri.AC;
        return { x: AC * Math.cos(radA) * (1 - frac), y: AC * Math.sin(radA) * (1 - frac) };
      }
    }

    function drawScene() {
      c = setupCanvas(canvas);
      ctx = c.ctx; W = c.width; H = c.height;
      ctx.clearRect(0, 0, W, H);

      var tri = calcTriangle();
      var pad = 60;
      var availW = W - pad * 2;
      var availH = H - pad * 2;

      var scale = Math.min(availW / (AB + BC), availH / (tri.AC * Math.sin(tri.angleA * Math.PI / 180) + 10));
      var ox = pad, oy = H - pad;

      var Ax = ox, Ay = oy;
      var Bx = ox + AB * scale, By = oy;
      var radB = angleB * Math.PI / 180;
      var Cx = Bx + BC * Math.cos(Math.PI - radB) * scale;
      var Cy = By - BC * Math.sin(Math.PI - radB) * scale;

      // 三角形边
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Ax, Ay);
      ctx.lineTo(Bx, By);
      ctx.lineTo(Cx, Cy);
      ctx.lineTo(Ax, Ay);
      ctx.stroke();

      // 顶点标注
      ctx.fillStyle = ink;
      ctx.font = '14px Outfit';
      ctx.textAlign = 'right';
      ctx.fillText('A', Ax - 8, Ay + 5);
      ctx.textAlign = 'left';
      ctx.fillText('B', Bx + 8, By + 5);
      ctx.textAlign = 'center';
      ctx.fillText('C', Cx, Cy - 10);

      // 边长标注
      ctx.fillStyle = muted;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('AB = ' + AB, (Ax + Bx) / 2, Ay + 20);
      ctx.fillText('BC = ' + BC, (Bx + Cx) / 2 + 5, (By + Cy) / 2);
      ctx.textAlign = 'right';
      ctx.fillText('AC ≈ ' + tri.AC.toFixed(1), (Ax + Cx) / 2 - 5, (Ay + Cy) / 2);

      // 角度标注
      ctx.fillStyle = accent2;
      ctx.textAlign = 'left';
      ctx.fillText('∠B = ' + angleB + '°', Bx + 5, By - 5);
      ctx.fillText('∠A ≈ ' + tri.angleA.toFixed(1) + '°', Ax + 5, Ay - 10);

      // 动画船
      var ship = getShipPos();
      var sx = ox + ship.x * scale;
      var sy = oy - ship.y * scale;
      ctx.fillStyle = accent3;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function updateResult() {
      var tri = calcTriangle();
      var el = document.getElementById('nav-result');
      if (el) {
        el.innerHTML =
          '<div class="res-label">计算结果</div>' +
          '<div>AC 距离 = <span class="res-value">' + tri.AC.toFixed(1) + '</span> km</div>' +
          '<div>角 A = arcsin(' + BC + '×sin(' + angleB + '°)/' + tri.AC.toFixed(1) + ') ≈ <span class="res-value">' + tri.angleA.toFixed(1) + '°</span></div>' +
          '<div>返回方位角 ≈ <span class="res-value">' + tri.angleA.toFixed(1) + '°</span></div>';
      }
    }

    function animate() {
      shipProgress += 0.008;
      if (shipProgress > 3) shipProgress = 0;
      drawScene();
      animId = requestAnimationFrame(animate);
    }

    drawScene();
    updateResult();
    animate();
  }

  // ============================================================
  // 案例3：太阳能板安装角度
  // ============================================================
  function initSolarCase() {
    var canvas = document.getElementById('solarCanvas');
    if (!canvas) return;
    var c = setupCanvas(canvas);
    var ctx = c.ctx, W = c.width, H = c.height;

    var lat = 40;
    var season = 'winter'; // winter, summer, average

    function calcAngles() {
      var h, tilt;
      if (season === 'winter') {
        h = 90 - lat - 23.5;
        tilt = 90 - h;
      } else if (season === 'summer') {
        h = 90 - lat + 23.5;
        tilt = 90 - h;
      } else {
        tilt = lat;
        h = 90 - tilt;
      }
      return { h: h, tilt: tilt };
    }

    function drawScene() {
      c = setupCanvas(canvas);
      ctx = c.ctx; W = c.width; H = c.height;
      ctx.clearRect(0, 0, W, H);

      var ang = calcAngles();
      var groundY = H - 60;
      var cx = W / 2;

      // 地面线
      ctx.strokeStyle = rule;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, groundY);
      ctx.lineTo(W - 20, groundY);
      ctx.stroke();

      // 太阳弧线（不同季节位置）
      var sunR = 80;
      var sunY = groundY - 40;

      // 冬至太阳位置（最低）
      var winterH = (90 - lat - 23.5) * Math.PI / 180;
      var summerH = (90 - lat + 23.5) * Math.PI / 180;
      var avgH = (90 - lat) * Math.PI / 180;

      var sxW = cx - sunR * Math.cos(winterH);
      var syW = sunY - sunR * Math.sin(winterH);
      var sxS = cx - sunR * Math.cos(summerH);
      var syS = sunY - sunR * Math.sin(summerH);
      var sxA = cx - sunR * Math.cos(avgH);
      var syA = sunY - sunR * Math.sin(avgH);

      // 绘制太阳轨迹弧
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, sunY, sunR, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // 各季节太阳
      ctx.fillStyle = season === 'winter' ? accent2 : muted;
      ctx.beginPath(); ctx.arc(sxW, syW, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = season === 'summer' ? accent2 : muted;
      ctx.beginPath(); ctx.arc(sxS, syS, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = season === 'average' ? accent2 : muted;
      ctx.beginPath(); ctx.arc(sxA, syA, 8, 0, Math.PI * 2); ctx.fill();

      // 太阳光线到太阳能板
      var sunX = season === 'winter' ? sxW : (season === 'summer' ? sxS : sxA);
      var sunYPos = season === 'winter' ? syW : (season === 'summer' ? syS : syA);

      // 太阳能板
      var panelW = 100, panelH = 6;
      var tiltRad = ang.tilt * Math.PI / 180;
      var px = cx - panelW / 2 * Math.cos(tiltRad);
      var py = groundY - panelW / 2 * Math.sin(tiltRad);

      ctx.save();
      ctx.translate(cx, groundY);
      ctx.rotate(-tiltRad);
      ctx.fillStyle = 'rgba(6,182,212,0.35)';
      ctx.fillRect(-panelW / 2, -panelH, panelW, panelH);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-panelW / 2, -panelH, panelW, panelH);
      ctx.restore();

      // 支架
      ctx.strokeStyle = muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 20, groundY);
      ctx.lineTo(cx - 10, groundY - 20 * Math.sin(tiltRad));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 20, groundY);
      ctx.lineTo(cx + 10, groundY - 20 * Math.sin(tiltRad));
      ctx.stroke();

      // 太阳光线
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sunX, sunYPos);
      ctx.lineTo(cx, groundY - 25 * Math.sin(tiltRad));
      ctx.stroke();
      ctx.setLineDash([]);

      // 倾角弧线
      ctx.strokeStyle = accent3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, groundY, 40, -tiltRad, 0);
      ctx.stroke();

      // 标注
      ctx.fillStyle = ink;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('倾角 θ = ' + ang.tilt.toFixed(1) + '°', cx + 50, groundY - 10);

      ctx.fillStyle = muted;
      ctx.font = '11px Outfit';
      ctx.fillText('冬至', sxW, syW + 20);
      ctx.fillText('夏至', sxS, syS - 15);
      ctx.fillText('平均', sxA, syA - 15);

      ctx.fillStyle = accent;
      ctx.font = '12px JetBrainsMono';
      ctx.fillText('太阳高度角 h = ' + ang.h.toFixed(1) + '°', cx, 25);
    }

    function updateResult() {
      var ang = calcAngles();
      var el = document.getElementById('s-result');
      var seasonName = season === 'winter' ? '冬至' : (season === 'summer' ? '夏至' : '全年平均');
      if (el) {
        el.innerHTML =
          '<div class="res-label">推荐安装角度（' + seasonName + '）</div>' +
          '<div>最佳倾角 = <span class="res-value">' + ang.tilt.toFixed(1) + '°</span></div>' +
          '<div>太阳高度角 = <span class="res-value">' + ang.h.toFixed(1) + '°</span></div>';
      }
    }

    bindSlider('s-lat', 'val-s-lat', function(v) {
      lat = parseFloat(v); return lat + '°';
    }, function() { drawScene(); updateResult(); });

    var seasonBtns = document.querySelectorAll('#s-season .season-btn');
    seasonBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        seasonBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        season = btn.dataset.season;
        drawScene();
        updateResult();
      });
    });

    drawScene();
    updateResult();
  }

  // ============================================================
  // 案例4：声音合成与音乐（ECharts）
  // ============================================================
  function initSoundCase() {
    var domSound = document.getElementById('chartSound');
    var domBeat = document.getElementById('chartBeat');
    if (!domSound || !domBeat) return;

    charts.sound = echarts.init(domSound, null, { renderer: 'svg' });
    charts.beat = echarts.init(domBeat, null, { renderer: 'svg' });

    var a1 = 1, a2 = 0.5, a3 = 0.3;

    function genSoundData() {
      var steps = 1000;
      var tMax = 0.01;
      var data = [];
      for (var i = 0; i <= steps; i++) {
        var t = tMax * i / steps;
        var y = a1 * Math.sin(2 * Math.PI * 440 * t) +
                a2 * Math.sin(2 * Math.PI * 880 * t) +
                a3 * Math.sin(2 * Math.PI * 1320 * t);
        data.push([parseFloat(t.toFixed(6)), parseFloat(y.toFixed(5))]);
      }
      return data;
    }

    function genBeatData() {
      var steps = 1000;
      var tMax = 1;
      var data = [];
      for (var i = 0; i <= steps; i++) {
        var t = tMax * i / steps;
        var y = Math.sin(440 * 2 * Math.PI * t) + Math.sin(442 * 2 * Math.PI * t);
        data.push([parseFloat(t.toFixed(4)), parseFloat(y.toFixed(4))]);
      }
      return data;
    }

    function updateSound() {
      var opt = commonOption();
      opt.grid = { left: 50, right: 20, top: 30, bottom: 40 };
      opt.xAxis.type = 'value';
      opt.xAxis.min = 0;
      opt.xAxis.max = 0.01;
      opt.xAxis.name = '时间 t (s)';
      opt.xAxis.nameTextStyle = { color: muted, fontFamily: 'Outfit', fontSize: 11 };
      opt.yAxis.name = '振幅';
      opt.yAxis.nameTextStyle = { color: muted, fontFamily: 'Outfit', fontSize: 11 };
      opt.series = [{
        type: 'line',
        data: genSoundData(),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: accent, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6,182,212,0.25)' },
              { offset: 1, color: 'rgba(6,182,212,0.02)' }
            ]
          }
        }
      }];
      charts.sound.setOption(opt, true);
    }

    function updateBeat() {
      var opt = commonOption();
      opt.grid = { left: 50, right: 20, top: 25, bottom: 35 };
      opt.xAxis.type = 'value';
      opt.xAxis.min = 0;
      opt.xAxis.max = 1;
      opt.xAxis.name = '时间 t (s)';
      opt.xAxis.nameTextStyle = { color: muted, fontFamily: 'Outfit', fontSize: 11 };
      opt.yAxis.name = '振幅';
      opt.yAxis.nameTextStyle = { color: muted, fontFamily: 'Outfit', fontSize: 11 };
      opt.series = [{
        type: 'line',
        data: genBeatData(),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: accent2, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245,158,11,0.2)' },
              { offset: 1, color: 'rgba(245,158,11,0.02)' }
            ]
          }
        }
      }];
      charts.beat.setOption(opt, true);
    }

    bindSlider('s-a1', 'val-s-a1', function(v) {
      a1 = parseFloat(v); return a1.toFixed(1);
    }, updateSound);
    bindSlider('s-a2', 'val-s-a2', function(v) {
      a2 = parseFloat(v); return a2.toFixed(1);
    }, updateSound);
    bindSlider('s-a3', 'val-s-a3', function(v) {
      a3 = parseFloat(v); return a3.toFixed(1);
    }, updateSound);

    updateSound();
    updateBeat();
  }

  // ============================================================
  // 案例5：游戏与3D动画旋转
  // ============================================================
  function initRotateCase() {
    var canvas = document.getElementById('rotateCanvas');
    if (!canvas) return;
    var c = setupCanvas(canvas);
    var ctx = c.ctx, W = c.width, H = c.height;

    var angle = 30;

    function drawScene() {
      c = setupCanvas(canvas);
      ctx = c.ctx; W = c.width; H = c.height;
      ctx.clearRect(0, 0, W, H);

      var cx = W / 2, cy = H / 2;
      var axisLen = 100;

      // 坐标轴
      ctx.strokeStyle = rule;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - axisLen - 10, cy);
      ctx.lineTo(cx + axisLen + 10, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + axisLen + 10);
      ctx.lineTo(cx, cy - axisLen - 10);
      ctx.stroke();

      // 轴标签
      ctx.fillStyle = muted;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'left';
      ctx.fillText('x', cx + axisLen + 15, cy + 4);
      ctx.textAlign = 'center';
      ctx.fillText('y', cx - 5, cy - axisLen - 15);

      // 原点
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // 原始点 (0, 1) -> 在canvas坐标系中是 (cx, cy - axisLen * 0.6)
      var ox = cx, oy = cy - axisLen * 0.6;
      ctx.fillStyle = muted;
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.textAlign = 'right';
      ctx.fillText('(0, 1)', ox - 10, oy + 4);

      // 旋转后新位置
      var rad = angle * Math.PI / 180;
      var x0 = 0, y0 = 1;
      var nx = x0 * Math.cos(rad) - y0 * Math.sin(rad);
      var ny = x0 * Math.sin(rad) + y0 * Math.cos(rad);
      var npx = cx + nx * axisLen * 0.6;
      var npy = cy - ny * axisLen * 0.6;

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(npx, npy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.textAlign = 'left';
      ctx.fillText('(' + nx.toFixed(3) + ', ' + ny.toFixed(3) + ')', npx + 10, npy + 4);

      // 虚线连接原位置和新位置
      ctx.strokeStyle = accent3;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(npx, npy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 旋转弧线
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, axisLen * 0.6, -Math.PI / 2, -Math.PI / 2 + rad);
      ctx.stroke();

      // 角度标注
      ctx.fillStyle = accent2;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'center';
      var arcLabelR = axisLen * 0.75;
      var arcLabelAngle = -Math.PI / 2 + rad / 2;
      ctx.fillText(angle + '°', cx + arcLabelR * Math.cos(arcLabelAngle), cy + arcLabelR * Math.sin(arcLabelAngle));

      // 向量箭头（从原点指向新位置）
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(npx, npy);
      ctx.stroke();
    }

    function updateResult() {
      var rad = angle * Math.PI / 180;
      var cos = Math.cos(rad), sin = Math.sin(rad);
      var el = document.getElementById('r-result');
      if (el) {
        el.innerHTML =
          '<div class="res-label">旋转矩阵</div>' +
          '<div>[ <span class="res-value">' + cos.toFixed(3) + '</span>  <span class="res-value">' + (-sin).toFixed(3) + '</span> ]</div>' +
          '<div>[ <span class="res-value">' + sin.toFixed(3) + '</span>  <span class="res-value">' + cos.toFixed(3) + '</span> ]</div>' +
          '<div style="margin-top:6px;color:' + muted + ';font-size:12px;">' +
          "x' = x·cosθ - y·sinθ = 0×" + cos.toFixed(3) + " - 1×" + sin.toFixed(3) + " = " + (-sin).toFixed(3) +
          '</div>' +
          '<div style="color:' + muted + ';font-size:12px;">' +
          "y' = x·sinθ + y·cosθ = 0×" + sin.toFixed(3) + " + 1×" + cos.toFixed(3) + " = " + cos.toFixed(3) +
          '</div>';
      }
    }

    bindSlider('r-angle', 'val-r-angle', function(v) {
      angle = parseFloat(v); return angle + '°';
    }, function() { drawScene(); updateResult(); });

    drawScene();
    updateResult();
  }

  // ============================================================
  // 案例6：CT扫描与医学影像
  // ============================================================
  function initCTCase() {
    var canvas = document.getElementById('ctCanvas');
    if (!canvas) return;
    var c = setupCanvas(canvas);
    var ctx = c.ctx, W = c.width, H = c.height;

    var scanAngle = 45;

    function drawScene() {
      c = setupCanvas(canvas);
      ctx = c.ctx; W = c.width; H = c.height;
      ctx.clearRect(0, 0, W, H);

      var cx = W / 2, cy = H / 2;
      var radius = Math.min(W, H) * 0.35;

      // 身体截面（圆）
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 内部填充
      ctx.fillStyle = 'rgba(6,182,212,0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 中心点
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // 扫描线（多条，主扫描线高亮）
      var rad = scanAngle * Math.PI / 180;
      var lineCount = 5;
      for (var i = -2; i <= 2; i++) {
        var offset = i * 20;
        var r = offset;
        var lx1 = cx - radius * 1.5 * Math.cos(rad) + r * Math.sin(rad);
        var ly1 = cy - radius * 1.5 * Math.sin(rad) - r * Math.cos(rad);
        var lx2 = cx + radius * 1.5 * Math.cos(rad) + r * Math.sin(rad);
        var ly2 = cy + radius * 1.5 * Math.sin(rad) - r * Math.cos(rad);

        if (i === 0) {
          ctx.strokeStyle = accent2;
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
        ctx.stroke();
      }

      // 标注扫描角度
      ctx.strokeStyle = accent3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 20, 0, rad);
      ctx.stroke();

      ctx.fillStyle = accent3;
      ctx.font = '13px JetBrainsMono';
      ctx.textAlign = 'center';
      var labelR = radius + 35;
      ctx.fillText('θ = ' + scanAngle + '°', cx + labelR * Math.cos(rad / 2), cy + labelR * Math.sin(rad / 2));

      // 公式标注
      ctx.fillStyle = ink;
      ctx.font = '14px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('x·cos θ + y·sin θ = r', cx, H - 20);

      // 坐标轴小标记
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke();
    }

    bindSlider('ct-angle', 'val-ct-angle', function(v) {
      scanAngle = parseFloat(v); return scanAngle + '°';
    }, drawScene);

    drawScene();
  }

  // ============================================================
  // 案例7：楼梯坡度
  // ============================================================
  function initStairCase() {
    var canvas = document.getElementById('stairCanvas');
    if (!canvas) return;
    var c = setupCanvas(canvas);
    var ctx = c.ctx, W = c.width, H = c.height;

    var h = 15, d = 26;

    function drawScene() {
      c = setupCanvas(canvas);
      ctx = c.ctx; W = c.width; H = c.height;
      ctx.clearRect(0, 0, W, H);

      var groundY = H - 50;
      var startX = 60;
      var maxD = 30, maxH = 20;
      var scaleX = (W - 120) / maxD;
      var scaleY = (groundY - 60) / maxH;

      var pxD = d * scaleX;
      var pxH = h * scaleY;

      // 地面线
      ctx.strokeStyle = rule;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, groundY);
      ctx.lineTo(W - 20, groundY);
      ctx.stroke();

      // 直角三角形（楼梯截面）
      ctx.fillStyle = 'rgba(6,182,212,0.15)';
      ctx.beginPath();
      ctx.moveTo(startX, groundY);
      ctx.lineTo(startX + pxD, groundY);
      ctx.lineTo(startX + pxD, groundY - pxH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(startX, groundY);
      ctx.lineTo(startX + pxD, groundY);
      ctx.lineTo(startX + pxD, groundY - pxH);
      ctx.closePath();
      ctx.stroke();

      // 台阶线
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      var steps = 3;
      for (var i = 1; i < steps; i++) {
        var sx = startX + pxD * i / steps;
        var sy = groundY - pxH * i / steps;
        ctx.beginPath();
        ctx.moveTo(sx, groundY);
        ctx.lineTo(sx, sy);
        ctx.lineTo(startX + pxD, sy);
        ctx.stroke();
      }

      // 角度弧
      var angle = Math.atan(h / d);
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startX, groundY, 35, -angle, 0);
      ctx.stroke();

      ctx.fillStyle = accent2;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'left';
      ctx.fillText('θ = ' + (angle * 180 / Math.PI).toFixed(1) + '°', startX + 10, groundY - 15);

      // 标注高和深
      ctx.fillStyle = ink;
      ctx.font = '12px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('d = ' + d + ' cm', startX + pxD / 2, groundY + 20);
      ctx.textAlign = 'left';
      ctx.fillText('h = ' + h + ' cm', startX + pxD + 10, groundY - pxH / 2);
    }

    function updateResult() {
      var angleDeg = Math.atan(h / d) * 180 / Math.PI;
      var ratio = (d / h).toFixed(2);
      var rating;
      if (angleDeg < 25) rating = '偏缓（占空间）';
      else if (angleDeg <= 35) rating = '良好';
      else if (angleDeg <= 40) rating = '稍陡';
      else rating = '过陡（不安全）';

      var el = document.getElementById('st-result');
      if (el) {
        el.innerHTML =
          '<div class="res-label">计算结果</div>' +
          '<div>坡度角 θ = <span class="res-value">' + angleDeg.toFixed(1) + '°</span></div>' +
          '<div>坡度比 = <span class="res-value">1 : ' + ratio + '</span></div>' +
          '<div>舒适性评级 = <span class="res-value">' + rating + '</span></div>';
      }
    }

    bindSlider('st-h', 'val-st-h', function(v) {
      h = parseFloat(v); return h.toFixed(1);
    }, function() { drawScene(); updateResult(); });

    bindSlider('st-d', 'val-st-d', function(v) {
      d = parseFloat(v); return d.toFixed(1);
    }, function() { drawScene(); updateResult(); });

    drawScene();
    updateResult();
  }

  // ===== 窗口 resize =====
  window.addEventListener('resize', function() {
    Object.keys(charts).forEach(function(key) {
      if (charts[key] && charts[key].resize) {
        charts[key].resize();
      }
    });
  });

  // ===== 初始化所有案例 =====
  initBuildingCase();
  initNavCase();
  initSolarCase();
  initSoundCase();
  initRotateCase();
  initCTCase();
  initStairCase();

})();
