# 三端 UI 与 ECharts 最终验收

## 验收范围

- 企业端：真实指标刻度轨、Three.js 井下场景、风险与闭环行动轨、P95 阈值趋势、来源追溯。
- 监管端：四级事件分布、优先队列、选中事件证据、督办动作、闭环链路。
- 智库端：八项输入、四级概率、标准化偏离、真实历史对比、判别依据与来源追溯。

## 自动化结果

执行：

```powershell
node tools/capture-three-portal-ui-qa.cjs http://127.0.0.1:8517 tools/.generated/three-portal-ui-release
```

结果：`6/6 PASS`，覆盖企业、监管、智库三端的 `1440x900` 与 `390x844` 视口。

| 角色 | 视口宽度 | 图表容器缩放 | 横向溢出 | 页面/网络错误 |
| --- | ---: | --- | ---: | ---: |
| 企业端 | 1440 | 通过 | 0 px | 0 |
| 企业端 | 390 | 通过 | 0 px | 0 |
| 监管端 | 1440 | 通过 | 0 px | 0 |
| 监管端 | 390 | 通过 | 0 px | 0 |
| 智库端 | 1440 | 通过 | 0 px | 0 |
| 智库端 | 390 | 通过 | 0 px | 0 |

Three.js 场景像素检查：

- 桌面 RGB 标准差：`36.37 / 33.15 / 29.27`。
- 手机 RGB 标准差：`42.06 / 40.54 / 35.79`。
- 两个视口均显著高于黑屏阈值 `12`，且截图确认巷道、设备、标签、照明和实时风险叠层正常。

## 数据真实性

- 图表输入来自 `/current`、`/history` 和 `/events`，没有硬编码日期、预警次数或风险趋势。
- 历史点返回原始指标、单位和同一份八字段 schema。
- 趋势按各指标 `value / p95 * 100` 展示，tooltip 保留原值与单位。
- 专家解释使用“标准化偏离”，没有把标准化幅度误称为 SHAP 或特征贡献。
- 来源条展示 `teacher_roof_monitoring.csv`、记录 ID、原始时间、设备 ID 与 SHA-256 摘要。

## 回归与提交预检

```text
node --test
95 tests passed, 0 failed

node tools/submission-preflight.mjs --offline
20,000 rows, 11 columns
SHA-256 86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A
PASS
```

## 结论

三端页面的数据来源、角色职责、响应式布局、ECharts 生命周期和 Three.js 画面均达到交付条件。
