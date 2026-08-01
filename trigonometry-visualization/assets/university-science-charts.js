(function() {
  var charts = {};
  var majors = ['数学','物理','化学','生物','地理','统计学'];
  var destColors = {
    '企业就业': '#3b82f6',
    '国内升学': '#E8A93E',
    '出国深造': '#10b981',
    '机关事业单位': '#ef4444',
    '灵活就业/其他': '#9B8B7A',
    '未落实': 'rgba(180,160,140,0.25)'
  };
  var currentTier = 'all';
  var currentMajor = 'all';
  var currentEdu = '本科';

  // ===== 完整数据集 =====
  var data = {
    '北京大学':     { tier:'985', 数学:{本科:{就业:88,升学:72},硕士:{就业:96,深造:22}}, 物理:{本科:{就业:85,升学:78},硕士:{就业:95,深造:28}}, 化学:{本科:{就业:86,升学:75},硕士:{就业:95,深造:25}}, 生物:{本科:{就业:84,升学:80},硕士:{就业:94,深造:30}}, 地理:{本科:{就业:90,升学:65},硕士:{就业:96,深造:18}}, 统计学:{本科:{就业:92,升学:60},硕士:{就业:97,深造:15}} },
    '清华大学':     { tier:'985', 数学:{本科:{就业:89,升学:70},硕士:{就业:97,深造:20}}, 物理:{本科:{就业:86,升学:76},硕士:{就业:96,深造:26}}, 化学:{本科:{就业:87,升学:73},硕士:{就业:96,深造:23}}, 生物:{本科:{就业:85,升学:78},硕士:{就业:95,深造:28}}, 地理:{本科:{就业:91,升学:63},硕士:{就业:97,深造:16}}, 统计学:{本科:{就业:93,升学:58},硕士:{就业:98,深造:14}} },
    '复旦大学':     { tier:'985', 数学:{本科:{就业:87,升学:68},硕士:{就业:95,深造:20}}, 物理:{本科:{就业:84,升学:72},硕士:{就业:94,深造:25}}, 化学:{本科:{就业:85,升学:70},硕士:{就业:95,深造:22}}, 生物:{本科:{就业:83,升学:75},硕士:{就业:94,深造:28}}, 地理:{本科:{就业:89,升学:62},硕士:{就业:96,深造:17}}, 统计学:{本科:{就业:91,升学:55},硕士:{就业:97,深造:13}} },
    '浙江大学':     { tier:'985', 数学:{本科:{就业:88,升学:66},硕士:{就业:96,深造:19}}, 物理:{本科:{就业:85,升学:70},硕士:{就业:95,深造:24}}, 化学:{本科:{就业:86,升学:68},硕士:{就业:95,深造:21}}, 生物:{本科:{就业:84,升学:73},硕士:{就业:94,深造:27}}, 地理:{本科:{就业:90,升学:60},硕士:{就业:96,深造:16}}, 统计学:{本科:{就业:92,升学:53},硕士:{就业:97,深造:12}} },
    '中国科学技术大学':{ tier:'985', 数学:{本科:{就业:86,升学:75},硕士:{就业:95,深造:24}}, 物理:{本科:{就业:84,升学:80},硕士:{就业:95,深造:30}}, 化学:{本科:{就业:85,升学:77},硕士:{就业:95,深造:27}}, 生物:{本科:{就业:83,升学:79},硕士:{就业:94,深造:32}}, 地理:{本科:{就业:88,升学:68},硕士:{就业:95,深造:20}}, 统计学:{本科:{就业:90,升学:62},硕士:{就业:96,深造:16}} },
    '南京大学':     { tier:'985', 数学:{本科:{就业:87,升学:67},硕士:{就业:95,深造:20}}, 物理:{本科:{就业:84,升学:71},硕士:{就业:94,深造:25}}, 化学:{本科:{就业:85,升学:69},硕士:{就业:95,深造:22}}, 生物:{本科:{就业:83,升学:74},硕士:{就业:94,深造:28}}, 地理:{本科:{就业:89,升学:61},硕士:{就业:96,深造:17}}, 统计学:{本科:{就业:91,升学:54},硕士:{就业:97,深造:13}} },
    '郑州大学':     { tier:'211', 数学:{本科:{就业:90,升学:48},硕士:{就业:95,深造:12}}, 物理:{本科:{就业:87,升学:52},硕士:{就业:94,深造:15}}, 化学:{本科:{就业:88,升学:50},硕士:{就业:94,深造:14}}, 生物:{本科:{就业:86,升学:55},硕士:{就业:93,深造:18}}, 地理:{本科:{就业:92,升学:42},硕士:{就业:95,深造:10}}, 统计学:{本科:{就业:93,升学:40},硕士:{就业:96,深造:9}} },
    '苏州大学':     { tier:'211', 数学:{本科:{就业:89,升学:50},硕士:{就业:95,深造:13}}, 物理:{本科:{就业:86,升学:54},硕士:{就业:94,深造:16}}, 化学:{本科:{就业:87,升学:52},硕士:{就业:94,深造:15}}, 生物:{本科:{就业:85,升学:57},硕士:{就业:93,深造:19}}, 地理:{本科:{就业:91,升学:44},硕士:{就业:95,深造:11}}, 统计学:{本科:{就业:92,升学:42},硕士:{就业:96,深造:10}} },
    '云南大学':     { tier:'211', 数学:{本科:{就业:88,升学:45},硕士:{就业:94,深造:11}}, 物理:{本科:{就业:85,升学:48},硕士:{就业:93,深造:14}}, 化学:{本科:{就业:86,升学:46},硕士:{就业:93,深造:13}}, 生物:{本科:{就业:84,升学:52},硕士:{就业:92,深造:17}}, 地理:{本科:{就业:90,升学:40},硕士:{就业:94,深造:9}}, 统计学:{本科:{就业:91,升学:38},硕士:{就业:95,深造:8}} },
    '西北大学':     { tier:'211', 数学:{本科:{就业:89,升学:47},硕士:{就业:95,深造:12}}, 物理:{本科:{就业:86,升学:51},硕士:{就业:94,深造:15}}, 化学:{本科:{就业:87,升学:49},硕士:{就业:94,深造:14}}, 生物:{本科:{就业:85,升学:54},硕士:{就业:93,深造:18}}, 地理:{本科:{就业:91,升学:43},硕士:{就业:95,深造:10}}, 统计学:{本科:{就业:92,升学:41},硕士:{就业:96,深造:9}} },
    '湖南师范大学': { tier:'211', 数学:{本科:{就业:91,升学:46},硕士:{就业:95,深造:11}}, 物理:{本科:{就业:88,升学:50},硕士:{就业:94,深造:14}}, 化学:{本科:{就业:89,升学:48},硕士:{就业:94,深造:13}}, 生物:{本科:{就业:87,升学:53},硕士:{就业:93,深造:17}}, 地理:{本科:{就业:93,升学:41},硕士:{就业:96,深造:9}}, 统计学:{本科:{就业:94,升学:39},硕士:{就业:96,深造:8}} },
    '南京师范大学': { tier:'211', 数学:{本科:{就业:90,升学:49},硕士:{就业:95,深造:12}}, 物理:{本科:{就业:87,升学:53},硕士:{就业:94,深造:15}}, 化学:{本科:{就业:88,升学:51},硕士:{就业:94,深造:14}}, 生物:{本科:{就业:86,升学:56},硕士:{就业:93,深造:18}}, 地理:{本科:{就业:92,升学:43},硕士:{就业:95,深造:10}}, 统计学:{本科:{就业:93,升学:41},硕士:{就业:96,深造:9}} }
  };

  function getFilteredUnivs() {
    return Object.keys(data).filter(function(u) {
      return currentTier === 'all' || data[u].tier === currentTier;
    });
  }

  function avgRate(univ, edu) {
    var d = data[univ];
    var list = currentMajor === 'all' ? majors : [currentMajor];
    var sum = 0;
    list.forEach(function(m) {
      sum += d[m][edu].就业;
    });
    return (sum / list.length).toFixed(1);
  }

  // 生成毕业去向分布数据
  function getDestinations(univ, major, edu) {
    var d = data[univ][major][edu];
    var tier = data[univ].tier;
    var rate = d.就业;
    var up = edu === '本科' ? d.升学 : d.深造;
    var direct = Math.max(0, rate - up);
    // 升学拆分
    var domesticRatio = tier === '985' ? 0.55 : 0.65;
    var domestic = up * domesticRatio;
    var abroad = up * (1 - domesticRatio);
    // 直接就业拆分
    var entRatio = tier === '985' ? 0.60 : 0.68;
    var govRatio = tier === '985' ? 0.30 : 0.22;
    var enterprise = direct * entRatio;
    var gov = direct * govRatio;
    var flex = direct * (1 - entRatio - govRatio);
    var unset = Math.max(0, 100 - rate);
    return {
      '企业就业': enterprise,
      '机关事业单位': gov,
      '灵活就业/其他': flex,
      '国内升学': edu === '本科' ? domestic : domestic,
      '出国深造': abroad,
      '未落实': unset
    };
  }

  function commonOption() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: { trigger: 'axis', backgroundColor: '#FFF5EE', borderColor: 'rgba(180,160,140,0.25)', textStyle: { color: '#4A3B2E' } },
      grid: { left: 55, right: 30, top: 40, bottom: 45 },
      xAxis: { type: 'category', axisLine: { lineStyle: { color: 'rgba(180,160,140,0.25)' } }, axisLabel: { color: '#9B8B7A', fontFamily: 'JetBrainsMono', fontSize: 11 }, splitLine: { show: false } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: 'rgba(180,160,140,0.25)' } }, axisLabel: { color: '#9B8B7A', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: 'rgba(180,160,140,0.25)40' } } }
    };
  }

  // ===== 1. 各院校理科专业平均就业率对比 =====
  function initUnivCompare() {
    var dom = document.getElementById('chartUnivCompare');
    if (!dom) return;
    if (charts.univ) charts.univ.dispose();
    charts.univ = echarts.init(dom, null, { renderer: 'svg' });

    var univs = getFilteredUnivs();
    var vals = univs.map(function(u) { return parseFloat(avgRate(u, currentEdu)); });
    var colors = univs.map(function(u) { return data[u].tier === '985' ? '#3b82f6' : '#10b981'; });

    var opt = commonOption();
    opt.title = { text: (currentTier === 'all' ? '全部' : currentTier === '985' ? '985' : '211/双一流') + '院校 · ' + (currentMajor === 'all' ? '六大理科专业平均' : currentMajor) + ' · ' + currentEdu + '就业率', left: 'center', top: 5, textStyle: { color: '#3b82f6', fontSize: 13 } };
    opt.xAxis.data = univs;
    opt.xAxis.axisLabel.rotate = univs.length > 8 ? 30 : 0;
    opt.yAxis.min = 80; opt.yAxis.max = 100; opt.yAxis.name = '就业率(%)';
    opt.series = [{
      type: 'bar', data: vals.map(function(v, i) { return { value: v, itemStyle: { color: colors[i] } }; }),
      barMaxWidth: 30, label: { show: true, position: 'top', color: '#4A3B2E', fontSize: 10, fontFamily: 'JetBrainsMono' }
    }];
    charts.univ.setOption(opt);
  }

  // ===== 2. 本科就业率 vs 升学率 =====
  function initBachelorChart() {
    var dom = document.getElementById('chartBachelor');
    if (!dom) return;
    if (charts.bachelor) charts.bachelor.dispose();
    charts.bachelor = echarts.init(dom, null, { renderer: 'svg' });

    var univs = getFilteredUnivs();
    var emp = [], up = [];
    var majorsList = currentMajor === 'all' ? majors : [currentMajor];
    univs.forEach(function(u) {
      var s1 = 0, s2 = 0;
      majorsList.forEach(function(m) {
        s1 += data[u][m].本科.就业;
        s2 += data[u][m].本科.升学;
      });
      emp.push((s1 / majorsList.length).toFixed(1));
      up.push((s2 / majorsList.length).toFixed(1));
    });

    var opt = commonOption();
    opt.title = { text: '本科：就业率 vs 升学率', left: 'center', top: 5, textStyle: { color: '#3b82f6', fontSize: 12 } };
    opt.xAxis.data = univs;
    opt.xAxis.axisLabel.fontSize = 10;
    opt.yAxis.min = 0; opt.yAxis.max = 100; opt.yAxis.name = '百分比(%)';
    opt.legend = { data: ['就业率','升学率'], top: 22, textStyle: { color: '#9B8B7A', fontSize: 10 } };
    opt.series = [
      { type: 'bar', name: '就业率', data: emp, itemStyle: { color: '#3b82f6' }, barMaxWidth: 14, barGap: '20%' },
      { type: 'bar', name: '升学率', data: up, itemStyle: { color: '#E8A93E' }, barMaxWidth: 14 }
    ];
    charts.bachelor.setOption(opt);
  }

  // ===== 3. 硕士就业率 vs 继续深造率 =====
  function initMasterChart() {
    var dom = document.getElementById('chartMaster');
    if (!dom) return;
    if (charts.master) charts.master.dispose();
    charts.master = echarts.init(dom, null, { renderer: 'svg' });

    var univs = getFilteredUnivs();
    var emp = [], up = [];
    var majorsList = currentMajor === 'all' ? majors : [currentMajor];
    univs.forEach(function(u) {
      var s1 = 0, s2 = 0;
      majorsList.forEach(function(m) {
        s1 += data[u][m].硕士.就业;
        s2 += data[u][m].硕士.深造;
      });
      emp.push((s1 / majorsList.length).toFixed(1));
      up.push((s2 / majorsList.length).toFixed(1));
    });

    var opt = commonOption();
    opt.title = { text: '硕士：就业率 vs 继续深造率', left: 'center', top: 5, textStyle: { color: '#3b82f6', fontSize: 12 } };
    opt.xAxis.data = univs;
    opt.xAxis.axisLabel.fontSize = 10;
    opt.yAxis.min = 0; opt.yAxis.max = 100; opt.yAxis.name = '百分比(%)';
    opt.legend = { data: ['就业率','继续深造率'], top: 22, textStyle: { color: '#9B8B7A', fontSize: 10 } };
    opt.series = [
      { type: 'bar', name: '就业率', data: emp, itemStyle: { color: '#3b82f6' }, barMaxWidth: 14, barGap: '20%' },
      { type: 'bar', name: '继续深造率', data: up, itemStyle: { color: '#ef4444' }, barMaxWidth: 14 }
    ];
    charts.master.setOption(opt);
  }

  // ===== 4. 毕业去向分布（堆叠柱状图） =====
  function initDestChart() {
    var dom = document.getElementById('chartDest');
    if (!dom) return;
    if (charts.dest) charts.dest.dispose();
    charts.dest = echarts.init(dom, null, { renderer: 'svg' });

    var univs = getFilteredUnivs();
    var majorsList = currentMajor === 'all' ? majors : [currentMajor];
    var destKeys = ['企业就业','机关事业单位','灵活就业/其他','国内升学','出国深造','未落实'];

    var series = destKeys.map(function(key) {
      var d = univs.map(function(u) {
        var sum = 0;
        majorsList.forEach(function(m) {
          sum += getDestinations(u, m, currentEdu)[key];
        });
        return (sum / majorsList.length).toFixed(1);
      });
      return {
        type: 'bar', name: key, stack: 'total', data: d,
        itemStyle: { color: destColors[key] }, barMaxWidth: 28
      };
    });

    var opt = commonOption();
    opt.title = { text: (currentMajor === 'all' ? '六大理科专业平均' : currentMajor) + ' · ' + currentEdu + '毕业去向分布', left: 'center', top: 5, textStyle: { color: '#3b82f6', fontSize: 13 } };
    opt.xAxis.data = univs;
    opt.xAxis.axisLabel.rotate = univs.length > 8 ? 30 : 0;
    opt.yAxis.min = 0; opt.yAxis.max = 100; opt.yAxis.name = '占比(%)';
    opt.legend = { data: destKeys, top: 22, textStyle: { color: '#9B8B7A', fontSize: 10 }, itemWidth: 14, itemHeight: 8 };
    opt.tooltip.formatter = function(params) {
      var res = params[0].axisValue + '<br/>';
      params.forEach(function(p) {
        if (p.value > 0) res += p.marker + ' ' + p.seriesName + ': ' + p.value + '%<br/>';
      });
      return res;
    };
    opt.series = series;
    charts.dest.setOption(opt);
  }

  // ===== 5. 六大理科专业就业表现对比 =====
  function initMajorCompare() {
    var dom = document.getElementById('chartMajorCompare');
    if (!dom) return;
    if (charts.majorC) charts.majorC.dispose();
    charts.majorC = echarts.init(dom, null, { renderer: 'svg' });

    var univs = getFilteredUnivs();
    // 计算每个专业在所有筛选院校中的平均本科就业率和升学率、硕士就业率和深造率
    var bEmp = [], bUp = [], mEmp = [], mUp = [];
    majors.forEach(function(major) {
      var sBE = 0, sBU = 0, sME = 0, sMU = 0;
      univs.forEach(function(u) {
        sBE += data[u][major].本科.就业;
        sBU += data[u][major].本科.升学;
        sME += data[u][major].硕士.就业;
        sMU += data[u][major].硕士.深造;
      });
      var n = univs.length || 1;
      bEmp.push((sBE / n).toFixed(1));
      bUp.push((sBU / n).toFixed(1));
      mEmp.push((sME / n).toFixed(1));
      mUp.push((sMU / n).toFixed(1));
    });

    var opt = commonOption();
    opt.title = { text: (currentTier === 'all' ? '全部' : currentTier === '985' ? '985' : '211/双一流') + '院校 · 六大理科专业平均表现', left: 'center', top: 5, textStyle: { color: '#3b82f6', fontSize: 13 } };
    opt.xAxis.data = majors;
    opt.yAxis.min = 0; opt.yAxis.max = 100; opt.yAxis.name = '百分比(%)';
    opt.legend = { data: ['本科就业率','本科升学率','硕士就业率','硕士深造率'], top: 22, textStyle: { color: '#9B8B7A', fontSize: 10 } };
    opt.series = [
      { type: 'bar', name: '本科就业率', data: bEmp, itemStyle: { color: '#3b82f6' }, barMaxWidth: 12, barGap: '15%' },
      { type: 'bar', name: '本科升学率', data: bUp, itemStyle: { color: '#E8A93E' }, barMaxWidth: 12 },
      { type: 'bar', name: '硕士就业率', data: mEmp, itemStyle: { color: '#10b981' }, barMaxWidth: 12 },
      { type: 'bar', name: '硕士深造率', data: mUp, itemStyle: { color: '#ef4444' }, barMaxWidth: 12 }
    ];
    charts.majorC.setOption(opt);
  }

  // ===== 绑定筛选器 =====
  function bindSelectors() {
    document.querySelectorAll('.univ-tabs button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.univ-tabs button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentTier = btn.dataset.tier;
        refreshAll();
      });
    });
    document.querySelectorAll('.major-tabs button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.major-tabs button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentMajor = btn.dataset.major;
        refreshAll();
      });
    });
    document.querySelectorAll('.edu-tabs button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.edu-tabs button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentEdu = btn.dataset.edu;
        refreshAll();
      });
    });
  }

  function refreshAll() {
    initUnivCompare();
    initBachelorChart();
    initMasterChart();
    initDestChart();
    initMajorCompare();
  }

  function initAll() {
    bindSelectors();
    refreshAll();
  }

  window.addEventListener('resize', function() {
    Object.keys(charts).forEach(function(k) { if (charts[k]) charts[k].resize(); });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
