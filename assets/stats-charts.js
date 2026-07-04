(function() {
  var charts = {};
  var years = [2010,2012,2014,2016,2018,2020,2022,2024,2026];
  var eduLevels = ['本科','硕士','博士'];
  var currentEdu = '本科';
  var currentMetric = 'employment'; // 'employment' or 'salary'
  var currentMajorFilter = 'all';
  var sampleN = 3, reps = 500;

  // ====== 完整数据集：18个专业 × 3个学历 × 9个年份 ======
  // 就业率 (%)
  var employmentData = {
    '计算机类':   { color:'#22d3ee', 本科:[92.0,93.0,94.0,93.0,91.0,88.0,85.0,82.4,81.0], 硕士:[94.0,94.5,95.0,94.5,93.0,91.0,89.0,86.5,85.0], 博士:[93.0,93.5,94.0,93.5,92.0,90.0,88.0,85.0,84.0] },
    '软件工程':   { color:'#06b6d4', 本科:[90.0,91.0,92.0,93.0,92.0,90.0,87.0,83.0,82.0], 硕士:[92.0,93.0,94.0,94.5,93.5,92.0,90.0,87.0,86.0], 博士:[91.0,92.0,93.0,93.5,92.5,91.0,89.0,86.0,85.0] },
    '电子信息类': { color:'#8b5cf6', 本科:[89.0,90.0,91.0,92.0,91.0,89.0,88.0,87.0,86.0], 硕士:[91.0,92.0,93.0,94.0,93.0,91.5,90.5,90.0,89.0], 博士:[90.0,91.0,92.0,93.0,92.0,90.5,89.5,89.0,88.0] },
    '自动化类':   { color:'#f59e0b', 本科:[88.0,89.0,90.0,91.0,90.0,89.0,89.0,89.0,88.0], 硕士:[90.0,91.0,92.0,93.0,92.0,91.0,91.0,91.5,90.5], 博士:[89.0,90.0,91.0,92.0,91.0,90.0,90.0,90.5,89.5] },
    '机械类':     { color:'#d97706', 本科:[87.0,88.0,89.0,90.0,89.0,88.0,88.0,88.0,87.0], 硕士:[89.0,90.0,91.0,92.0,91.0,90.0,90.0,90.5,89.5], 博士:[88.0,89.0,90.0,91.0,90.0,89.0,89.0,89.5,88.5] },
    '新能源类':   { color:'#ec4899', 本科:[85.0,86.0,88.0,90.0,92.0,94.0,96.0,97.2,97.5], 硕士:[87.0,88.5,90.5,92.5,94.0,95.5,97.0,98.0,98.2], 博士:[86.0,87.5,89.5,91.5,93.0,94.5,96.0,97.0,97.5] },
    '土木工程':   { color:'#64748b', 本科:[91.0,92.0,93.0,92.0,89.0,86.0,85.0,85.0,84.0], 硕士:[93.0,93.5,94.5,94.0,91.5,89.0,88.0,88.0,87.0], 博士:[92.0,92.5,93.5,93.0,90.5,88.0,87.0,87.0,86.0] },
    '医学类':     { color:'#ef4444', 本科:[88.0,89.0,90.0,91.0,92.0,93.0,94.0,94.7,95.0], 硕士:[90.0,91.0,92.0,93.0,94.0,95.0,96.0,96.5,97.0], 博士:[91.0,92.0,93.0,94.0,95.0,96.0,97.0,97.5,98.0] },
    '生物医药':   { color:'#fb923c', 本科:[86.0,87.0,89.0,91.0,93.0,95.0,96.0,97.0,97.5], 硕士:[88.0,89.0,91.0,93.0,95.0,96.5,97.5,98.0,98.2], 博士:[87.0,88.5,90.5,92.5,94.5,96.0,97.0,97.5,98.0] },
    '经济学类':   { color:'#a78bfa', 本科:[91.0,92.0,93.0,91.0,88.0,85.0,84.0,83.3,82.0], 硕士:[93.0,93.5,94.5,93.0,90.5,88.0,87.0,86.5,85.5], 博士:[92.0,92.5,93.5,92.0,89.5,87.0,86.0,85.5,84.5] },
    '财经类':     { color:'#c084fc', 本科:[90.0,91.5,93.0,92.0,89.5,86.5,85.0,84.0,83.0], 硕士:[92.0,93.5,95.0,94.0,91.5,89.0,88.0,87.0,86.0], 博士:[91.0,92.5,94.0,93.0,90.5,88.0,87.0,86.0,85.0] },
    '教育学类':   { color:'#10b981', 本科:[89.0,90.0,91.0,92.0,91.0,88.0,86.0,85.0,84.0], 硕士:[91.0,92.0,93.0,94.0,93.0,90.5,89.0,88.0,87.0], 博士:[90.0,91.0,92.0,93.0,92.0,89.5,88.0,87.0,86.0] },
    '统计学':     { color:'#2dd4bf', 本科:[88.0,89.5,91.0,92.0,91.5,90.0,91.0,91.5,91.5], 硕士:[90.0,91.5,93.0,94.0,93.5,92.0,93.0,93.5,93.5], 博士:[89.0,90.5,92.0,93.0,92.5,91.0,92.0,92.5,92.5] },
    '材料类':     { color:'#78716c', 本科:[87.0,88.0,89.0,90.0,89.0,88.0,88.0,87.0,86.0], 硕士:[89.0,90.0,91.0,92.0,91.0,90.0,90.0,89.0,88.5], 博士:[88.0,89.0,90.0,91.0,90.0,89.0,89.0,88.0,87.5] },
    '化工类':     { color:'#84cc16', 本科:[87.0,88.0,89.0,90.0,89.0,88.0,87.0,86.0,85.0], 硕士:[89.0,90.0,91.0,92.0,91.0,90.0,89.0,88.0,87.0], 博士:[88.0,89.0,90.0,91.0,90.0,89.0,88.0,87.0,86.0] },
    '环境科学':   { color:'#4ade80', 本科:[84.0,85.0,87.0,89.0,91.0,93.0,94.0,95.0,96.0], 硕士:[86.0,87.5,89.5,91.5,93.0,95.0,96.0,96.5,97.0], 博士:[85.0,86.5,88.5,90.5,92.5,94.0,95.0,96.0,96.5] },
    '心理学':     { color:'#f472b6', 本科:[85.0,86.0,87.0,88.0,87.0,86.0,85.0,84.0,83.0], 硕士:[87.0,88.0,89.0,90.0,89.5,88.5,87.5,86.5,85.5], 博士:[86.0,87.0,88.0,89.0,88.5,87.5,86.5,85.5,84.5] },
    '人文社科':   { color:'#94a3b8', 本科:[86.0,87.0,88.0,88.0,86.0,83.0,81.0,79.0,78.0], 硕士:[88.0,89.0,90.0,90.0,88.0,85.5,83.5,81.5,80.5], 博士:[87.0,88.0,89.0,89.0,87.0,84.5,82.5,80.5,79.5] }
  };

  // 薪酬数据（元/月）—— 基于麦可思2024报告及行业调研推算
  var salaryData = {
    '计算机类':   { color:'#22d3ee', 本科:[2800,3300,3900,4600,5400,5800,6300,6800,7350], 硕士:[4200,5000,5900,7000,8200,9200,10100,11000,11900], 博士:[7000,8300,9800,11600,13600,15300,16800,18300,19800] },
    '软件工程':   { color:'#06b6d4', 本科:[2900,3500,4100,4900,5700,6200,6700,7200,7800], 硕士:[4400,5200,6200,7400,8600,9700,10600,11600,12600], 博士:[7300,8700,10300,12200,14300,16100,17700,19300,20900] },
    '电子信息类': { color:'#8b5cf6', 本科:[3000,3600,4300,5100,6000,6500,7000,7500,8100], 硕士:[4600,5500,6500,7700,9000,10100,11100,12100,13100], 博士:[7600,9100,10800,12800,15000,16800,18500,20200,21800] },
    '自动化类':   { color:'#f59e0b', 本科:[2600,3100,3700,4400,5100,5600,6000,6500,7000], 硕士:[4000,4700,5600,6600,7700,8600,9400,10300,11200], 博士:[6600,7800,9300,11000,12800,14400,15800,17300,18700] },
    '机械类':     { color:'#d97706', 本科:[2400,2900,3400,4000,4700,5100,5500,6000,6500], 硕士:[3700,4400,5200,6100,7100,7900,8700,9500,10300], 博士:[6100,7300,8600,10200,11900,13300,14600,16000,17300] },
    '新能源类':   { color:'#ec4899', 本科:[2500,3000,3600,4300,5100,5700,6200,6700,7200], 硕士:[3900,4600,5500,6500,7700,8600,9500,10400,11300], 博士:[6400,7700,9100,10800,12700,14300,15700,17200,18600] },
    '土木工程':   { color:'#64748b', 本科:[2300,2700,3200,3800,4400,4800,5200,5500,5900], 硕士:[3500,4200,4900,5800,6700,7500,8200,9000,9800], 博士:[5800,6900,8200,9700,11200,12500,13800,15100,16300] },
    '医学类':     { color:'#ef4444', 本科:[2200,2600,3100,3700,4300,4800,5300,6000,6500], 硕士:[3400,4000,4800,5700,6600,7400,8200,9300,10100], 博士:[5600,6700,7900,9400,10900,12300,13600,15400,16700] },
    '经济学类':   { color:'#a78bfa', 本科:[2400,2900,3400,4100,4700,5100,5400,5800,6300], 硕士:[3700,4400,5200,6200,7100,7900,8600,9300,10100], 博士:[6100,7300,8600,10300,11900,13300,14600,15800,17100] },
    '教育学类':   { color:'#10b981', 本科:[2000,2400,2800,3300,3900,4300,4700,5200,5600], 硕士:[3100,3700,4300,5100,6000,6700,7300,8000,8700], 博士:[5100,6100,7200,8500,9900,11100,12200,13400,14500] },
    '生物医药':   { color:'#fb923c', 本科:[2400,2800,3300,4000,4700,5200,5700,6200,6800], 硕士:[3800,4500,5300,6300,7300,8200,9100,10000,10900], 博士:[6200,7400,8800,10400,12200,13700,15100,16500,17900] },
    '财经类':     { color:'#c084fc', 本科:[2500,3000,3500,4200,4900,5400,5800,6300,6800], 硕士:[3800,4500,5300,6300,7200,8100,8900,9700,10500], 博士:[6200,7400,8800,10400,12100,13600,15000,16300,17600] },
    '统计学':     { color:'#2dd4bf', 本科:[2600,3100,3700,4400,5200,5700,6200,6700,7200], 硕士:[4000,4800,5600,6600,7700,8600,9500,10400,11300], 博士:[6500,7800,9300,11000,12800,14400,15800,17200,18600] },
    '材料类':     { color:'#78716c', 本科:[2300,2700,3200,3800,4400,4800,5200,5600,6100], 硕士:[3500,4200,4900,5800,6700,7500,8200,9000,9800], 博士:[5800,6900,8200,9700,11200,12500,13800,15100,16300] },
    '化工类':     { color:'#84cc16', 本科:[2300,2700,3100,3700,4300,4700,5100,5500,5900], 硕士:[3500,4100,4800,5700,6500,7300,8000,8800,9500], 博士:[5700,6800,8000,9400,11000,12300,13500,14700,15900] },
    '环境科学':   { color:'#4ade80', 本科:[2200,2600,3100,3700,4300,4800,5300,5800,6300], 硕士:[3400,4000,4800,5700,6600,7400,8200,9100,9900], 博士:[5600,6700,7900,9300,10800,12200,13400,14600,15800] },
    '心理学':     { color:'#f472b6', 本科:[2100,2500,2900,3400,3900,4300,4600,5000,5400], 硕士:[3200,3800,4400,5200,6000,6700,7300,8000,8700], 博士:[5300,6300,7500,8800,10300,11500,12700,13800,14900] },
    '人文社科':   { color:'#94a3b8', 本科:[1900,2300,2700,3100,3600,3900,4200,4600,5000], 硕士:[3000,3600,4200,4900,5600,6200,6800,7400,8000], 博士:[5000,6000,7100,8300,9600,10700,11800,12800,13800] }
  };

  // 产业需求指数
  var industryData = {
    'IT/互联网': { color:'#22d3ee', values:[100,130,170,220,280,320,350,380,400] },
    '制造业':    { color:'#f59e0b', values:[100,105,108,110,112,115,118,120,122] },
    '教育':      { color:'#10b981', values:[100,102,105,108,110,115,120,125,128] },
    '金融':      { color:'#a78bfa', values:[100,108,115,120,122,118,115,112,110] },
    '医疗':      { color:'#ef4444', values:[100,105,110,115,120,128,135,142,148] },
    '新能源':    { color:'#ec4899', values:[100,120,150,190,240,300,380,460,520] },
    '科研/政府': { color:'#64748b', values:[100,102,105,108,110,112,115,118,120] },
    '环保':      { color:'#4ade80', values:[100,115,135,160,190,230,270,310,350] }
  };

  var majorToIndustry = {
    '计算机类':'IT/互联网', '软件工程':'IT/互联网', '电子信息类':'IT/互联网',
    '自动化类':'制造业', '机械类':'制造业', '新能源类':'新能源',
    '土木工程':'制造业', '医学类':'医疗', '生物医药':'医疗',
    '经济学类':'金融', '财经类':'金融', '教育学类':'教育',
    '统计学':'IT/互联网', '材料类':'制造业', '化工类':'制造业',
    '环境科学':'环保', '心理学':'教育', '人文社科':'教育'
  };

  function getData(major, metric, edu) {
    if (metric === 'employment') return employmentData[major][edu];
    return salaryData[major][edu];
  }

  function commonOption() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
      grid: { left: 50, right: 30, top: 40, bottom: 40 },
      xAxis: { type: 'category', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { show: false } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } }
    };
  }

  // ===== 1. Overall Trend =====
  function initTrendChart() {
    var dom = document.getElementById('chartTrend');
    if (!dom) return;
    if (charts.trend) charts.trend.dispose();
    charts.trend = echarts.init(dom, null, { renderer: 'svg' });

    var avgValues = years.map(function(_, i) {
      var sum = 0, count = 0;
      Object.keys(employmentData).forEach(function(m) {
        sum += employmentData[m][currentEdu][i]; count++;
      });
      return (sum / count).toFixed(2);
    });

    var opt = commonOption();
    opt.title = { text: currentEdu + '毕业生平均就业率变化趋势', left: 'center', top: 5, textStyle: { color: '#ec4899', fontSize: 13 } };
    opt.xAxis.data = years;
    opt.yAxis.min = 80; opt.yAxis.max = 95;
    opt.series = [
      { type: 'line', data: avgValues, showSymbol: true, smooth: true, lineStyle: { color: '#ec4899', width: 3 },
        itemStyle: { color: '#ec4899' }, areaStyle: { color: 'rgba(236,72,153,0.1)' },
        markLine: { silent: true, symbol: 'none', data: [
          { yAxis: 90, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '90% 基准线', color: '#f59e0b' } }
        ]}
      }
    ];
    charts.trend.setOption(opt);
  }

  // ===== 2. Major Comparison (Employment or Salary) =====
  function initMajorChart() {
    var dom = document.getElementById('chartMajor');
    if (!dom) return;
    if (charts.major) charts.major.dispose();
    charts.major = echarts.init(dom, null, { renderer: 'svg' });

    var dataObj = currentMetric === 'employment' ? employmentData : salaryData;
    var yLabel = currentMetric === 'employment' ? '就业率(%)' : '月薪(元)';
    var yMin = currentMetric === 'employment' ? 75 : 0;
    var yMax = currentMetric === 'employment' ? 100 : null;

    var series = [];
    Object.keys(dataObj).forEach(function(major) {
      if (currentMajorFilter !== 'all' && currentMajorFilter !== major) return;
      var d = dataObj[major];
      series.push({
        type: 'line', name: major, data: d[currentEdu], showSymbol: true, smooth: true,
        lineStyle: { color: d.color, width: currentMajorFilter === 'all' ? 2 : 3 },
        itemStyle: { color: d.color }
      });
    });

    var titleText = currentMajorFilter === 'all'
      ? '十八个专业' + currentEdu + (currentMetric === 'employment' ? '就业率' : '薪酬') + '走势'
      : currentMajorFilter + currentEdu + (currentMetric === 'employment' ? '就业率' : '薪酬') + '走势';

    var opt = commonOption();
    opt.title = { text: titleText, left: 'center', top: 5, textStyle: { color: '#ec4899', fontSize: 13 } };
    opt.xAxis.data = years;
    opt.yAxis.min = yMin; opt.yAxis.max = yMax; opt.yAxis.name = yLabel;
    opt.legend = currentMajorFilter === 'all' ? {
      data: Object.keys(dataObj).map(function(m){return m;}),
      top: 25, textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 16, itemHeight: 3
    } : undefined;
    opt.series = series;
    charts.major.setOption(opt);
  }

  // ===== 3. Industry Demand =====
  function initIndustryChart() {
    var dom = document.getElementById('chartIndustry');
    if (!dom) return;
    if (charts.industry) charts.industry.dispose();
    charts.industry = echarts.init(dom, null, { renderer: 'svg' });

    var series = [];
    Object.keys(industryData).forEach(function(name) {
      var d = industryData[name];
      series.push({
        type: 'line', name: name, data: d.values, showSymbol: true, smooth: true,
        lineStyle: { color: d.color, width: 2 }, itemStyle: { color: d.color }
      });
    });

    var opt = commonOption();
    opt.title = { text: '六大产业人才需求指数变化（2010-2026年）', left: 'center', top: 5, textStyle: { color: '#ec4899', fontSize: 13 } };
    opt.xAxis.data = years;
    opt.legend = { data: Object.keys(industryData), top: 25, textStyle: { color: '#94a3b8', fontSize: 11 } };
    opt.series = series;
    charts.industry.setOption(opt);
  }

  // ===== 4. Scatter: Employment vs Demand =====
  function initScatterChart() {
    var dom = document.getElementById('chartScatter');
    if (!dom) return;
    if (charts.scatter) charts.scatter.dispose();
    charts.scatter = echarts.init(dom, null, { renderer: 'svg' });

    var data = [];
    Object.keys(employmentData).forEach(function(major) {
      var indName = majorToIndustry[major];
      var demand = industryData[indName] ? industryData[indName].values[7] : 100; // 2024
      var rate = employmentData[major][currentEdu][7]; // 2024
      var color = employmentData[major].color;
      data.push({
        value: [demand, rate], name: major,
        itemStyle: { color: color }
      });
    });

    var opt = {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' },
        formatter: function(p) { return p.data.name + '<br/>就业率: ' + p.data.value[1] + '%<br/>产业需求指数: ' + p.data.value[0]; } },
      grid: { left: 50, right: 30, top: 30, bottom: 40 },
      xAxis: { type: 'value', name: '产业需求指数', nameTextStyle: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } },
      yAxis: { type: 'value', name: '就业率(%)', min: 70, max: 100, nameTextStyle: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } },
      series: [{
        type: 'scatter', data: data, symbolSize: 18,
        label: { show: true, formatter: function(p){return p.data.name;}, color: '#f1f5f9', fontSize: 10, position: 'top' }
      }]
    };
    charts.scatter.setOption(opt);
  }

  // ===== 5. Histogram =====
  function initHistChart() {
    var dom = document.getElementById('chartHist');
    if (!dom) return;
    if (charts.hist) charts.hist.dispose();
    charts.hist = echarts.init(dom, null, { renderer: 'svg' });

    var rates = Object.keys(employmentData).map(function(m){ return employmentData[m][currentEdu][7]; });
    var bins = [75,78,80,82,84,86,88,90,92,94,96,98,100];
    var counts = new Array(bins.length-1).fill(0);
    rates.forEach(function(r) {
      for (var i = 0; i < bins.length - 1; i++) {
        if (r >= bins[i] && r < bins[i+1]) { counts[i]++; break; }
      }
    });

    var data = [];
    for (var i = 0; i < bins.length - 1; i++) {
      data.push([bins[i] + '-' + bins[i+1], counts[i]]);
    }

    var opt = {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      grid: { left: 50, right: 30, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: data.map(function(d){return d[0];}), axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 }, splitLine: { show: false } },
      yAxis: { type: 'value', name: '专业数量', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#33415540' } } },
      series: [{ type: 'bar', data: data.map(function(d){return d[1];}), barWidth: '70%', itemStyle: { color: 'rgba(236,72,153,0.6)' } }]
    };
    charts.hist.setOption(opt);
  }

  // ===== 6. Statistics Calculation =====
  function calcStats(yearIdx) {
    var rates = Object.keys(employmentData).map(function(m){ return employmentData[m][currentEdu][yearIdx]; });
    var salaries = Object.keys(salaryData).map(function(m){ return salaryData[m][currentEdu][yearIdx]; });

    function calc(arr) {
      var n = arr.length;
      var sum = arr.reduce(function(a,b){return a+b;}, 0);
      var mean = sum / n;
      var sorted = arr.slice().sort(function(a,b){return a-b;});
      var median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
      var variance = arr.reduce(function(a,b){return a + Math.pow(b - mean, 2);}, 0) / (n - 1);
      var std = Math.sqrt(variance);
      var min = sorted[0], max = sorted[n-1];
      var cv = std / mean;
      return { mean: mean, median: median, variance: variance, std: std, min: min, max: max, cv: cv };
    }

    var sRate = calc(rates);
    var sSal = calc(salaries);

    document.getElementById('statMean').textContent = sRate.mean.toFixed(2) + '%';
    document.getElementById('statVar').textContent = sRate.variance.toFixed(2);
    document.getElementById('statStd').textContent = sRate.std.toFixed(2) + '%';
    document.getElementById('statMed').textContent = sRate.median.toFixed(2) + '%';
    document.getElementById('statMax').textContent = sRate.max.toFixed(1) + '%';
    document.getElementById('statMin').textContent = sRate.min.toFixed(1) + '%';
    document.getElementById('statRange').textContent = (sRate.max - sRate.min).toFixed(1) + '%';
    document.getElementById('statCV').textContent = (sRate.cv * 100).toFixed(2) + '%';

    document.getElementById('statSalMean').textContent = Math.round(sSal.mean) + '元';
    document.getElementById('statSalMed').textContent = Math.round(sSal.median) + '元';
    document.getElementById('statSalMax').textContent = Math.round(sSal.max) + '元';
    document.getElementById('statSalMin').textContent = Math.round(sSal.min) + '元';
  }

  var currentSalaryMajor = '计算机类';
  var eduColors = ['rgba(34,211,238,0.9)', 'rgba(236,72,153,0.9)', 'rgba(245,158,11,0.9)'];

  // ===== 7. Single Major Salary Trend =====
  function initSalaryChart() {
    var dom = document.getElementById('chartSalary');
    if (!dom) return;
    if (charts.salary) charts.salary.dispose();
    charts.salary = echarts.init(dom, null, { renderer: 'svg' });

    var major = currentSalaryMajor;
    var d = salaryData[major];
    if (!d) return;

    var series = eduLevels.map(function(edu, idx) {
      return {
        type: 'line', name: edu, data: d[edu], showSymbol: true, smooth: true,
        lineStyle: { color: eduColors[idx], width: 3 },
        itemStyle: { color: eduColors[idx] },
        areaStyle: { color: eduColors[idx].replace('0.9', '0.08') }
      };
    });

    var opt = commonOption();
    opt.title = { text: major + ' · 历年薪酬走势（月薪/元）', left: 'center', top: 5, textStyle: { color: '#ec4899', fontSize: 13 } };
    opt.xAxis.data = years;
    opt.yAxis.name = '月薪(元)';
    opt.legend = { data: eduLevels, top: 25, textStyle: { color: '#94a3b8' } };
    opt.tooltip.formatter = function(params) {
      var res = params[0].axisValue + '年<br/>';
      params.forEach(function(p) {
        res += p.marker + ' ' + p.seriesName + ': ' + p.value.toLocaleString() + ' 元/月<br/>';
      });
      return res;
    };
    opt.series = series;
    charts.salary.setOption(opt);

    // Update stat boxes
    var y2024 = 7; // index for 2024
    var y2010 = 0;
    var bSal = d['本科'][y2024], mSal = d['硕士'][y2024], dSal = d['博士'][y2024];
    var bSal0 = d['本科'][y2010];
    var elB = document.getElementById('salStatB');
    var elM = document.getElementById('salStatM');
    var elD = document.getElementById('salStatD');
    var elG = document.getElementById('salStatGrowth');
    if (elB) elB.textContent = bSal.toLocaleString() + '元';
    if (elM) elM.textContent = mSal.toLocaleString() + '元';
    if (elD) elD.textContent = dSal.toLocaleString() + '元';
    if (elG) elG.textContent = Math.round((bSal - bSal0) / bSal0 * 100) + '%';
  }

  // ===== 7b. All Majors Salary Comparison Bar Chart =====
  function initSalaryCompare() {
    var dom = document.getElementById('chartSalaryCompare');
    if (!dom) return;
    if (charts.salaryCmp) charts.salaryCmp.dispose();
    charts.salaryCmp = echarts.init(dom, null, { renderer: 'svg' });

    var yearIdx = 7; // 2024
    var majors = Object.keys(salaryData);
    var series = eduLevels.map(function(edu, idx) {
      return {
        type: 'bar', name: edu,
        data: majors.map(function(m){ return salaryData[m][edu][yearIdx]; }),
        itemStyle: { color: eduColors[idx] }
      };
    });

    var opt = commonOption();
    opt.title = { text: '2024年 18个专业薪酬横向对比（元/月）', left: 'center', top: 5, textStyle: { color: '#ec4899', fontSize: 13 } };
    opt.xAxis.data = majors;
    opt.xAxis.axisLabel = { color: '#94a3b8', fontSize: 9, rotate: 25, fontFamily: 'JetBrainsMono' };
    opt.yAxis.name = '月薪(元)';
    opt.legend = { data: eduLevels, top: 25, textStyle: { color: '#94a3b8' } };
    opt.tooltip.formatter = function(params) {
      var res = params[0].axisValue + '<br/>';
      params.forEach(function(p) {
        res += p.marker + ' ' + p.seriesName + ': ' + p.value.toLocaleString() + ' 元/月<br/>';
      });
      return res;
    };
    opt.series = series;
    charts.salaryCmp.setOption(opt);
  }

  // ===== 8. LLN Chart =====
  function initLLNChart() {
    var dom = document.getElementById('chartLLN');
    if (!dom) return;
    if (charts.lln) charts.lln.dispose();
    charts.lln = echarts.init(dom, null, { renderer: 'svg' });

    var rates2024 = Object.keys(employmentData).map(function(m){ return employmentData[m][currentEdu][7]; });
    var trueMean = rates2024.reduce(function(a,b){return a+b;}, 0) / rates2024.length;
    var sampleSizes = [2,3,4,5,6,8,10,15,20,30,50,100,200,500,1000];
    var data = sampleSizes.map(function(n) {
      var sum = 0;
      for (var i = 0; i < n; i++) {
        sum += rates2024[Math.floor(Math.random() * rates2024.length)];
      }
      return [n, sum / n];
    });

    var opt = {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
      grid: { left: 50, right: 30, top: 40, bottom: 40 },
      xAxis: { type: 'value', name: '样本量', scale: true, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } },
      yAxis: { type: 'value', name: '样本均值(%)', min: 75, max: 95, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } },
      series: [
        { type: 'scatter', data: data, symbolSize: 10, itemStyle: { color: '#ec4899' } },
        { type: 'line', markLine: { silent: true, symbol: 'none', data: [{ yAxis: trueMean, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '真实均值 ' + trueMean.toFixed(2) + '%', color: '#f59e0b' } }] } }
      ]
    };
    charts.lln.setOption(opt);
  }

  // ===== 9. CLT Chart =====
  function initCLTChart() {
    var dom = document.getElementById('chartCLT');
    if (!dom) return;
    if (charts.clt) charts.clt.dispose();
    charts.clt = echarts.init(dom, null, { renderer: 'svg' });

    var rates2024 = Object.keys(employmentData).map(function(m){ return employmentData[m][currentEdu][7]; });
    var means = [];
    for (var s = 0; s < reps; s++) {
      var sum = 0;
      for (var i = 0; i < sampleN; i++) {
        sum += rates2024[Math.floor(Math.random() * rates2024.length)];
      }
      means.push(sum / sampleN);
    }

    var min = 80, max = 100;
    var bins = 20;
    var binW = (max - min) / bins;
    var counts = new Array(bins).fill(0);
    means.forEach(function(v) {
      var idx = Math.min(bins - 1, Math.floor((v - min) / binW));
      counts[idx]++;
    });

    var barData = [];
    for (var i = 0; i < bins; i++) {
      barData.push([min + i * binW + binW/2, counts[i]]);
    }

    var mu = rates2024.reduce(function(a,b){return a+b;}, 0) / rates2024.length;
    var varPop = rates2024.reduce(function(a,b){return a + Math.pow(b - mu, 2);}, 0) / rates2024.length;
    var sigma = Math.sqrt(varPop / sampleN);
    var lineData = [];
    for (var x = min; x <= max; x += 0.5) {
      var z = (x - mu) / sigma;
      var y = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z) * reps * binW;
      lineData.push([x, y]);
    }

    var opt = {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
      grid: { left: 50, right: 30, top: 50, bottom: 40 },
      legend: { data: ['样本均值直方图', '理论正态分布'], top: 10, textStyle: { color: '#94a3b8' } },
      xAxis: { type: 'value', name: '样本均值(%)', min: 75, max: 100, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: '#33415540' } } },
      yAxis: { type: 'value', name: '频次', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#33415540' } } },
      series: [
        { type: 'bar', name: '样本均值直方图', data: barData, barWidth: '90%', itemStyle: { color: 'rgba(236,72,153,0.6)' } },
        { type: 'line', name: '理论正态分布', data: lineData, showSymbol: false, smooth: true, lineStyle: { color: '#f59e0b', width: 2 } }
      ]
    };
    charts.clt.setOption(opt);
  }

  // ===== Init all =====
  function initAll() {
    initTrendChart();
    initMajorChart();
    initIndustryChart();
    initScatterChart();
    initHistChart();
    initSalaryChart();
    initSalaryCompare();
    calcStats(7);
    initLLNChart();
    initCLTChart();
  }

  document.addEventListener('DOMContentLoaded', initAll);

  // Edu level selector
  document.querySelectorAll('.edu-selector button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.edu-selector button').forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      currentEdu = this.dataset.edu;
      initTrendChart(); initMajorChart(); initScatterChart(); initHistChart();
      calcStats(7); initLLNChart(); initCLTChart();
    });
  });

  // Metric selector
  document.querySelectorAll('.metric-selector button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.metric-selector button').forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      currentMetric = this.dataset.metric;
      initMajorChart();
    });
  });

  // Major selector
  document.querySelectorAll('.major-selector button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.major-selector button').forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      currentMajorFilter = this.dataset.major;
      initMajorChart();
    });
  });

  // Year slider
  var rangeYear = document.getElementById('rangeYear');
  if (rangeYear) {
    rangeYear.addEventListener('input', function() {
      var idx = parseInt(this.value);
      document.getElementById('valYear').textContent = years[idx];
      calcStats(idx);
    });
  }

  // CLT controls
  var rangeSampleN = document.getElementById('rangeSampleN');
  var rangeReps = document.getElementById('rangeReps');
  if (rangeSampleN) {
    rangeSampleN.addEventListener('input', function() {
      sampleN = parseInt(this.value);
      document.getElementById('valSampleN').textContent = sampleN;
    });
  }
  if (rangeReps) {
    rangeReps.addEventListener('input', function() {
      reps = parseInt(this.value);
      document.getElementById('valReps').textContent = reps;
    });
  }
  var btnCLT = document.getElementById('btnCLT');
  if (btnCLT) {
    btnCLT.addEventListener('click', function() {
      initCLTChart();
    });
  }

  // Salary major selector
  document.querySelectorAll('#salaryMajorSelector button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#salaryMajorSelector button').forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      currentSalaryMajor = this.dataset.salaryMajor;
      initSalaryChart();
    });
  });

  window.addEventListener('resize', function() {
    Object.values(charts).forEach(function(c) { if (c) c.resize(); });
  });
})();
