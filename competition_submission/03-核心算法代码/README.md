# 顶板灾变算法组结果接入说明

## 1. 文件用途

本目录用于比赛提交物中的“核心算法代码”部分。当前主站已向算法组成果靠齐：`roof_risk_model.py` 按算法组给出的 XGBoost 四级预警模型接口返回结果，并把 Agent 预警闭环信息一并输出给 RoofRisk API v1。

算法组原始成果来源：

```text
D:\矿业\揭榜挂帅\揭榜挂帅
D:\矿业\agent 代码(1)\agent 代码
```

其中 `揭榜挂帅` 包提供 XGBoost / RandomForest / MOA-Transformer 训练、推理与评估结果，最佳模型为 `xgboost`；`agent 代码(1)` 包提供六 Agent 工作流、FastAPI、React 工作台和 115 项回归测试。

## 2. 当前文件

| 文件 | 说明 |
|---|---|
| `roof_risk_model.py` | 算法组 XGBoost 四级预警结果适配器 |
| `sample_input.json` | 按算法组 8 维输入特征编写的示例数据 |
| `README.md` | 算法接入说明 |

## 3. 算法组输入数据合同

| 字段 | 单位 | 说明 |
|---|---:|---|
| `roof_separation_rate` | mm/h | 顶板离层速率 |
| `bolt_axial_force_inc` | kN | 锚杆轴力增量 |
| `cable_axial_force_inc` | kN | 锚索轴力增量 |
| `support_resistance` | MPa | 支架阻力 |
| `water_inflow` | m3/h | 涌水量 |
| `microseismic_energy` | J | 微震能量 |
| `distance_to_water` | m | 距水体/岩溶体距离 |
| `data_quality` | - | 数据质量，取值如“正常 / 异常 / 缺失” |

## 4. 算法组输出数据合同

| 字段 | 说明 |
|---|---|
| `best_model` | 最佳模型，当前为 `xgboost` |
| `predicted_class` | 低风险 / 一般风险 / 较大风险 / 重大风险 |
| `warning_level` | 蓝色预警 / 黄色预警 / 橙色预警 / 红色预警 |
| `color` | blue / yellow / orange / red |
| `probabilities` | 四级风险概率 |
| `max_probability` | 最大类别概率，即模型置信度 |
| `risk_score` | 平台展示用综合风险分值，由算法等级概率映射 |
| `agent_workflow` | A1-A6 Agent 预警闭环摘要 |
| `actions` | 处置建议 |

## 5. 已接入主站的方式

```text
算法组 XGBoost 四级预警结果
-> roof_risk_model.py 适配器
-> tools/roof-risk-bridge.py
-> RoofRisk API v1
-> 企业端 / 监管端 / 智库端同步展示
```

主站页面中的“模型服务接口”会显示 XGBoost 模型名称、预测类别、模型准确率、四级概率和 Agent 预警链路。

## 6. 示例运行

```powershell
cd D:\矿业\smart-mine-publish\competition_submission\03-核心算法代码
python roof_risk_model.py
```

运行后会输出算法组 8 维特征、四级风险概率、重大风险/红色预警结果、综合展示分值、处置建议和 Agent 工作流摘要。

## 7. 算法组性能指标

来自 `D:\矿业\揭榜挂帅\揭榜挂帅\metrics.json`：

| 模型 | Accuracy | Macro F1 | Weighted F1 | OVR ROC-AUC |
|---|---:|---:|---:|---:|
| XGBoost | 0.99325 | 0.99101 | 0.99325 | 0.99994 |
| RandomForest | 0.99325 | 0.99081 | 0.99325 | 0.99995 |
| MOA-Transformer | 0.98789 | 0.97942 | 0.98790 | 0.99986 |

当前主站采用算法组标注的最佳模型 `xgboost` 作为展示和接口口径。
