# Render 线上部署验收记录

## 验收对象

- 项目：煤矿顶板灾变智能预警与可视化决策系统
- 线上地址：`https://smart-mine-v2-balanced.onrender.com/`
- Render 服务：`smart-mine-v2-balanced`
- GitHub 仓库：`kenanxin/smart-mine-digital-twin`
- 验收提交：GitHub `main` 最新终版提交
- 验收时间：2026-09-01

## 部署状态

- Render 已手动部署 GitHub `main` 最新终版提交。
- 构建状态：Deploy succeeded / Live。
- 启动命令：`npm start`。
- 服务日志显示 Node 服务已监听 Render 分配端口。

## 接口验收

线上接口：

```text
GET https://smart-mine-v2-balanced.onrender.com/api/roof-risk/current
```

关键返回：

```text
risk.score = 89.26
risk.level = red
risk.stage = 顶板垮落预警
algorithm.source_label = 算法组 XGBoost 预警模型
algorithm.predicted_class = 重大风险
algorithm.max_probability = 0.999017
algorithm.model_path = competition_submission/03-核心算法代码/roof_risk_model.py
```

结论：线上接口已接入算法组 XGBoost 四级预警结果，企业端、监管端、智库端读取同一 RoofRisk API v1 数据。

## 页面验收

| 页面 | 验收结果 |
|---|---|
| 企业端 | 中央综合风险指数、右侧顶板风险态势、智能决策建议均显示 `89.26`，旧值 `92` 已消失。 |
| 监管端 | 区域矿井风险总览显示 6 座矿井，第一条事件显示 `红色预警 · 89.26`。 |
| 智库端 | 显示 `接口在线 · 算法已接入`、`算法来源 XGBoost 顶板灾变四级预警模型`、四级概率、Agent 链路，模型解释和复盘摘要使用 `89.26`。 |

## 截图留档

| 页面 | 截图 |
|---|---|
| 企业端 | `docs/qa/render-online-screenshots/enterprise-render-online.png` |
| 监管端 | `docs/qa/render-online-screenshots/regulator-render-online.png` |
| 智库端 | `docs/qa/render-online-screenshots/expert-render-online.png` |

## 注意事项

- Render 免费实例休眠后首次访问可能较慢，属于平台限制。
- 若浏览器仍显示旧值，可使用带版本参数的入口，例如：

```text
https://smart-mine-v2-balanced.onrender.com/?scene=v2&view=underground&field=risk&portal=enterprise&rev=20260901-final
```

## 结论

线上部署已满足比赛演示要求，可进入最终录屏和提交包检查阶段。
