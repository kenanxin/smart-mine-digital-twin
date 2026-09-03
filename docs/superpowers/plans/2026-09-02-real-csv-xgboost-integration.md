# Real CSV XGBoost Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive RoofRisk API v1 and all three portals from the teacher-provided 20,000-row monitoring CSV and the existing trained XGBoost model without adding Python to the production Node service.

**Architecture:** A release-time Python builder validates the canonical CSV, runs the existing scaler/encoders/XGBoost model, and emits one deterministic compact JSON dataset. A focused Node repository loads that artifact and owns selected-event plus closed-loop state; `server.js` delegates RoofRisk routes to it. The existing frontend consumes the stable API contract but renders the real eight input fields, model probabilities, labels, confidence, and provenance.

**Tech Stack:** Python 3.10, pandas, NumPy, joblib, scikit-learn, XGBoost 2.x, Node.js 18+, Node built-in test runner, vanilla JavaScript, Three.js, ECharts.

## Global Constraints

- Keep the existing single Node Render service and do not add Python runtime dependencies to production.
- Treat `data/teacher_roof_monitoring.csv` as the canonical source and validate SHA-256 `86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`.
- Expect exactly 20,000 rows, 11 columns, and all four labels: `低风险`, `一般风险`, `较大风险`, `重大风险`.
- Use existing algorithm artifacts from `../项目总代码交付/integrations/algorithm` by default, with explicit CLI overrides for reproducible builds.
- Never silently fall back to simulated values when the generated artifact is missing or malformed.
- Preserve deterministic six-stage demo mode; normal mode restores the selected real event.
- Keep unrelated existing report and image changes out of all commits.

---

## File Structure

- Create `data/teacher_roof_monitoring.csv`: canonical byte-identical source CSV.
- Create `data/roof-risk-dataset.json`: deterministic generated predictions and event windows consumed by Node.
- Create `tools/data_integration/requirements.txt`: lean build-only Python dependencies.
- Create `tools/data_integration/build_roof_risk_dataset.py`: source validation, preprocessing, inference, event selection, and artifact generation.
- Create `tools/data_integration/test_build_roof_risk_dataset.py`: Python unit tests for validation and deterministic transformations.
- Create `server/roof-risk-repository.js`: artifact validation, payload mapping, selected event, and closed-loop state.
- Create `tests/roof-risk-repository.test.mjs`: Node tests for repository behavior.
- Create `tests/roof-risk-api.test.mjs`: HTTP contract tests against a temporary server process.
- Modify `server.js`: delegate RoofRisk endpoints to the repository and export/start cleanly for tests.
- Modify `index.html`: replace simulated labels with actual CSV feature and model-output containers.
- Create `js/roof-risk-view-model.mjs`: pure API-to-view mapping that is testable without a browser.
- Modify `js/main.js`: map real metrics, probabilities, provenance, and explicit unavailable states.
- Modify `package.json`: add Node test and real-data build scripts.
- Modify `.gitignore`: ignore the local build virtual environment only.
- Modify `README.md`: document the real-data build and runtime lineage.
- Modify `docs/api/roof-risk-api-v1.md`: document real feature fields, provenance, model output, and record-id evaluation.

---

### Task 1: Canonical Source And Inference Builder

**Files:**
- Create: `data/teacher_roof_monitoring.csv`
- Create: `tools/data_integration/requirements.txt`
- Create: `tools/data_integration/build_roof_risk_dataset.py`
- Create: `tools/data_integration/test_build_roof_risk_dataset.py`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: teacher CSV; `scaler.pkl`, `quality_encoder.pkl`, `label_encoder.pkl`, `metrics.json`, and `xgb_model.json`.
- Produces: `build_dataset(csv_path: Path, model_dir: Path, built_at: str) -> dict` and CLI output at `data/roof-risk-dataset.json`.

- [ ] **Step 1: Copy and verify the canonical source**

Run:

```powershell
Copy-Item -LiteralPath 'D:\矿业\demo_training_data (3)(1).csv' -Destination 'data\teacher_roof_monitoring.csv'
(Get-FileHash -Algorithm SHA256 -LiteralPath 'data\teacher_roof_monitoring.csv').Hash
```

Expected: `86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`.

- [ ] **Step 2: Add the lean build environment definition**

Create `tools/data_integration/requirements.txt` with exact compatible ranges:

```text
pandas>=2.0,<3.0
numpy>=1.24,<2.0
joblib>=1.3,<2.0
scikit-learn>=1.3,<2.0
xgboost>=2.0,<4.0
```

Add `.venv-data/` to `.gitignore`.

Create the isolated environment and install only build dependencies:

```powershell
python -m venv .venv-data
& '.\.venv-data\Scripts\python.exe' -m pip install -r tools/data_integration/requirements.txt
```

- [ ] **Step 3: Write failing builder unit tests**

Test these exact public helpers:

```python
import unittest
import pandas as pd

from tools.data_integration.build_roof_risk_dataset import (
    REQUIRED_COLUMNS,
    compute_risk_score,
    make_record_id,
    select_representatives,
    validate_source_frame,
)

def make_sample_frame():
    return pd.DataFrame([{
        "时间": "2025/12/27 23:59", "设备编号": "监测1",
        "顶板离层速率": 0.0, "锚杆轴力增量": 0.0, "锚索轴力增量": 0.0,
        "支架阻力": 0.48, "涌水量": 11.16, "微震能量": 65.19,
        "距水体/岩溶体距离": 125.0, "数据质量": "正常", "风险等级": "低风险",
    }])

def make_predicted_records():
    return [
        {"id": f"REC-20251227235{index}-{index:05d}", "true_class": label,
         "predicted_class": label, "confidence": 0.99 - index * 0.01}
        for index, label in enumerate(["低风险", "一般风险", "较大风险", "重大风险"])
    ]

class BuilderTests(unittest.TestCase):
    def test_make_record_id_is_stable(self):
        self.assertEqual(make_record_id("2025/12/27 23:59", "监测1", 0), "REC-202512272359-00000")

    def test_compute_risk_score_uses_all_probabilities(self):
        self.assertEqual(compute_risk_score([0.0, 0.0, 0.0, 1.0]), 95)
        self.assertEqual(compute_risk_score([1.0, 0.0, 0.0, 0.0]), 20)

    def test_validate_source_rejects_missing_column(self):
        frame = make_sample_frame().drop(columns=[REQUIRED_COLUMNS[-1]])
        with self.assertRaisesRegex(ValueError, "missing columns"):
            validate_source_frame(frame)

    def test_select_representatives_returns_all_classes(self):
        result = select_representatives(make_predicted_records())
        self.assertEqual(list(result), ["低风险", "一般风险", "较大风险", "重大风险"])
```

- [ ] **Step 4: Run tests and verify failure**

Run:

```powershell
& '.\.venv-data\Scripts\python.exe' -m unittest tools.data_integration.test_build_roof_risk_dataset -v
```

Expected: import failure because `build_roof_risk_dataset.py` does not exist.

- [ ] **Step 5: Implement validation and inference**

Implement these stable constants and functions:

```python
CLASS_NAMES = ["低风险", "一般风险", "较大风险", "重大风险"]
NUMERIC_COLUMNS = [
    "顶板离层速率", "锚杆轴力增量", "锚索轴力增量", "支架阻力",
    "涌水量", "微震能量", "距水体/岩溶体距离",
]
REQUIRED_COLUMNS = ["时间", "设备编号", *NUMERIC_COLUMNS, "数据质量", "风险等级"]
EXPECTED_SHA256 = "86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A"
RISK_SCORE_WEIGHTS = np.array([20.0, 45.0, 70.0, 95.0])

def compute_risk_score(probabilities: Sequence[float]) -> int:
    return int(round(float(np.dot(np.asarray(probabilities), RISK_SCORE_WEIGHTS))))
```

Load the quality encoder before concatenating the encoded quality column, apply the numeric scaler to the seven numeric columns, load `xgb_model.json` through `XGBClassifier.load_model`, and call `predict_proba` once for the full matrix. Reject non-finite numeric values and any label/quality category unknown to the fitted encoders.

Use record ids `REC-YYYYMMDDHHMM-NNNNN`. Select the highest-confidence correctly classified record in each true class; if a class has no correct prediction, fail rather than substituting another class. Build a 24-point chronological window centered on each representative record and clipped to dataset bounds.

- [ ] **Step 6: Emit the deterministic artifact**

Use this top-level contract:

```json
{
  "schema_version": 1,
  "source": {"name": "teacher_roof_monitoring.csv", "sha256": "86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A", "row_count": 20000},
  "model": {"name": "xgboost", "classes": ["低风险", "一般风险", "较大风险", "重大风险"]},
  "inference_built_at": "2026-09-02T13:00:00+08:00",
  "feature_schema": [{"key": "roof_separation_rate", "label": "顶板离层速率", "unit": "mm/d"}],
  "records": [{"id": "REC-202512272359-00000", "time": "2025/12/27 23:59", "values": [0,0,0,0.48,11.16,65.19,125], "standardized_values": [-0.8,-0.7,-0.6,-0.5,-0.4,-0.3,0.9], "quality": "正常", "true_class": "低风险", "predicted_class": "低风险", "probabilities": [0.99,0.01,0,0], "confidence": 0.99, "risk_score": 20}],
  "representatives": {"低风险": "REC-202512272359-00000", "一般风险": "REC-202512181200-03000", "较大风险": "REC-202512051200-08000", "重大风险": "REC-202511151200-15000"},
  "history_windows": {"REC-202512272359-00000": ["REC-202512272356-00001", "REC-202512272359-00000"]}
}
```

Write UTF-8 JSON with stable key order and compact separators. Record `inference_built_at`; accept an optional `--built-at` ISO-8601 value so reproducibility checks can supply a fixed timestamp, otherwise use the current local ISO-8601 time.

- [ ] **Step 7: Build and verify the artifact**

Run the builder twice and verify identical hashes:

```powershell
& '.\.venv-data\Scripts\python.exe' tools/data_integration/build_roof_risk_dataset.py --csv data/teacher_roof_monitoring.csv --model-dir ..\项目总代码交付\integrations\algorithm --output data/roof-risk-dataset.json --built-at '2026-09-02T13:00:00+08:00'
$first=(Get-FileHash data/roof-risk-dataset.json).Hash
& '.\.venv-data\Scripts\python.exe' tools/data_integration/build_roof_risk_dataset.py --csv data/teacher_roof_monitoring.csv --model-dir ..\项目总代码交付\integrations\algorithm --output data/roof-risk-dataset.json --built-at '2026-09-02T13:00:00+08:00'
$second=(Get-FileHash data/roof-risk-dataset.json).Hash
if($first -ne $second){throw 'Artifact is not deterministic'}
```

Expected: 20,000 records, four representatives, and identical hashes.

- [ ] **Step 8: Run builder tests**

Run: `& '.\.venv-data\Scripts\python.exe' -m unittest tools.data_integration.test_build_roof_risk_dataset -v`

Expected: all tests pass.

- [ ] **Step 9: Commit the builder**

```powershell
git add .gitignore data/teacher_roof_monitoring.csv data/roof-risk-dataset.json tools/data_integration
git commit -m "feat: build RoofRisk data from teacher CSV"
```

---

### Task 2: RoofRisk Data Repository

**Files:**
- Create: `server/roof-risk-repository.js`
- Create: `tests/roof-risk-repository.test.mjs`

**Interfaces:**
- Consumes: generated artifact contract from Task 1.
- Produces: `createRoofRiskRepository(artifact)`, returning `getCurrent()`, `getHistory()`, `getExplain()`, `listEvents()`, `selectEvent(eventId)`, `evaluateRecord(recordId)`, and `advanceClosedLoop(action)`.

- [ ] **Step 1: Write failing repository tests**

Load the Task 1 artifact as the test fixture and assert:

```javascript
const artifact = JSON.parse(readFileSync(new URL('../data/roof-risk-dataset.json', import.meta.url), 'utf8'));

test('defaults to the severe representative', () => {
  const repo = createRoofRiskRepository(artifact);
  assert.equal(repo.getCurrent().model_output.predicted_class, '重大风险');
  assert.equal(repo.getCurrent().data_source, 'teacher_real_csv_xgboost');
});

test('selection changes measurements but closed-loop changes do not', () => {
  const repo = createRoofRiskRepository(artifact);
  repo.selectEvent('REAL-LOW-001');
  const before = structuredClone(repo.getCurrent().metrics);
  repo.advanceClosedLoop('advance');
  assert.deepEqual(repo.getCurrent().metrics, before);
});

test('history is chronological', () => {
  const points = createRoofRiskRepository(artifact).getHistory().points;
  assert.deepEqual(points.map(point => point.timestamp), [...points.map(point => point.timestamp)].sort());
});
```

- [ ] **Step 2: Run the repository test and verify failure**

Run: `node --test tests/roof-risk-repository.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement artifact validation and immutable record mapping**

Validate schema version, source hash, 20,000 records, feature count, four representatives, record references, probability length/sum, and finite numeric values at repository creation. Freeze loaded source records. Map risk labels exactly:

```javascript
const RISK_META = {
  '低风险': { level: 'green', stage: '正常监测', status: 'watching' },
  '一般风险': { level: 'yellow', stage: '黄色关注', status: 'watching' },
  '较大风险': { level: 'orange', stage: '支架阻力异常', status: 'confirmed' },
  '重大风险': { level: 'red', stage: '顶板垮落预警', status: 'processing' },
};
```

Generate stable event ids `REAL-LOW-001`, `REAL-GENERAL-001`, `REAL-MAJOR-001`, and `REAL-SEVERE-001`. Keep closed-loop state in a separate mutable map keyed by event id.

- [ ] **Step 4: Map the eight real features and model evidence**

Return `metrics` with these exact keys: `roof_separation_rate`, `bolt_axial_force_increment`, `cable_axial_force_increment`, `support_resistance`, `water_inflow`, `microseismic_energy`, `distance_to_water`, and `data_quality`.

Return `model_output` with `best_model`, `probabilities` keyed as `low`, `general`, `major`, and `severe`, `confidence`, `true_class`, `predicted_class`, `matches_label`, and `record_id`. Derive triggers from the three largest absolute standardized numeric feature values stored by the builder, and normalize them into `risk.contribution` without calling the result SHAP.

- [ ] **Step 5: Run repository tests**

Run: `node --test tests/roof-risk-repository.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit the repository**

```powershell
git add server/roof-risk-repository.js tests/roof-risk-repository.test.mjs
git commit -m "feat: add real RoofRisk data repository"
```

---

### Task 3: Wire RoofRisk API v1 To Real Data

**Files:**
- Modify: `server.js`
- Modify: `package.json`
- Create: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- Consumes: `createRoofRiskRepository` from Task 2.
- Produces: unchanged route paths backed by real data and structured JSON errors.

- [ ] **Step 1: Write failing HTTP contract tests**

Start the server on an ephemeral test port and assert:

```javascript
const current = await fetch(`${baseUrl}/api/roof-risk/current`).then(r => r.json());
assert.equal(current.data_source, 'teacher_real_csv_xgboost');
assert.equal(current.provenance.source_sha256, EXPECTED_SHA256);
assert.equal(current.model_output.best_model, 'xgboost');
assert.equal(Object.keys(current.metrics).length, 8);

const missing = await fetch(`${baseUrl}/api/roof-risk/evaluate`, {
  method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({record_id: 'missing'})
});
assert.equal(missing.status, 404);
```

Also test event selection, selected history, explain output, and that closed-loop advancement does not change `record_id` or metrics.

- [ ] **Step 2: Run API tests and verify failure**

Run: `node --test tests/roof-risk-api.test.mjs`

Expected: current endpoint still reports simulated data.

- [ ] **Step 3: Refactor server startup without changing static serving**

Load `data/roof-risk-dataset.json` synchronously before listening, construct one repository, and replace hard-coded `ROOF_RISK_CURRENT`, `ROOF_RISK_HISTORY`, `ROOF_RISK_EVENTS`, and `EVENT_PROFILES`. Expose `createAppServer({ artifactPath }) -> http.Server` and call `.listen(PORT)` only under `if (require.main === module)` so tests can bind port `0` and close the server.

- [ ] **Step 4: Delegate every RoofRisk route**

Use repository methods and return structured errors:

```javascript
function sendApiError(res, statusCode, code, message, details = {}) {
  sendJson(res, { error: { code, message, ...details } }, statusCode);
}
```

`POST /api/roof-risk/evaluate` requires `{ "record_id": "REC-202512272359-00000" }`; missing input returns 400, unknown id returns 404. Unsupported closed-loop actions return 400 rather than silently advancing.

- [ ] **Step 5: Add test scripts**

Update `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  }
}
```

- [ ] **Step 6: Run API and existing tests**

Run: `npm test`

Expected: repository, API, and existing mine configuration tests all pass.

- [ ] **Step 7: Commit API wiring**

```powershell
git add server.js package.json tests/roof-risk-api.test.mjs
git commit -m "feat: serve real XGBoost RoofRisk results"
```

---

### Task 4: Render Real Inputs And Model Output

**Files:**
- Modify: `index.html`
- Create: `js/roof-risk-view-model.mjs`
- Modify: `js/main.js`
- Create: `tests/roof-risk-frontend-mapping.test.mjs`

**Interfaces:**
- Consumes: Task 3 current/explain payloads.
- Produces: `mapRoofRiskViewModel(payload) -> { metrics, model, provenance }` used by portal renderers.

- [ ] **Step 1: Write failing pure mapping tests**

Create `js/roof-risk-view-model.mjs` as a browser-independent ES module exporting `mapRoofRiskViewModel(payload)`. Assert all eight fields, units, risk labels, probability ordering, and unavailable-state behavior:

```javascript
const realPayload = {
  data_source: 'teacher_real_csv_xgboost',
  metrics: {
    roof_separation_rate: {value: 12.4, unit: 'mm/d'},
    bolt_axial_force_increment: {value: 24.0, unit: 'kN'},
    cable_axial_force_increment: {value: 19.0, unit: 'kN'},
    support_resistance: {value: 8.6, unit: 'MPa'},
    water_inflow: {value: 32.0, unit: 'm3/h'},
    microseismic_energy: {value: 850.0, unit: 'J'},
    distance_to_water: {value: 42.0, unit: 'm'},
    data_quality: {value: '正常', unit: null},
  },
  model_output: {
    best_model: 'xgboost', confidence: 0.91,
    true_class: '重大风险', predicted_class: '重大风险', matches_label: true,
    probabilities: {low: 0.01, general: 0.02, major: 0.06, severe: 0.91},
  },
  provenance: {source_sha256: '86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A'},
};

const view = mapRoofRiskViewModel(realPayload);
assert.equal(view.metrics.roofSeparationRate.text, '12.4 mm/d');
assert.equal(view.metrics.supportResistance.text, '8.6 MPa');
assert.equal(view.model.probabilities.severe, 0.91);
assert.equal(view.model.labelAgreement, '预测与真实标签一致');
assert.equal(view.provenance.source, '老师提供的真实监测数据');
```

- [ ] **Step 2: Run mapping tests and verify failure**

Run: `node --test tests/roof-risk-frontend-mapping.test.mjs`

Expected: `mapRoofRiskViewModel` is not defined.

- [ ] **Step 3: Replace six enterprise metric labels**

Use the six visible cards for: separation rate, bolt increment, cable increment, support resistance, water inflow, and microseismic energy. Keep distance-to-water and data quality in the expert input list. Rename ids to describe real values and update progress-bar mapping using feature ranges from `payload.feature_schema`; do not apply legacy `METRICS` thresholds to incompatible units.

- [ ] **Step 4: Render the expert model panel from API data**

Add stable containers for:

- eight real inputs;
- four probabilities in class order;
- `XGBoost` model name and confidence;
- ground-truth and predicted labels;
- agreement state;
- record id, source hash prefix, and original timestamp.

Replace `模拟接口验证`, hard-coded `0.87`, and fixed weight percentages. Label normalized evidence as `特征证据` rather than SHAP contribution.

- [ ] **Step 5: Remove simulated fallbacks from normal portal mode**

`enrichRegulatorEvents` must return API events only. On fetch failure, render `真实数据接口暂不可用` and `--` values; do not insert the three simulated events. Keep deterministic `ROOF_WARNING_META` only inside active six-stage demo mode.

- [ ] **Step 6: Restore real selection after demo mode**

When the demo completes or is stopped, call `refreshRoofRiskApiStatus()` and `refreshData()` so the last selected real record is restored. Assert this behavior in the mapping/controller test with mocked fetch results.

- [ ] **Step 7: Run frontend and full Node tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 8: Commit frontend integration**

```powershell
git add index.html js/roof-risk-view-model.mjs js/main.js tests/roof-risk-frontend-mapping.test.mjs
git commit -m "feat: render real monitoring and model evidence"
```

---

### Task 5: Documentation And End-To-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/api/roof-risk-api-v1.md`

**Interfaces:**
- Consumes: final builder, API, and frontend behavior.
- Produces: reproducible operator instructions and verified local deliverable.

- [ ] **Step 1: Update runtime and lineage documentation**

Document the exact source hash, 20,000 rows, class counts (`7432`, `9830`, `2071`, `667`), build command, generated artifact, eight fields, `record_id` evaluation behavior, and distinction between release-time XGBoost inference and runtime Node serving.

- [ ] **Step 2: Run the complete automated verification**

Run:

```powershell
npm test
node --check server.js
node --check js/main.js
& '.\.venv-data\Scripts\python.exe' -m unittest tools.data_integration.test_build_roof_risk_dataset -v
```

Expected: all tests and syntax checks pass.

- [ ] **Step 3: Start the local service**

Run:

```powershell
$env:PORT='8092'
npm start
```

Verify `GET /api/roof-risk/current`, `/history`, `/explain`, and `/events` report the real source, valid record ids, XGBoost output, and chronological points.

- [ ] **Step 4: Perform visual QA**

Using the in-app browser, inspect desktop `1440x900` and mobile `390x844` for enterprise, regulator, and expert portals. Verify the Three.js canvas is nonblank, no text overlaps, all real values fit, event switching updates every portal, model probability bars match the API, and demo completion restores the selected real record.

- [ ] **Step 5: Inspect logs and dataset provenance**

Confirm no project JavaScript errors, no failed API requests, the rendered source says `老师提供的真实监测数据`, and the source hash prefix matches the API.

- [ ] **Step 6: Commit documentation**

```powershell
git add README.md docs/api/roof-risk-api-v1.md
git commit -m "docs: document real RoofRisk data lineage"
```

- [ ] **Step 7: Review final diff without touching unrelated changes**

Run:

```powershell
git status --short
git diff HEAD~5 -- . ':(exclude)competition_submission/*.docx' ':(exclude)docs/reports/*' ':(exclude)docs/figures/*'
```

Expected: only the approved data integration, tests, generated data, and documentation appear in the implementation commits; pre-existing report and figure changes remain uncommitted and intact.
