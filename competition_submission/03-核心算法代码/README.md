# 顶板灾变风险算法接入说明

## 1. 文件用途

本目录用于比赛提交物中的“核心算法代码”部分。当前版本提供平台联调用算法示例，用于说明输入字段、输出字段、综合风险分值、风险等级、指标贡献和处置建议。

真实算法由组内算法负责人补充或替换。替换时建议保持本文定义的输入输出字段，并通过 RoofRisk API v1 接入三端平台。

## 2. 当前文件

| 文件 | 说明 |
|---|---|
| `roof_risk_model.py` | 平台联调用算法示例 |
| `sample_input.json` | 示例输入数据 |
| `README.md` | 算法接入说明 |

## 3. 输入数据合同

算法接收标准化多源监测数据：

| 字段 | 单位 | 说明 |
|---|---:|---|
| roof_stress | MPa | 顶板应力 |
| separation | mm | 顶板离层量 |
| subsidence | mm | 顶板下沉量 |
| support_resistance | kN | 液压支架工作阻力 |
| anchor_load | kN | 锚杆锚索受力 |
| microseismic_energy | J | 微震能量 |
| stress_growth_rate | MPa/min | 应力增长率 |
| displacement_growth_rate | mm/min | 位移增长率 |
| spatial_coupling_index | 0-1 | 邻近测点联动指数 |

## 4. 输出数据合同

| 字段 | 说明 |
|---|---|
| risk_score | 0-100 综合风险分值 |
| risk_level | green / attention / yellow / orange / red |
| stage | 顶板灾变阶段 |
| contribution | 各类指标贡献度 |
| explanation | 判别依据说明 |
| actions | 处置建议 |

## 5. 接入方式

推荐路径：

```text
真实算法模型
-> 输出标准风险结果
-> RoofRisk API v1
-> 企业端 / 监管端 / 智库端同步展示
```

平台展示层不依赖具体算法实现，只依赖统一 JSON 字段。因此后续可以把当前示例替换为机器学习模型、规则融合模型、时序预测模型或外部模型服务。

## 6. 示例运行

```powershell
cd D:\矿业\smart-mine-publish\competition_submission\03-核心算法代码
python roof_risk_model.py
```

运行后会输出一组示例监测数据的综合风险分值、风险等级、灾变阶段、贡献因子和处置建议。

## 7. 正式提交前建议补充

由算法负责人补充：

- 真实模型名称和方法路线。
- 特征构造和参数说明。
- 训练或验证数据来源。
- 准确率、召回率、误报率、响应时间等指标。
- 与 RoofRisk API v1 的字段映射说明。
