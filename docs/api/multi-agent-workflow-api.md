# 六智能体预警决策 API

## 接入说明

接口运行在现有 Render Node 服务中，沿用平台登录会话。A1不使用算法组的 `simulation-fusion-v1` 演示阈值，而是读取老师真实CSV预计算的XGBoost结果。

固定节点顺序为：

```text
A1 感知预警 → A2 知识检索 → A3 调度决策 → A5 资源评估 → A4 协同管控 → A6 反思迭代
```

## 查询状态

```http
GET /api/multi-agent/status
```

返回运行时模式、感知后端、节点顺序、人工确认边界和外部下发状态。

## 执行状态机

```http
POST /api/multi-agent/run
Content-Type: application/json

{
  "record_id": "REC-202511101149-02909",
  "resource_snapshot": {
    "personnel_available": 6,
    "support_material_sets": 12,
    "inspection_devices": 3
  }
}
```

资源快照可省略，此时使用演示默认资源。低风险记录只执行A1；资源不足时停在A5；A4始终输出 `delivery_mode: dry_run`、`external_delivery: false` 和 `dispatch_status: waiting_approval`。

响应包含：

- `workflow_run_id`：本次六智能体运行编号。
- `warning_id`：与真实记录关联的预警编号。
- `trace_id`：审计追踪编号。
- `algorithm`：XGBoost模型、真实记录号、置信度和数据哈希。
- `nodes`：六个Agent的状态、证据、摘要和结构化输出。
- `safety`：人工确认和非生产控制边界。

## 反思评估

```http
POST /api/multi-agent/reflect
Content-Type: application/json

{
  "run": { "workflow_run_id": "WF-..." },
  "feedback": {
    "monitoring_trend": "worsened",
    "execution_status": "completed"
  }
}
```

可能动作包括 `finish`、`return_to_perception`、`return_to_decision`、`return_to_resource` 和 `return_to_control`。接口只返回建议，不自动循环；非 `finish` 动作均要求操作人员确认。

## 真实性声明

- A1是现有XGBoost算法适配结果。
- A2是老师真实数据中的相似记录检索，不是事故案例因果认定。
- A3—A6是按照算法组交付状态机语义实现的Node运行时兼容层。
- A4不会向矿山设备或人员自动发送真实控制指令。
