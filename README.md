# 煤矿顶板灾变智能预警与可视化决策系统

本项目面向“基于数字孪生的煤矿顶板灾变智能预警与可视化决策系统”比赛题目，提供本地运行的三维数字孪生展示平台、三端协同管控页面和 RoofRisk API v1 多源风险接口原型。

当前版本已完整接入老师提供的 20,000 行真实监测 CSV 和现有 XGBoost 模型。构建期 Python 工具执行源文件校验、按设备时间切段、卡尔曼平滑、标准化、数据质量编码与 XGBoost 推理，生成确定性 JSON；运行期仍由单一 Node 服务向企业端、监管端和智库端提供 RoofRisk API v1。

## 主要功能

- 三维数字孪生：基于 Three.js 展示井下巷道、工作面、设备、风险场和灾变过程。
- 顶板风险场：支持应力场、位移场和综合风险场切换。
- 六阶段灾变演示：覆盖正常监测、应力集中、离层扩展、支护异常、垮落预警、应急处置。
- 三端协同闭环：企业端负责现场监测与处置，监管端负责区域态势和闭环督办，智库端负责模型解释和复盘。
- 统一接口：RoofRisk API v1 统一真实输入、四级概率、综合风险、特征证据、预警事件和闭环状态。
- 模型审计：智库端并列展示真实标签、XGBoost 预测、置信度、模型准确率、记录号与数据哈希。

## 真实数据与模型血缘

- 规范化数据：`data/teacher_roof_monitoring.csv`
- SHA-256：`86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`
- 规模：20,000 行、11 列
- 类别：低风险 7,432；一般风险 9,830；较大风险 2,071；重大风险 667
- 生成数据：`data/roof-risk-dataset.json`
- 模型：XGBoost，独立测试准确率 99.325%，全量回放一致率 99.665%

七项数值输入为顶板离层速率、锚杆轴力增量、锚索轴力增量、支架阻力、涌水量、微震能量、距水体/岩溶体距离，另含数据质量类别，共八项模型输入。界面展示原始测量值，模型推理使用卡尔曼平滑后的 `model_values`。

重新构建数据集：

```powershell
& '.\.venv-data\Scripts\python.exe' tools/data_integration/build_roof_risk_dataset.py `
  --csv data/teacher_roof_monitoring.csv `
  --model-dir ..\项目总代码交付\integrations\algorithm `
  --output data/roof-risk-dataset.json `
  --built-at '2026-09-02T13:00:00+08:00'
```

## 本地运行

```powershell
cd D:\矿业\smart-mine-v2-balanced
$env:PORT="8092"
npm start
```

浏览器打开：

```text
http://localhost:8092/
```

未登录时会跳转到统一登录页：

```text
http://localhost:8092/login
```

## 三端账号与权限

登录页不提供角色选择。账号验证成功后，系统按账号角色自动进入企业端、监管端或智库端，并覆盖 URL 中冲突的 `portal` 参数。

| 账号 | 初始密码 | 角色 | 显示名称 |
|---|---|---|---|
| `enterprise_operator` | `Mine@2026` | 企业端 | 企业端操作员 |
| `regulator_officer` | `Safe@2026` | 监管端 | 监管端监管员 |
| `expert_analyst` | `Model@2026` | 智库端 | 智库端专家 |

| 闭环操作 | 企业端 | 监管端 | 智库端 |
|---|---:|---:|---:|
| 推进 `advance` | 允许 | 允许 | 禁止 |
| 归档 `archive` | 禁止 | 允许 | 禁止 |
| 重置 `reset` | 允许 | 禁止 | 禁止 |

所有角色均可读取 RoofRisk 数据和选择四级代表事件。后端会再次校验闭环操作权限，不能通过修改前端或直接调用 API 越权。

会话使用 256 位随机令牌并保存在进程内存中，绝对有效期为 8 小时；服务重启会使当前会话失效。Cookie 名为 `roofrisk_session`，属性为 `HttpOnly`、`SameSite=Strict`、`Path=/` 和 `Max-Age=28800`，HTTPS 环境额外启用 `Secure`。同一用户名与客户端在 15 分钟内连续失败 5 次后返回 `429`。

初始密码只以 scrypt 哈希形式保存在代码中。生产部署可用以下变量覆盖，格式必须是 `scrypt$16384$8$1$<salt-hex>$<64-byte-derived-key-hex>`：

```text
ROOFRISK_ENTERPRISE_PASSWORD_HASH
ROOFRISK_REGULATOR_PASSWORD_HASH
ROOFRISK_EXPERT_PASSWORD_HASH
```

## RoofRisk API v1

平台内置接口：

```text
GET  /api/roof-risk/current
GET  /api/roof-risk/history
GET  /api/roof-risk/explain
POST /api/roof-risk/evaluate  # body: { "record_id": "REC-..." }
GET  /api/roof-risk/events
POST /api/roof-risk/select
POST /api/roof-risk/closed-loop/advance
```

所有 `/api/roof-risk/*` 接口都要求有效登录会话。认证接口为：

```text
POST /api/auth/login
GET  /api/auth/session
POST /api/auth/logout
```

接口文档见：

```text
docs/api/roof-risk-api-v1.md
```

当前数据链路：

```text
老师真实 CSV
-> 构建期卡尔曼预处理 + XGBoost 推理
-> data/roof-risk-dataset.json
-> RoofRisk API v1 标准 JSON
-> 三维孪生展示 / 企业端 / 监管端 / 智库端
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
- HTML / CSS / JavaScript

## 云端部署

项目支持 Vercel + Render + Supabase 联动，不需要自定义域名。Vercel 提供 `*.vercel.app` 地址，Render 提供 `*.onrender.com` 地址。

- Vercel：托管静态前端，并通过 `vercel.json` 代理 `/api/*`。
- Render：运行 Node API、权限校验和 RoofRisk 业务服务。
- Supabase：执行 `supabase/migrations/202609030001_rbac_foundation.sql`，保存用户角色、权限、审计和闭环状态。

部署前复制 `.env.example` 配置 Render 环境变量。`SUPABASE_SERVICE_ROLE_KEY` 只能放在 Render，不能提交到 Git 或暴露给浏览器。Vercel 配置中的 Render 地址部署后需替换为实际服务地址。

Render 健康检查地址为 `/healthz`。当前真实 CSV/XGBoost 构建产物仍由 Render 读取；第一阶段只迁移身份、权限、审计和闭环状态。

启用 `AUTH_PROVIDER=supabase` 后，超级管理员访问 `/admin`。在管理中心可以创建账户、分配企业端/监管端/智库端/只读角色、停用账户并查看审计日志。Supabase SQL 编辑器执行迁移后，需先在 Supabase Auth 中创建一个用户，再在 `profiles` 和 `user_roles` 表将其角色设为 `super_admin`；管理员创建的新账户会自动写入这两张表。`SUPABASE_SERVICE_ROLE_KEY` 仅配置在 Render。
