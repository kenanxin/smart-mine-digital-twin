# 煤矿顶板灾变智能预警与可视化决策系统

本项目面向“基于数字孪生的煤矿顶板灾变智能预警与可视化决策系统”比赛题目，提供本地运行的三维数字孪生展示平台、三端协同管控页面和 RoofRisk API v1 多源风险接口。

当前版本采用标准化模拟多源数据驱动平台展示，并通过 `tools/roof-risk-bridge.py` 调用 `competition_submission/03-核心算法代码/roof_risk_model.py`，把算法输出的风险分值、等级、阶段、贡献因子和处置建议接入企业端、监管端和智库端。

## 主要功能

- 三维数字孪生：基于 Three.js 展示井下巷道、工作面、设备、风险场和灾变过程。
- 顶板风险场：支持应力场、位移场和综合风险场切换。
- 六阶段灾变演示：覆盖正常监测、应力集中、离层扩展、支护异常、垮落预警、应急处置。
- 三端协同闭环：企业端负责现场监测与处置，监管端负责区域态势和闭环督办，智库端负责模型解释和复盘。
- 统一接口：RoofRisk API v1 统一多源指标、综合风险、模型解释、预警事件和闭环状态。
- 算法桥接：内置平台联调用算法示例，并通过 RoofRisk API v1 接入三端页面；真实算法可按相同输入输出合同替换。

## 本地运行

```powershell
cd D:\矿业\smart-mine-publish
$env:PORT="8092"
node server.js
```

浏览器打开：

```text
http://localhost:8092/
```

默认进入企业端井下综合风险场：

```text
http://localhost:8092/?scene=v2&view=underground&field=risk&portal=enterprise
```

## 三端入口

```text
企业端：http://localhost:8092/?scene=v2&view=underground&field=risk&portal=enterprise
监管端：http://localhost:8092/?scene=v2&view=underground&field=risk&portal=regulator
智库端：http://localhost:8092/?scene=v2&view=underground&field=risk&portal=expert
```

## RoofRisk API v1

平台内置接口：

```text
GET  /api/roof-risk/current
GET  /api/roof-risk/history
GET  /api/roof-risk/explain
POST /api/roof-risk/evaluate
GET  /api/roof-risk/events
POST /api/roof-risk/select
POST /api/roof-risk/closed-loop/advance
```

接口文档见：

```text
docs/api/roof-risk-api-v1.md
```

真实数据接入建议路径：

```text
传感器 / 数据库 / CSV / 算法服务
-> 数据适配器
-> RoofRisk API v1 标准 JSON
-> 三维孪生展示 / 三端管控 / 报告截图
```

## 比赛提交资料

提交资料目录：

```text
competition_submission
```

已包含：

- `01-总体技术方案报告.docx`
- `02-平台系统设计与智能预警模型研究报告.docx`
- `03-核心算法代码`
- `04-运行说明`
- `05-演示视频录制说明.md`
- `提交物清单.md`
- `当前完成度与收尾说明.md`

## 技术栈

- Three.js
- ECharts
- Node.js
- Python
- HTML / CSS / JavaScript
