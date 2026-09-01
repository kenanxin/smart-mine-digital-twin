# RoofRisk API v1 多源顶板风险接口标准

## 1. 设计目标

本接口标准用于统一顶板灾变智能预警平台中的多源监测数据、模型输出、风险解释和处置闭环数据。当前演示环境使用标准化模拟数据，真实传感器、数据库或算法组模型服务只要按本文档字段输出，即可替换模拟数据源。

## 2. 接口列表

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/roof-risk/current` | 查询当前工作面最新多源指标、综合风险和处置状态 |
| GET | `/api/roof-risk/history` | 查询当前事件或工作面的风险趋势 |
| GET | `/api/roof-risk/explain` | 查询模型贡献因子、判别依据和处置建议 |
| POST | `/api/roof-risk/evaluate` | 接收多源指标并返回模型评估结果 |
| GET | `/api/roof-risk/events` | 查询预警事件和闭环状态列表 |
| POST | `/api/roof-risk/select` | 切换三端共享的当前预警事件 |
| POST | `/api/roof-risk/closed-loop/advance` | 推进当前事件的闭环处置状态 |

## 3. 当前风险接口

### 3.1 请求

```http
GET /api/roof-risk/current
```

### 3.2 返回示例

```json
{
  "api_version": "RoofRisk API v1",
  "data_source": "standardized_simulated_multisource",
  "mine_id": "M01",
  "mine_name": "示范矿井",
  "face_id": "1206",
  "event_id": "EVT-1206-20260822-001",
  "timestamp": "2026-08-22 09:30:00",
  "metrics": {
    "roof_stress": { "value": 33.0, "unit": "MPa", "status": "warning" },
    "separation": { "value": 40.0, "unit": "mm", "status": "danger" },
    "subsidence": { "value": 31.2, "unit": "mm", "status": "warning" },
    "support_resistance": { "value": 11800, "unit": "kN", "status": "danger" },
    "anchor_load": { "value": 186, "unit": "kN", "status": "warning" },
    "microseismic_energy": { "value": 1850, "unit": "J", "status": "danger" },
    "water_inflow": { "value": 36.0, "unit": "m3/h", "status": "warning" },
    "distance_to_water": { "value": 18.0, "unit": "m", "status": "danger" },
    "data_quality": { "value": "正常", "unit": "", "status": "safe" }
  },
  "risk": {
    "score": 89.26,
    "level": "red",
    "stage": "顶板垮落预警",
    "trigger": ["separation", "support_resistance", "microseismic_energy"],
    "explanation": "离层量、支架阻力和微震能量多源耦合异常，应力场与位移场热点在工作面出口叠加。",
    "contribution": {
      "stress": 0.2053,
      "displacement": 0.3762,
      "support": 0.2815,
      "microseismic": 0.137
    }
  },
  "disposal": {
    "status": "processing",
    "actions": ["立即停机", "人员撤离", "封控出口", "补强支护"],
    "closed_loop_rate": 0.83
  },
  "algorithm": {
    "source": "local_python_bridge",
    "source_label": "算法组 XGBoost 预警模型",
    "model_path": "competition_submission/03-核心算法代码/roof_risk_model.py",
    "best_model": "xgboost",
    "model_family": "XGBoost 顶板灾变四级预警模型",
    "model_accuracy": 0.99325,
    "predicted_class": "重大风险",
    "warning_level": "红色预警 (紧急撤离)",
    "max_probability": 0.999017,
    "probabilities": {
      "低风险": 0.000044,
      "一般风险": 0.000078,
      "较大风险": 0.000861,
      "重大风险": 0.999017
    },
    "risk_score": 89.26,
    "risk_level": "red",
    "stage": "顶板垮落预警",
    "agent_workflow": [
      { "agent_id": "A1", "name": "感知预警 Agent", "status": "success" },
      { "agent_id": "A2", "name": "知识检索 Agent", "status": "success" },
      { "agent_id": "A3", "name": "调度决策 Agent", "status": "success" },
      { "agent_id": "A5", "name": "资源评估 Agent", "status": "success" },
      { "agent_id": "A4", "name": "协同管控 Agent", "status": "waiting_human" },
      { "agent_id": "A6", "name": "反思迭代 Agent", "status": "partial" }
    ],
    "actions": ["立即停机撤人", "封控高风险区域", "执行补强支护和持续监测"]
  }
}
```

## 4. 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| api_version | string | 接口版本 |
| data_source | string | 数据来源，演示环境为标准化模拟多源数据 |
| mine_id | string | 矿井编号 |
| face_id | string | 工作面或巷道编号 |
| event_id | string | 预警事件编号，三端共享同一事件 |
| timestamp | string | 数据时间 |
| metrics.roof_stress | object | 顶板应力，单位 MPa |
| metrics.separation | object | 顶板离层量，单位 mm |
| metrics.subsidence | object | 顶板下沉量，单位 mm |
| metrics.support_resistance | object | 支架工作阻力，单位 kN |
| metrics.anchor_load | object | 锚索载荷，单位 kN |
| metrics.microseismic_energy | object | 微震能量，单位 J |
| metrics.water_inflow | object | 涌水量，单位 m3/h |
| metrics.distance_to_water | object | 距水体/岩溶体距离，单位 m |
| metrics.data_quality | object | 数据质量标记 |
| risk.score | number | 综合风险分值，范围 0-100 |
| risk.level | string | 风险等级：green、attention、yellow、orange、red |
| risk.stage | string | 灾变阶段 |
| risk.trigger | array | 触发指标 |
| risk.explanation | string | 判别依据 |
| risk.contribution | object | 模型贡献因子 |
| disposal.status | string | 处置状态：pending、confirmed、processing、closed |
| disposal.actions | array | 推荐处置动作 |
| disposal.closed_loop_rate | number | 闭环率 |
| algorithm.source | string | 算法来源标识 |
| algorithm.source_label | string | 页面展示用算法来源 |
| algorithm.model_path | string | 实际调用的算法文件 |
| algorithm.best_model | string | 算法组最佳模型，当前为 xgboost |
| algorithm.model_family | string | 模型族名称 |
| algorithm.model_accuracy | number | 算法组离线评估准确率 |
| algorithm.predicted_class | string | 算法组四级风险分类结果 |
| algorithm.warning_level | string | 算法组预警等级 |
| algorithm.max_probability | number | 最大类别概率，即模型置信度 |
| algorithm.probabilities | object | 四级风险概率 |
| algorithm.input_features | object | 算法组 8 维输入特征 |
| algorithm.agent_workflow | array | 六 Agent 预警闭环执行摘要 |
| algorithm.risk_score | number | 算法输出风险分值 |
| algorithm.risk_level | string | 算法输出风险等级 |
| algorithm.stage | string | 算法输出阶段 |

## 5. 事件状态中心与闭环接口

### 5.1 事件列表

```http
GET /api/roof-risk/events
```

返回字段包含 `selected_event_id` 和 `events`。监管端事件队列读取该接口；`selected_event_id` 表示当前三端共享事件。

### 5.2 切换当前事件

```http
POST /api/roof-risk/select
Content-Type: application/json

{ "event_id": "EVT-QL303-20260822-002" }
```

切换后，`/api/roof-risk/current`、`/api/roof-risk/explain`、监管端闭环卡片和智库端复盘摘要均围绕同一事件返回，避免三端页面各自维护独立状态。

### 5.3 推进闭环状态

```http
POST /api/roof-risk/closed-loop/advance
Content-Type: application/json

{ "action": "advance" }
```

`action` 可取：

| action | 说明 |
|---|---|
| `advance` | 当前事件进入下一闭环阶段 |
| `archive` | 当前事件直接闭环归档 |
| `reset` | 演示环境重置为主预警事件初始状态 |

## 6. 真实数据接入约定

真实数据接入时，传感器、数据库、CSV/Excel 文件或队友算法服务均可作为上游，只需转换为本文档字段即可。平台展示层不关心数据来自模拟器、数据库还是硬件，只读取统一 JSON。

建议接入路径：

```text
传感器/数据库/CSV/算法服务
-> 数据适配器
-> RoofRisk API v1 标准 JSON
-> 三维孪生展示 / 三端管控 / 报告截图
```

## 7. 与辅助接口原型的关系

辅助接口原型 `D:\矿业\roof-warning-demo` 已提供 `/api/data`、数据源适配和事件记录能力。`RoofRisk API v1` 是面向最终三端平台的统一字段标准，可兼容 `stress`、`displacement`、`support_pressure`、`risk_score`、`trend`、`risk_message` 等历史字段，并扩展锚索、微震、事件闭环和模型解释字段。
