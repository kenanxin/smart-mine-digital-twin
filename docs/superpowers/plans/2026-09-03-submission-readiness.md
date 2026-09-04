# 项目审查交付加固实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 形成与生产系统一致、可自动验证并具备离线兜底的教师审查提交物。

**Architecture:** 保持现有 Vercel + Render + Supabase 架构不变。文档由仓库事实生成，预检脚本负责静态、测试和线上检查，打包脚本只复制明确白名单内的交付文件。

**Tech Stack:** Node.js 18+、PowerShell、python-docx、LibreOffice、Vercel、Render、Supabase。

## Global Constraints

- 不提交生产密码、API 密钥、令牌或 `.env` 文件。
- 不修改现有业务行为和生产数据。
- 保留老师提供的原始 CSV 与当前 XGBoost 构建产物。
- 最终 DOCX 必须逐页渲染并完成视觉检查。

---

### Task 1: 统一交付口径

**Files:**
- Modify: `README.md`
- Modify: `competition_submission/提交物清单.md`
- Modify: `competition_submission/当前完成度与收尾说明.md`
- Modify: `competition_submission/04-运行说明/运行环境说明.md`
- Modify: `competition_submission/05-演示视频录制说明.md`

**Interfaces:**
- Consumes: 当前生产地址、角色矩阵和真实数据摘要。
- Produces: 可供报告和演示使用的统一事实口径。

- [x] 替换旧本地账户、三端限定和未接数据库描述。
- [x] 增加生产入口、Supabase RBAC、超级管理员、只读端和离线兜底说明。
- [x] 扫描密码、密钥、占位语和相互矛盾描述。

### Task 2: 教师审查指南与演示脚本

**Files:**
- Create: `competition_submission/00-教师审查快速指南.md`
- Create: `competition_submission/05-现场演示脚本.md`

**Interfaces:**
- Consumes: Task 1 的统一口径。
- Produces: 五分钟审查路径和故障恢复步骤。

- [x] 编写入口、角色、检查重点和技术答辩口径。
- [x] 编写逐分钟演示脚本与切换顺序。
- [x] 明确密码采用现场私密账户卡，不进入仓库。

### Task 3: 自动预检与安全打包

**Files:**
- Create: `tools/submission-preflight.mjs`
- Create: `tools/build-submission-package.ps1`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run preflight` 和白名单式 ZIP 构建命令。

- [x] 编写必需文件、数据摘要、敏感信息和线上状态检查。
- [x] 编写只复制提交白名单的 PowerShell 打包脚本。
- [x] 添加测试并运行完整 Node 测试与预检。

### Task 4: 更新正式 Word 报告

**Files:**
- Modify: `tools/report_build/build_competition_reports.py`
- Modify: `competition_submission/01-总体技术方案报告.docx`
- Modify: `competition_submission/02-平台系统设计与智能预警模型研究报告.docx`

**Interfaces:**
- Consumes: 已验证的 Markdown 事实和现有图像素材。
- Produces: 与生产系统一致的两份正式报告。

- [x] 更新部署架构、Supabase 数据持久化、五角色权限和真实模型指标。
- [x] 使用工作区 Python 重新生成两份 DOCX。
- [x] 完成标题、图片、表格和可访问性结构审计；当前机器未安装 LibreOffice，PNG 视觉渲染不可用。

### Task 5: 最终验证与提交包

**Files:**
- Create: `competition_submission/submission-package.zip`

**Interfaces:**
- Consumes: Task 1-4 的最终文件。
- Produces: 可独立交付的压缩包和验证记录。

- [x] 运行完整测试、预检和敏感信息扫描。
- [x] 构建并以 ZIP 目录读取方式抽查结构。
- [x] 清理渲染目录和构建缓存，仅保留正式交付物。
