# Multi-Agent XGBoost Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-executed six-agent warning workflow driven by the existing teacher CSV/XGBoost output and expose its auditable state in the expert portal.

**Architecture:** A focused CommonJS workflow service consumes `RoofRiskRepository.evaluateRecord()` output and implements the same A1→A2→A3→A5→A4→A6 conditional graph as the delivered LangGraph code. Authenticated Node API routes expose status, run, and reflection operations; a small browser module renders returned node states without simulating success.

**Tech Stack:** Node.js 18+, HTML/CSS/JavaScript, existing RoofRisk API and `node:test`.

## Global Constraints

- A1 must use `teacher_real_csv_xgboost`; never fall back to `simulation-fusion-v1`.
- Node order is A1, A2, A3, A5, A4, A6.
- A4 is always `dry_run` and requires human confirmation.
- Similar records are described as data-similar records, not verified accident cases.
- Existing Vercel → Render → Supabase deployment topology remains unchanged.

---

### Task 1: Six-agent workflow service

**Files:**
- Create: `server/multi-agent-workflow-service.js`
- Test: `tests/multi-agent-workflow-service.test.mjs`

**Interfaces:**
- Consumes: `evaluateRecord(recordId)` and `findSimilarCases(recordId, limit)` callbacks.
- Produces: `createMultiAgentWorkflowService(repository)`, `run({ recordId, resourceSnapshot })`, and `reflect({ run, feedback })`.

- [ ] **Step 1: Write failing tests** for full risk flow, low-risk conditional stop, resource shortage, dry-run control, and reflection return action.
- [ ] **Step 2: Run** `node --test tests/multi-agent-workflow-service.test.mjs` and verify the module-not-found failure.
- [ ] **Step 3: Implement** structured node records with `agent_id`, `status`, `input_evidence`, `output_summary`, `next_action`, and timing; generate trace identifiers with `crypto.randomUUID()`.
- [ ] **Step 4: Run** `node --test tests/multi-agent-workflow-service.test.mjs` and require all cases to pass.
- [ ] **Step 5: Commit** service and tests with `feat: add xgboost-driven multi-agent workflow`.

### Task 2: Authenticated workflow API

**Files:**
- Modify: `server.js`
- Modify: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- Consumes: `createMultiAgentWorkflowService(repository)`.
- Produces: `GET /api/multi-agent/status`, `POST /api/multi-agent/run`, `POST /api/multi-agent/reflect`.

- [ ] **Step 1: Add failing API tests** that verify authentication, XGBoost provenance, six-node output, low-risk skipping, invalid input, and status safety boundaries.
- [ ] **Step 2: Run** `node --test tests/roof-risk-api.test.mjs` and verify 404 failures for the new routes.
- [ ] **Step 3: Add routes** under the existing authenticated application boundary and validate `record_id`, resource snapshot, and reflection payloads.
- [ ] **Step 4: Run** `node --test tests/roof-risk-api.test.mjs` and require all API tests to pass.
- [ ] **Step 5: Commit** API wiring with `feat: expose authenticated multi-agent api`.

### Task 3: Expert portal workflow visualization

**Files:**
- Create: `js/multi-agent-workflow-ui.mjs`
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`
- Create: `tests/multi-agent-ui.test.mjs`

**Interfaces:**
- Consumes: `POST /api/multi-agent/run` and authenticated current-record payload.
- Produces: `setupMultiAgentWorkflow({ authFetch, currentPayload })` and the expert portal node rail/detail panel.

- [ ] **Step 1: Add failing contract tests** for required DOM ids, script import, six labels, truth-boundary copy, and responsive CSS selectors.
- [ ] **Step 2: Run** `node --test tests/multi-agent-ui.test.mjs` and verify failures.
- [ ] **Step 3: Add markup** below the expert research summary with source strip, run button, six-node rail, evidence detail, and error state.
- [ ] **Step 4: Implement UI module** that calls the server, renders actual returned status, supports node selection, and never fabricates a success response.
- [ ] **Step 5: Add responsive styling** for 1440px, 1280px, and narrow layouts without fixed-height overlap.
- [ ] **Step 6: Run** `node --test tests/multi-agent-ui.test.mjs` and the focused frontend tests.
- [ ] **Step 7: Commit** with `feat: visualize six-agent reasoning workflow`.

### Task 4: Documentation and regression verification

**Files:**
- Modify: `README.md`
- Create: `docs/api/multi-agent-workflow-api.md`
- Create: `docs/qa/2026-09-12-multi-agent-xgboost-integration-qa.md`

**Interfaces:**
- Consumes: final API and UI behavior.
- Produces: deployment/operator instructions and truthful competition wording.

- [ ] **Step 1: Document** algorithm warning versus multi-agent decision versus three-portal collaboration, including the dry-run boundary.
- [ ] **Step 2: Run** `npm test` and require a zero exit code.
- [ ] **Step 3: Run** `npm run preflight:offline` and require a zero exit code.
- [ ] **Step 4: Start locally**, log into the expert portal in Chrome, run the major-risk record, and verify no overlap and all six real server-returned states.
- [ ] **Step 5: Record** exact commands and results in the QA report.
- [ ] **Step 6: Commit** with `docs: document multi-agent warning integration`.
