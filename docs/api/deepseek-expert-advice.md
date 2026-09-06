# DeepSeek 专家建议接口

## 服务端配置

在 Render 服务的环境变量中配置：

```text
DEEPSEEK_API_KEY=你的服务端密钥
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

密钥只在 Node 服务端读取，不放入浏览器脚本，也不提交到 GitHub。

## 页面行为

- 未配置 `DEEPSEEK_API_KEY`：智库端显示“DeepSeek 未配置”，生成按钮禁用，只展示真实数据和模型解释。
- 已配置：按钮显示“生成 DeepSeek 建议”，调用成功后显示来源、风险等级、建议时效和依据。
- DeepSeek 请求超时、返回非 2xx 或响应格式无效：服务端返回带有 `source: local-rule` 的规则建议，并在页面标明“本地专家规则”。

## 接口

```text
GET  /api/roof-risk/expert-advice/status
POST /api/roof-risk/expert-advice
```

请求必须携带智库端登录会话。前端把当前真实记录的模型结果和证据提交给服务端，示例：

```http
POST /api/roof-risk/expert-advice
Content-Type: application/json
Cookie: session=...

{
  "recordId": "TRAIN-00020000",
  "timestamp": "2026-09-02T08:00:00.000Z",
  "risk": { "level": "red", "score": 95 },
  "model": { "best_model": "xgboost", "probabilities": { "red": 0.91 } },
  "evidence": [
    { "key": "roof_separation_rate", "label": "顶板离层速率", "standardized_value": 2.8 }
  ],
  "closed_loop": { "active_step_label": "企业端现场处置" }
}
```

服务端会把这些数据作为 DeepSeek 的上下文，密钥不会下发到浏览器。接入方可先调用状态接口确认是否已配置：

```bash
curl -H "Cookie: session=..." http://localhost:8092/api/roof-risk/expert-advice/status
```

成功响应的 `source` 为 `deepseek`；未配置或 DeepSeek 调用失败时，页面继续保留本地专家规则建议，并明确标记来源。

POST 请求由前端根据当前真实记录提交 `recordId`、`timestamp`、`risk`、`model`、`evidence` 和 `closed_loop`。返回结构固定为：

```json
{
  "source": "deepseek",
  "generatedAt": "2026-09-06T12:00:00.000Z",
  "riskLevel": "重大风险",
  "summary": "...",
  "recommendations": ["..."],
  "evidence": ["..."],
  "timeHorizon": "立即执行"
}
```
