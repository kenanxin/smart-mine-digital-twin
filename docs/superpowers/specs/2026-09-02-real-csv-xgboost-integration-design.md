# Real CSV and XGBoost Integration Design

## Goal

Replace the platform's hard-coded roof-risk payloads with reproducible results derived from the teacher-provided real monitoring CSV and the existing trained XGBoost model, while retaining the stable single-Node deployment and the six-stage competition demo.

## Source Of Truth

- Canonical source: `data/teacher_roof_monitoring.csv`.
- Original source file: `D:\矿业\demo_training_data (3)(1).csv`.
- Expected SHA-256: `86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`.
- Expected schema: time, device id, seven numeric monitoring features, data quality, and risk label.
- Expected size: 20,000 rows covering low, general, major, and severe risk.

The source file is byte-for-byte identical to the `demo_training_data.csv` already present in the integrated algorithm package. The integration therefore uses the existing trained preprocessing artifacts and XGBoost model instead of retraining a second model.

## Architecture

```text
teacher_roof_monitoring.csv
  -> Python build adapter
  -> scaler + quality encoder + label encoder + xgb_model.json
  -> compact RoofRisk dataset JSON
  -> Node server data repository
  -> RoofRisk API v1
  -> enterprise / regulator / expert portals and Three.js risk state
```

Python is used only when preparing a release or after changing the CSV/model. The deployed Node process reads the generated JSON and does not require Python, PyTorch, XGBoost, or a second web service at runtime.

## Components

### Canonical Data

Store the teacher CSV under the main project's `data` directory with a stable ASCII filename. Preserve the original rows and UTF-8 BOM compatibility. Record the source hash, row count, time range, class distribution, and feature schema in generated metadata.

### Inference Builder

Add a focused Python script under `tools/data_integration`. It will:

1. Validate the CSV schema and required artifacts.
2. Load the existing scaler, encoders, `metrics.json`, and `xgb_model.json`.
3. Run XGBoost inference for all 20,000 rows.
4. Preserve each row's ground-truth risk label alongside predicted class, four probabilities, confidence, and match status.
5. Select a representative high-confidence record for each risk class.
6. Build a chronological history window around each representative record.
7. Emit a compact, deterministic JSON artifact for Node.

The builder must fail clearly on missing columns, invalid categories, hash drift, missing model artifacts, non-finite values, or unsupported best-model metadata.

### Node Data Repository

Move real-data loading and RoofRisk mapping into a small server-side module rather than adding more responsibilities to `server.js`. The repository will expose:

- dataset metadata;
- four representative risk events;
- selected current event;
- real feature values and model output;
- chronological history for the selected event;
- model explanation fields;
- closed-loop state layered on top of immutable source/model data.

The server will fail at startup with an actionable message if the generated artifact is missing or malformed. It must not silently fall back to simulated values.

### RoofRisk API v1

The existing routes remain stable:

- `GET /api/roof-risk/current` returns the selected real record and XGBoost result.
- `GET /api/roof-risk/history` returns the real time window around that record.
- `GET /api/roof-risk/explain` returns probabilities, confidence, true label, predicted label, match state, and feature evidence.
- `GET /api/roof-risk/events` returns one representative event per risk class.
- `POST /api/roof-risk/select` changes the shared selected real event.
- `POST /api/roof-risk/closed-loop/advance` changes only workflow state, never source measurements or model output.
- `POST /api/roof-risk/evaluate` evaluates records contained in the generated dataset by stable record id. Arbitrary new sensor input remains the responsibility of the standalone Python inference service and is documented as such.

Responses include explicit provenance fields: real CSV source, source hash, record id, model name, model version metadata, and inference build time.

## Field Mapping

The API exposes the dataset's actual eight inputs without inventing measurements:

| CSV field | API field | Unit |
| --- | --- | --- |
| 顶板离层速率 | `roof_separation_rate` | mm/d |
| 锚杆轴力增量 | `bolt_axial_force_increment` | kN |
| 锚索轴力增量 | `cable_axial_force_increment` | kN |
| 支架阻力 | `support_resistance` | MPa |
| 涌水量 | `water_inflow` | m3/h |
| 微震能量 | `microseismic_energy` | J |
| 距水体/岩溶体距离 | `distance_to_water` | m |
| 数据质量 | `data_quality` | categorical |

Legacy aliases may be returned only where an existing visualization requires them, and each alias must be derived transparently from a real source field. The UI labels will use the real field names and units.

## User Experience

- Normal portal mode defaults to the representative severe-risk record so the competition workflow remains demonstrable.
- The event queue lets users switch among all four real risk classes.
- The interface shows `老师提供的真实监测数据` and `XGBoost` rather than simulated-source wording.
- The expert portal shows the eight actual inputs, four class probabilities, confidence, ground-truth label, predicted label, and whether they agree.
- The enterprise portal uses real feature labels and values.
- Six-stage demo mode remains deterministic. Leaving demo mode restores the selected real-data event.
- The existing layout and interaction model remain intact; this change is data integration, not a visual redesign.

## Error Handling

- Build-time validation stops on schema, encoding, model, hash, or numeric errors.
- Server startup stops when the generated artifact cannot be trusted.
- API lookup failures return structured 4xx responses with the invalid record/event id.
- Frontend fetch failures show a clear unavailable state and do not present simulated numbers as real.

## Testing

- Verify source hash, 20,000-row count, 11-column schema, and four-class distribution.
- Compare a representative sample of generated predictions with direct Python XGBoost inference.
- Validate the generated JSON schema and deterministic output.
- Test all RoofRisk routes, event selection, history ordering, and closed-loop state isolation.
- Verify frontend mapping for all four risk classes.
- Run syntax and existing automated checks.
- Start the local service and visually verify enterprise, regulator, expert, and demo-mode restoration on desktop and mobile viewports.

## Deployment

Keep the existing Node Render service. Commit the canonical CSV, generated compact JSON, reproducible build script, and required documentation. Do not add Python runtime dependencies to the production service. Rebuild the artifact whenever the source CSV or model artifacts change.

## Out Of Scope

- Retraining or tuning the teacher-provided model pipeline.
- Streaming directly from physical sensors.
- Arbitrary online XGBoost inference inside the Node process.
- Replacing the existing Three.js scene or redesigning the portal layout.
