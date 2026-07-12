(function() {
  var charts = {};

  function sRand(seed) {
    var x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

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

  // ========== 1. Sampling Chart ==========
  function initSamplingChart() {
    var dom = document.getElementById('chartSampling');
    if (!dom) return;
    if (charts.sampling) charts.sampling.dispose();
    charts.sampling = echarts.init(dom, null, { renderer: 'svg' });

    charts.sampling.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({ trigger: 'axis' }, tooltipStyle()),
      title: {
        text: '\u4e09\u79cd\u62bd\u6837\u65b9\u6cd5\u5bf9\u6bd4',
        left: 'center', top: 5,
        textStyle: { color: '#10b981', fontSize: 13, fontWeight: 'bold' }
      },
      legend: {
        data: ['A\u54c1\u724c', 'B\u54c1\u724c'],
        top: 28, textStyle: { color: '#94a3b8' }
      },
      grid: { left: 60, right: 30, top: 60, bottom: 50 },
      xAxis: Object.assign({
        type: 'category',
        data: ['\u7b80\u5355\u968f\u673a\u62bd\u6837', '\u5206\u5c42\u62bd\u6837', '\u7cfb\u7edf\u62bd\u6837'],
        axisLabel: { color: '#94a3b8', fontSize: 11, interval: 0 },
        splitLine: { show: false }
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u62bd\u53d6\u7bb1\u6570',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: 'A\u54c1\u724c', type: 'bar', barWidth: '28%',
          data: [28, 30, 27],
          itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: '#10b981', fontWeight: 'bold', fontSize: 12 }
        },
        {
          name: 'B\u54c1\u724c', type: 'bar', barWidth: '28%',
          data: [22, 20, 23],
          itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: '#f59e0b', fontWeight: 'bold', fontSize: 12 }
        }
      ]
    });
  }

  // ========== 2. Distribution Chart ==========
  function initDistributionChart() {
    var dom = document.getElementById('chartDistribution');
    if (!dom) return;
    if (charts.distribution) charts.distribution.dispose();
    charts.distribution = echarts.init(dom, null, { renderer: 'svg' });

    var scores = ['1\u5206', '2\u5206', '3\u5206', '4\u5206', '5\u5206'];
    var counts = [2, 6, 20, 90, 82];

    charts.distribution.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var p = params[0];
          return p.name + '\n\u4eba\u6570: ' + p.value + '\u4eba';
        }
      }, tooltipStyle()),
      title: {
        text: '\u5976\u8336\u5e97\u987e\u5ba2\u8bc4\u5206\u9891\u7387\u5206\u5e03',
        left: 'center', top: 5,
        textStyle: { color: '#10b981', fontSize: 13, fontWeight: 'bold' }
      },
      grid: { left: 50, right: 30, top: 40, bottom: 40 },
      xAxis: Object.assign({
        type: 'category',
        data: scores,
        axisLabel: { color: '#94a3b8', fontSize: 13 },
        splitLine: { show: false }
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u4eba\u6570',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [{
        type: 'bar', data: counts, barWidth: '50%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10b981' },
            { offset: 1, color: 'rgba(16,185,129,0.12)' }
          ]),
          borderRadius: [6, 6, 0, 0]
        },
        label: {
          show: true, position: 'top',
          color: '#10b981', fontWeight: 'bold', fontSize: 12,
          formatter: function(p) { return p.value + '\u4eba'; }
        }
      }]
    });
  }

  // ========== 3. Regression Chart ==========
  var _regData = null;
  function getRegData() {
    if (_regData) return _regData;
    _regData = [];
    for (var i = 0; i < 100; i++) {
      var x = 50 + sRand(i * 13 + 7) * 100;
      var y = 1.5 * x + 30 + (sRand(i * 17 + 3) - 0.5) * 40;
      _regData.push([parseFloat(x.toFixed(1)), parseFloat(y.toFixed(1))]);
    }
    return _regData;
  }

  function initRegressionChart(sliderValue) {
    var dom = document.getElementById('chartRegression');
    if (!dom) return;
    if (charts.regression) charts.regression.dispose();
    charts.regression = echarts.init(dom, null, { renderer: 'svg' });

    var data = getRegData();
    var predictY = parseFloat((1.5 * sliderValue + 30).toFixed(1));

    charts.regression.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'item',
        formatter: function(p) {
          if (p.seriesName === '\u9884\u6d4b\u70b9') {
            return '\u9884\u6d4b: \u9762\u79ef ' + p.data[0] + ' m\u00b2\n\u552e\u4ef7: ' + p.data[1] + ' \u4e07\u5143';
          }
          return '\u9762\u79ef: ' + p.data[0] + ' m\u00b2\n\u552e\u4ef7: ' + p.data[1] + ' \u4e07\u5143';
        }
      }, tooltipStyle()),
      title: {
        text: '\u9762\u79ef\u4e0e\u552e\u4ef7\u6563\u70b9\u56fe\u53ca\u56de\u5f52\u76f4\u7ebf',
        left: 'center', top: 5,
        textStyle: { color: '#10b981', fontSize: 13, fontWeight: 'bold' }
      },
      legend: {
        data: ['\u6563\u70b9\u6570\u636e', '\u56de\u5f52\u76f4\u7ebf', '\u9884\u6d4b\u70b9'],
        top: 28, textStyle: { color: '#94a3b8' }
      },
      grid: { left: 65, right: 30, top: 60, bottom: 45 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u9762\u79ef(m\u00b2)',
        nameTextStyle: { color: '#94a3b8' },
        min: 40, max: 160
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u552e\u4ef7(\u4e07\u5143)',
        nameTextStyle: { color: '#94a3b8' },
        min: 80, max: 270
      }, axisStyle()),
      series: [
        {
          name: '\u6563\u70b9\u6570\u636e', type: 'scatter',
          data: data, symbolSize: 7,
          itemStyle: { color: 'rgba(6,182,212,0.55)', borderColor: 'rgba(6,182,212,0.8)', borderWidth: 1 }
        },
        {
          name: '\u56de\u5f52\u76f4\u7ebf', type: 'line',
          data: [[50, 105], [150, 255]],
          showSymbol: false, silent: true,
          lineStyle: { color: '#ec4899', width: 2, type: 'dashed' }
        },
        {
          name: '\u9884\u6d4b\u70b9', type: 'scatter',
          data: [[sliderValue, predictY]],
          symbolSize: 14,
          itemStyle: { color: '#f59e0b', borderColor: '#fff', borderWidth: 2 },
          label: {
            show: true, position: 'top',
            color: '#f59e0b', fontWeight: 'bold', fontSize: 12,
            formatter: predictY + ' \u4e07\u5143'
          },
          z: 10
        }
      ]
    });
  }

  // ========== 4. Contingency Chart ==========
  function initContingencyChart() {
    var dom = document.getElementById('chartContingency');
    if (!dom) return;
    if (charts.contingency) charts.contingency.dispose();
    charts.contingency = echarts.init(dom, null, { renderer: 'svg' });

    charts.contingency.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var res = params[0].axisValue + '\n';
          params.forEach(function(p) {
            res += p.marker + ' ' + p.seriesName + ': ' + p.value + '\u4eba\n';
          });
          return res;
        }
      }, tooltipStyle()),
      title: {
        text: '\u73a9\u624b\u673a\u65f6\u957f\u4e0e\u8fd1\u89c6\u7684\u5173\u7cfb',
        left: 'center', top: 5,
        textStyle: { color: '#10b981', fontSize: 13, fontWeight: 'bold' }
      },
      legend: {
        data: ['\u8fd1\u89c6', '\u4e0d\u8fd1\u89c6'],
        top: 28, textStyle: { color: '#94a3b8' }
      },
      grid: { left: 50, right: 30, top: 60, bottom: 40 },
      xAxis: Object.assign({
        type: 'category',
        data: ['\u73a9\u624b\u673a>2h', '\u73a9\u624b\u673a\u22642h'],
        axisLabel: { color: '#94a3b8', fontSize: 12 },
        splitLine: { show: false }
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u4eba\u6570',
        nameTextStyle: { color: '#94a3b8' }
      }, axisStyle()),
      series: [
        {
          name: '\u8fd1\u89c6', type: 'bar', stack: 'total',
          data: [70, 40],
          itemStyle: { color: '#ec4899' },
          label: {
            show: true, position: 'insideBottom',
            color: '#fff', fontWeight: 'bold', fontSize: 14,
            formatter: function(p) { return p.value + '\u4eba'; }
          }
        },
        {
          name: '\u4e0d\u8fd1\u89c6', type: 'bar', stack: 'total',
          data: [30, 60],
          itemStyle: { color: '#06b6d4', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true, position: 'insideTop',
            color: '#fff', fontWeight: 'bold', fontSize: 14,
            formatter: function(p) { return p.value + '\u4eba'; }
          }
        }
      ]
    });
  }

  // ========== 5. Normal Distribution Chart ==========
  function normalPDF(x, mu, sigma) {
    var z = (x - mu) / sigma;
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
  }

  function genRegion(mu, sigma, nSigma) {
    var step = sigma / 8;
    var lo = mu - nSigma * sigma;
    var hi = mu + nSigma * sigma;
    var pts = [[parseFloat(lo.toFixed(2)), 0]];
    for (var x = lo; x <= hi + 0.01; x += step) {
      pts.push([parseFloat(x.toFixed(2)), normalPDF(x, mu, sigma)]);
    }
    pts.push([parseFloat(hi.toFixed(2)), 0]);
    return pts;
  }

  function genCurve(mu, sigma) {
    var xMin = mu - 4 * sigma;
    var xMax = mu + 4 * sigma;
    var step = sigma / 8;
    var pts = [];
    for (var x = xMin; x <= xMax + 0.01; x += step) {
      pts.push([parseFloat(x.toFixed(2)), normalPDF(x, mu, sigma)]);
    }
    return pts;
  }

  function initNormalChart(mu, sigma) {
    var dom = document.getElementById('chartNormal');
    if (!dom) return;
    if (charts.normal) charts.normal.dispose();
    charts.normal = echarts.init(dom, null, { renderer: 'svg' });

    var curve = genCurve(mu, sigma);
    var r3 = genRegion(mu, sigma, 3);
    var r2 = genRegion(mu, sigma, 2);
    var r1 = genRegion(mu, sigma, 1);

    charts.normal.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: Object.assign({
        trigger: 'axis',
        formatter: function(params) {
          var p = params[params.length - 1];
          if (!p) return '';
          return '\u5206\u6570: ' + p.data[0] + '\n\u6982\u7387\u5bc6\u5ea6: ' + p.data[1].toFixed(5);
        }
      }, tooltipStyle()),
      title: {
        text: '\u6b63\u6001\u5206\u5e03\u66f2\u7ebf (\u03bc=' + mu + ', \u03c3=' + sigma + ')',
        left: 'center', top: 5,
        textStyle: { color: '#10b981', fontSize: 13, fontWeight: 'bold' }
      },
      legend: {
        data: [
          '\u03bc\u00b13\u03c3 (99.73%)',
          '\u03bc\u00b12\u03c3 (95.45%)',
          '\u03bc\u00b11\u03c3 (68.27%)',
          '\u6b63\u6001\u5206\u5e03\u66f2\u7ebf'
        ],
        top: 28, textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 14, itemHeight: 10
      },
      grid: { left: 60, right: 30, top: 60, bottom: 45 },
      xAxis: Object.assign({
        type: 'value',
        name: '\u5206\u6570',
        nameTextStyle: { color: '#94a3b8' },
        min: mu - 4 * sigma,
        max: mu + 4 * sigma
      }, axisStyle()),
      yAxis: Object.assign({
        type: 'value',
        name: '\u6982\u7387\u5bc6\u5ea6',
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: {
          color: '#94a3b8',
          fontFamily: 'JetBrainsMono, monospace',
          formatter: function(v) { return v.toFixed(4); }
        }
      }, axisStyle()),
      series: [
        {
          name: '\u03bc\u00b13\u03c3 (99.73%)',
          type: 'line', data: r3, silent: true,
          areaStyle: { color: 'rgba(139,92,246,0.18)' },
          lineStyle: { width: 0 }, symbol: 'none'
        },
        {
          name: '\u03bc\u00b12\u03c3 (95.45%)',
          type: 'line', data: r2, silent: true,
          areaStyle: { color: 'rgba(245,158,11,0.22)' },
          lineStyle: { width: 0 }, symbol: 'none'
        },
        {
          name: '\u03bc\u00b11\u03c3 (68.27%)',
          type: 'line', data: r1, silent: true,
          areaStyle: { color: 'rgba(16,185,129,0.28)' },
          lineStyle: { width: 0 }, symbol: 'none'
        },
        {
          name: '\u6b63\u6001\u5206\u5e03\u66f2\u7ebf',
          type: 'line', data: curve,
          showSymbol: false,
          lineStyle: { color: '#10b981', width: 2.5 },
          areaStyle: { show: false },
          markLine: {
            silent: true, symbol: 'none',
            data: [
              {
                xAxis: mu,
                lineStyle: { color: 'rgba(16,185,129,0.5)', type: 'dashed' },
                label: {
                  formatter: '\u03bc=' + mu,
                  color: '#10b981',
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 11
                }
              }
            ]
          }
        }
      ]
    });
  }

  // ========== 六、推荐算法流程图 ==========
  function initRecommendChart() {
    var dom = document.getElementById('chartRecommend');
    if (!dom || !echarts) return;
    var chart = echarts.init(dom, null, { renderer: 'canvas' });
    charts['chartRecommend'] = chart;

    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'left',
        nodeGap: 12,
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { color: '#f1f5f9', fontSize: 12, fontFamily: 'Outfit, system-ui, sans-serif' },
        itemStyle: { borderWidth: 0 },
        data: [
          { name: '\u7528\u6237\u884c\u4e3a\u6570\u636e', itemStyle: { color: '#10b981' } },
          { name: '\u6d4f\u89c8/\u70b9\u51fb/\u505c\u7559', itemStyle: { color: '#06b6d4' } },
          { name: '\u7528\u6237-\u7269\u54c1\u77e9\u9635', itemStyle: { color: '#06b6d4' } },
          { name: '\u76f8\u4f3c\u5ea6\u8ba1\u7b97', itemStyle: { color: '#f59e0b' } },
          { name: '\u76f8\u5173\u7cfb\u6570', itemStyle: { color: '#f59e0b' } },
          { name: '\u6761\u4ef6\u6982\u7387\u4f30\u8ba1', itemStyle: { color: '#ec4899' } },
          { name: 'P(\u559c\u6b22|\u5386\u53f2)', itemStyle: { color: '#ec4899' } },
          { name: '\u6392\u5e8f\u5019\u9009', itemStyle: { color: '#8b5cf6' } },
          { name: 'A/B\u6d4b\u8bd5', itemStyle: { color: '#8b5cf6' } },
          { name: '\u72ec\u7acb\u6027\u68c0\u9a8c', itemStyle: { color: '#8b5cf6' } },
          { name: '\u63a8\u8350\u7ed3\u679c', itemStyle: { color: '#10b981' } }
        ],
        links: [
          { source: '\u7528\u6237\u884c\u4e3a\u6570\u636e', target: '\u6d4f\u89c8/\u70b9\u51fb/\u505c\u7559', value: 10 },
          { source: '\u6d4f\u89c8/\u70b9\u51fb/\u505c\u7559', target: '\u7528\u6237-\u7269\u54c1\u77e9\u9635', value: 10 },
          { source: '\u7528\u6237-\u7269\u54c1\u77e9\u9635', target: '\u76f8\u4f3c\u5ea6\u8ba1\u7b97', value: 8 },
          { source: '\u76f8\u4f3c\u5ea6\u8ba1\u7b97', target: '\u76f8\u5173\u7cfb\u6570', value: 8 },
          { source: '\u76f8\u5173\u7cfb\u6570', target: '\u6761\u4ef6\u6982\u7387\u4f30\u8ba1', value: 6 },
          { source: '\u6761\u4ef6\u6982\u7387\u4f30\u8ba1', target: 'P(\u559c\u6b22|\u5386\u53f2)', value: 6 },
          { source: 'P(\u559c\u6b22|\u5386\u53f2)', target: '\u6392\u5e8f\u5019\u9009', value: 5 },
          { source: '\u6392\u5e8f\u5019\u9009', target: 'A/B\u6d4b\u8bd5', value: 4 },
          { source: 'A/B\u6d4b\u8bd5', target: '\u72ec\u7acb\u6027\u68c0\u9a8c', value: 3 },
          { source: '\u72ec\u7acb\u6027\u68c0\u9a8c', target: '\u63a8\u8350\u7ed3\u679c', value: 3 }
        ]
      }]
    });
  }

  // ========== Init on DOM ready ==========
  document.addEventListener('DOMContentLoaded', function() {
    initSamplingChart();
    initDistributionChart();
    initRegressionChart(100);
    initContingencyChart();
    initNormalChart(500, 50);
    initRecommendChart();

    // Regression slider
    var rangeArea = document.getElementById('rangeArea');
    if (rangeArea) {
      rangeArea.addEventListener('input', function() {
        var v = parseInt(this.value);
        var valArea = document.getElementById('valArea');
        if (valArea) valArea.textContent = v;
        var predictPrice = document.getElementById('predictPrice');
        if (predictPrice) predictPrice.textContent = (1.5 * v + 30).toFixed(1);
        initRegressionChart(v);
      });
    }

    // Normal distribution sliders
    var rangeMu = document.getElementById('rangeMu');
    var rangeSigma = document.getElementById('rangeSigma');
    if (rangeMu) {
      rangeMu.addEventListener('input', function() {
        var m = parseInt(this.value);
        var valMu = document.getElementById('valMu');
        if (valMu) valMu.textContent = m;
        var s = rangeSigma ? parseInt(rangeSigma.value) : 50;
        initNormalChart(m, s);
      });
    }
    if (rangeSigma) {
      rangeSigma.addEventListener('input', function() {
        var s = parseInt(this.value);
        var valSigma = document.getElementById('valSigma');
        if (valSigma) valSigma.textContent = s;
        var m = rangeMu ? parseInt(rangeMu.value) : 500;
        initNormalChart(m, s);
      });
    }
  });

  // ========== Responsive resize ==========
  window.addEventListener('resize', function() {
    for (var k in charts) {
      if (charts.hasOwnProperty(k) && charts[k]) {
        charts[k].resize();
      }
    }
  });
})();