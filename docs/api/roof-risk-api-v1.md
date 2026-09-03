# RoofRisk API v1 真实顶板风险接口

## 1. 数据与运行架构

当前数据源为老师提供的真实监测 CSV，标识固定为 `teacher_real_csv_xgboost`。规范化文件 `data/teacher_roof_monitoring.csv` 包含 20,000 行、11 列，SHA-256 为 `86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`。

Python 仅用于发布前构建：按设备和时间排序、以 600 秒间隔切段、执行卡尔曼平滑和标准化，再运行现有 XGBoost 模型。结果写入 `data/roof-risk-dataset.json`。生产运行时只需 Node，不调用 Python，也不重新推理。

```text
teacher_roof_monitoring.csv
-> 构建期预处理与 XGBoost
-> roof-risk-dataset.json
-> Node RoofRisk API v1
-> 企业端 / 监管端 / 智库端
```

## 2. 登录与权限

所有 `/api/roof-risk/*` 请求都必须携带登录接口签发的 `roofrisk_session` Cookie。未登录或会话过期返回：

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "请先登录"
  }
}
```

响应状态为 `401`。闭环动作还会按账号角色校验，越权返回 `403 FORBIDDEN`。

| 闭环动作 | 企业端 | 监管端 | 智库端 |
|---|---:|---:|---:|
| `advance` | 允许 | 允许 | 禁止 |
| `archive` | 禁止 | 允许 | 禁止 |
| `reset` | 允许 | 禁止 | 禁止 |

所有角色均可使用读取、事件选择和按记录查询接口。

## 3. 接口列表

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/roof-risk/current` | 当前真实记录、模型输出和闭环状态 |
| GET | `/api/roof-risk/history` | 当前代表记录的 24 点时间窗口 |
| GET | `/api/roof-risk/explain` | 四级概率、标签审计与三项特征证据 |
| POST | `/api/roof-risk/evaluate` | 按 `record_id` 查询预计算模型结果 |
| GET | `/api/roof-risk/events` | 四个风险等级的代表事件 |
| POST | `/api/roof-risk/select` | 切换三端共享的当前事件 |
| POST | `/api/roof-risk/closed-loop/advance` | 推进当前事件闭环状态 |

## 4. 当前风险

```http
GET /api/roof-risk/current
```

关键返回结构：

```json
{
  "api_version": "RoofRisk API v1",
  "data_source": "teacher_real_csv_xgboost",
  "event_id": "REAL-SEVERE-001",
  "face_id": "监测1",
  "timestamp": "2025/11/8 14:22",
  "metrics": {
    "roof_separation_rate": {"value": 4.24, "model_value": 4.24, "unit": "mm/d", "status": "safe"},
    "bolt_axial_force_increment": {"value": 8.1, "model_value": 8.1, "unit": "kN", "status": "safe"},
    "cable_axial_force_increment": {"value": 8.33, "model_value": 8.33, "unit": "kN", "status": "safe"},
    "support_resistance": {"value": 0.77, "model_value": 0.77, "unit": "MPa", "status": "safe"},
    "water_inflow": {"value": 50.43, "model_value": 50.43, "unit": "m3/h", "status": "warning"},
    "microseismic_energy": {"value": 549.77, "model_value": 549.77, "unit": "J", "status": "warning"},
    "distance_to_water": {"value": -103.11, "model_value": -103.11, "unit": "m", "status": "danger"},
    "data_quality": {"value": "正常", "unit": null, "status": "safe"}
  },
  "model_output": {
    "best_model": "xgboost",
    "model_accuracy": 0.99325,
    "probabilities": {"low": 0.00002, "general": 0.00001, "major": 0.00008, "severe": 0.99989},
    "confidence": 0.99989295,
    "true_class": "重大风险",
    "predicted_class": "重大风险",
    "matches_label": true,
    "record_id": "REC-202511081422-01751"
  },
  "feature_evidence": [
    {"key": "distance_to_water", "label": "距水体/岩溶体距离", "standardized_value": -3.2, "contribution": 0.41}
  ],
  "provenance": {
    "source_name": "teacher_roof_monitoring.csv",
    "source_sha256": "86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A",
    "source_row_count": 20000,
    "original_timestamp": "2025/11/8 14:22",
    "device_id": "监测1",
    "record_id": "REC-202511081422-01751"
  }
}
```

`value` 是界面展示的原始测量值，`model_value` 是卡尔曼平滑后进入模型的值。`feature_evidence` 是标准化特征绝对值排序，不等同于 SHAP。

## 5. 八项输入

| key | 中文名称 | 单位 |
|---|---|---|
| `roof_separation_rate` | 顶板离层速率 | mm/d |
| `bolt_axial_force_increment` | 锚杆轴力增量 | kN |
| `cable_axial_force_increment` | 锚索轴力增量 | kN |
| `support_resistance` | 支架阻力 | MPa |
| `water_inflow` | 涌水量 | m3/h |
| `microseismic_energy` | 微震能量 | J |
| `distance_to_water` | 距水体/岩溶体距离 | m |
| `data_quality` | 数据质量 | 无 |

概率键 `low`、`general`、`major`、`severe` 分别对应低风险、一般风险、较大风险、重大风险。

## 6. 按记录查询

```http
POST /api/roof-risk/evaluate
Content-Type: application/json

{"record_id":"REC-202511081422-01751"}
```

该接口不接收任意传感器数值，也不在 Node 进程中重新运行模型。它按稳定 `record_id` 返回构建期已计算的真实输入、概率、标签审计、特征证据与来源信息。缺少 `record_id` 返回 400，记录不存在返回 404。

## 7. 事件与闭环

四个稳定事件分别为 `REAL-LOW-001`、`REAL-GENERAL-001`、`REAL-MAJOR-001`、`REAL-SEVERE-001`。服务默认选中重大风险代表事件。

```http
POST /api/roof-risk/select
Content-Type: application/json

{"event_id":"REAL-MAJOR-001"}
```

切换后 `/current`、`/history`、`/explain` 和三端页面共同指向同一真实记录。

```http
POST /api/roof-risk/closed-loop/advance
Content-Type: application/json

{"action":"advance"}
```

`action` 可为 `advance`、`archive` 或 `reset`。闭环状态单独保存在内存中，推进闭环不会修改原始测量、模型输出或 `record_id`。

## 8. 错误与前端约定

参数错误和未找到错误返回结构化 JSON：

```json
{"error":{"code":"RECORD_NOT_FOUND","message":"Record not found: missing","record_id":"missing"}}
```

前端请求失败时显示“真实数据接口暂不可用”和 `--`，不会回退到模拟数值。六阶段灾变演示是独立的确定性演示模式，结束或复位后会重新读取当前选中的真实事件。
