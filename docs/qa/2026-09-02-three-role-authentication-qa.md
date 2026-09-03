# 三角色认证验收记录

验收日期：2026-09-02

## 自动化结果

- 认证、HTTP、登录页、前端角色映射、真实 RoofRisk 数据仓库与视图模型聚焦测试：35/35 通过。
- 完整 `node --test`：60 项中 54 项通过；6 项失败均来自既有 `tests/mine-v2-config.test.mjs` 配置漂移，与认证改动无关。
- 未登录访问 `/` 会跳转 `/login`；未登录访问 `/api/roof-risk/*` 返回 `401 AUTH_REQUIRED`。
- 企业端允许 `advance/reset`，监管端允许 `advance/archive`，智库端三项闭环操作均返回 `403 FORBIDDEN`。
- `X-Forwarded-Proto: https` 登录响应的会话 Cookie 包含 `Secure`。

## 浏览器验收

- 桌面登录页：井下场景静帧、系统标题、表单、密码显隐、焦点与退出流程正常，无控制台 error/warning。
- 企业端：冲突的 `portal=expert` 自动改写为 `portal=enterprise`，企业身份与操作权限正确。
- 监管端：自动进入 `portal=regulator`，仅监管推进与归档按钮可见。
- 智库端：自动进入 `portal=expert`，闭环写操作全部不可见且禁用。
- 390x844：登录页实际 `scrollWidth=390`、`scrollHeight=844`；三端页均无横向溢出，标题、身份栏和主内容不重叠。
- 企业端三维画布截图为 719x604；抽样得到 15,471 种颜色、32,756 个非暗像素，画布非空且井下场景构图正常。
