# Math Visualization Series

一套面向高中与大学数学的交互式可视化学习工具，用动画和可调参数让抽象的数学概念变得可触可感。

**版本**: v1.1.0 (2026-07-21)

## 在线预览

直接打开 `index.html` 即可浏览全部项目，无需构建或安装任何依赖。

## 内容一览

### 集合与逻辑

| 文件 | 页面 | 说明 |
|------|------|------|
| `sets-logic.html` | 集合与常用逻辑用语 | 集合运算、命题与量词、条件关系、逻辑推理可视化 |

### 函数与方程

| 文件 | 页面 | 说明 |
|------|------|------|
| `trigonometry-visualization.html` | 三角函数可视化 | 正弦、余弦、正切的图像性质与单位圆联动演示 |
| `exponential-visualization.html` | 指数函数可视化 | 底数 a 对增长/衰减的影响，多场景动画 |
| `logarithm-visualization.html` | 对数函数可视化 | 对数运算法则、与指数函数的对称关系 |
| `function-properties.html` | 函数的基本性质 | 定义域、值域、单调性、奇偶性，10 种函数对比 |
| `zero-point-theorem.html` | 零点存在定理 | 零点定理条件验证与二分法求近似解 |
| `complex-exponential.html` | 复指数函数可视化 | 欧拉公式 e^(iθ) 的几何意义与信号处理应用 |

### 一元二次

| 文件 | 页面 | 说明 |
|------|------|------|
| `quadratic-visualization.html` | 一元二次函数、方程与不等式 | 等式性质、基本不等式、韦达定理、分式不等式、穿根法 |
| `quadratic-cases.html` | 一元二次函数应用案例 | 定价利润、抛体运动、拱桥设计、盈亏平衡、成本约束、药物浓度、污染物安全距离、材料强度、种群模型等 11 个真实案例 |

### 立体几何

| 文件 | 页面 | 说明 |
|------|------|------|
| `solid-geometry-intro.html` | 立体几何初步 | 基本立体图形、斜二测画法、表面积与体积计算器、空间点线面位置关系（含 3D 可旋转坐标系）、平行与垂直判定定理 |
| `solid-geometry.html` | 空间对象与立体几何 | 空间几何体的结构特征、直观图与三视图 |

### 解析几何

| 文件 | 页面 | 说明 |
|------|------|------|
| `line-circle.html` | 直线与圆的方程 | 直线方程、圆的方程、点线距离、线圆位置关系 |
| `conic-sections.html` | 圆锥曲线的方程 | 椭圆、双曲线、抛物线的标准方程与几何性质；直线与圆锥曲线位置关系；6 个实际应用案例的交互式动画演示（见下方详情） |

#### 圆锥曲线应用案例详情

| 案例 | 内容 | 交互控件 | 动画特征 |
|------|------|----------|----------|
| Case 1 | 行星轨道 — 开普勒第一定律 | 离心率 e | 行星沿椭圆轨道运行，太阳位于焦点 |
| Case 2 | 抛物线聚焦 — 探照灯/太阳能灶 | 模式切换、参数 p | 光线反射动画，平行光/焦点光互逆演示 |
| Case 3 | 抛体运动 | 初速度 v₀、发射角 θ、重力 g | 抛物线轨迹绘制，射程与高度实时计算 |
| Case 4 | 双曲线冷却塔 | 参数 a、b | 3D 旋转单叶双曲面，空气流动粒子动画，底部/腰部/顶部流速实时显示（基于连续性方程），文丘里效应可视化 |
| Case 5 | 卫星绕地球运动 | 轨道半径、轨道类型、离心率 | 地球渐变渲染，卫星轨道动画，速度/周期/能量实时计算（活力公式） |
| Case 6 | 航天器弹弓效应 | 行星速度、接近速度、飞越距离 | 引力助推轨迹演示，入射/出射/最终速度实时计算 |

### 统计与概率

| 文件 | 页面 | 说明 |
|------|------|------|
| `stats-visualization.html` | 计算原理与概率统计 | 蒙特卡洛模拟、概率分布、大数定律、中心极限定理、排列组合 |
| `stats-cases.html` | 高中统计实际案例 | 抽样方法、数字特征、回归分析、独立性检验、正态分布 |
| `university-science.html` | 一本院校理科就业分析 | 985/211 六大专业就业率、升学率、去向可视化 |

### 变换与信号

| 文件 | 页面 | 说明 |
|------|------|------|
| `transforms-visualization.html` | 三大变换的通信工程应用 | 傅里叶变换、拉普拉斯变换、Z变换基础可视化与频谱分析 |
| `transforms-app/` | 三大变换通信工程应用 (React SPA) | 傅里叶变换、拉普拉斯变换、Z变换在 5G OFDM、滤波器、语音处理中的动画演示 |
| `convolution-life.html` | 数学卷积人生计算器 | 用卷积模拟人生事件叠加效应，交互式人生轨迹计算器 |

### 趣味与创意

| 文件 | 页面 | 说明 |
|------|------|------|
| `trig-cases.html` | 三角函数实际案例 | 建筑测量、潮汐预测、简谐运动、卫星轨道、音频波形 |
| `ancient-scholar-ai.html` | 古代状元如何看待AI | 王安石、文天祥、苏轼、范仲淹的 AI 策论 |
| `classical-chinese/` | 文言文装叉指南 (React SPA) | 输入白话文，一键生成文言文金句，179+ 语料库 |
| `quantum-educator/` | 从量子纠缠看教育者的角色 (React SPA) | 量子物理视角下的教育隐喻 |

## 技术栈

- **图表渲染**: [ECharts](https://echarts.apache.org/) 5.5 (SVG 模式)
- **动画**: Canvas 2D (抛体运动、3D 几何投影、物理模拟、粒子系统)
- **3D 几何**: 纯 Canvas 2D 正交投影引擎，支持鼠标拖拽旋转 (立体几何模块)
- **物理模拟**: 万有引力、开普勒定律、活力公式、连续性方程、伯努利原理、引力助推速度合成
- **子项目**: React + Vite (文言文指南、量子教育者、三大变换 SPA)
- **字体**: Outfit + JetBrains Mono
- **样式**: 原生 CSS，CSS Variables 管理主题色
- **构建**: 无需构建，纯静态文件，直接部署

## 项目结构

```
trigonometry-visualization/
├── index.html                          # 导航首页
├── sets-logic.html                     # 集合与常用逻辑用语
├── solid-geometry-intro.html           # 立体几何初步 (3D 交互)
├── solid-geometry.html                 # 空间对象与立体几何
├── line-circle.html                    # 直线与圆的方程
├── conic-sections.html                 # 圆锥曲线的方程 (Canvas 交互动画, 6 个应用案例)
├── trigonometry-visualization.html     # 三角函数可视化
├── exponential-visualization.html      # 指数函数可视化
├── logarithm-visualization.html        # 对数函数可视化
├── function-properties.html            # 函数的基本性质
├── zero-point-theorem.html             # 零点存在定理
├── complex-exponential.html            # 复指数函数可视化
├── quadratic-visualization.html        # 一元二次函数、方程与不等式
├── quadratic-cases.html                # 一元二次函数应用案例
├── stats-visualization.html            # 计算原理与概率统计
├── stats-cases.html                    # 高中统计实际案例
├── university-science.html             # 一本院校理科就业分析
├── transforms-visualization.html       # 三大变换基础可视化
├── convolution-life.html               # 数学卷积人生计算器
├── trig-cases.html                     # 三角函数实际案例
├── ancient-scholar-ai.html             # 古代状元如何看待AI
├── _shared/
│   ├── fonts/                          # Outfit, JetBrainsMono
│   └── js/echarts.min.js              # ECharts 5.5.1
├── assets/                             # 各页面的图表逻辑
│   ├── charts.js                       # 三角函数
│   ├── exponential-charts.js           # 指数函数
│   ├── logarithm-charts.js             # 对数函数
│   ├── function-properties-charts.js   # 函数性质
│   ├── zero-point-charts.js            # 零点定理
│   ├── complex-exponential-charts.js   # 复指数
│   ├── quadratic-charts.js             # 一元二次
│   ├── quadratic-cases-charts.js       # 二次应用案例
│   ├── stats-charts.js                 # 概率统计
│   ├── stats-cases-charts.js           # 统计案例
│   ├── university-science-charts.js    # 就业分析
│   ├── trig-cases-charts.js            # 三角案例
│   ├── transforms-charts.js            # 变换可视化
│   ├── solid-geometry-charts.js        # 立体几何
│   ├── line-circle-charts.js           # 直线与圆
│   └── convolution-life-charts.js      # 卷积计算器
├── classical-chinese/                  # 文言文装叉指南 (React SPA)
├── quantum-educator/                   # 量子教育者 (React SPA)
└── transforms-app/                     # 三大变换演示 (React SPA)
```

## 更新日志

### v1.1.0 (2026-07-21)

- **圆锥曲线** 新增 Case 5 卫星绕地球运动：交互式轨道动画，支持圆/椭圆轨道切换，实时显示轨道速度、周期、能量（活力公式 v=√[GM(2/r−1/a)]）
- **圆锥曲线** 新增 Case 6 航天器弹弓效应：引力助推轨迹演示，入射/出射/最终速度实时计算
- **圆锥曲线** 冷却塔新增空气流动粒子动画，基于连续性方程计算底部/腰部/顶部流速，参数 a、b 对通风效果的影响可视化
- **圆锥曲线** 全部 6 个案例新增可展开"原理与公式详解"面板，包含物理原理说明和公式网格
- **圆锥曲线** 修复动画循环重复启动导致速度叠加的问题（rAF 管理）
- **立体几何初步** 修复平面相交的交线方向计算错误

### v1.0.0 (2026-07-20)

- 初始发布，包含 20 个独立页面和 3 个 React SPA 子项目
- 涵盖集合逻辑、函数方程、一元二次、立体几何、解析几何、统计概率、变换信号等模块

## 部署

整个项目是纯静态文件，可以部署到任意静态托管服务：

```bash
# GitHub Pages
# 将仓库推送到 GitHub 后，在 Settings → Pages 中选择分支即可

# 或使用任意静态服务器
npx serve .
```

## 开发

根目录下的 HTML 页面采用原生 HTML + CSS + JavaScript 开发，每个页面的图表逻辑独立存放在 `assets/` 目录下对应的 JS 文件中。修改页面内容只需编辑对应 HTML 和 JS 文件，刷新浏览器即可看到效果。

三个 React 子项目 (`classical-chinese/`、`quantum-educator/`、`transforms-app/`) 已构建为静态文件，可直接部署。