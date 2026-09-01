from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path


def load_model_module(model_dir: Path):
    module_path = model_dir / "roof_risk_model.py"
    if not module_path.exists():
        raise FileNotFoundError(f"roof_risk_model.py not found: {module_path}")

    spec = importlib.util.spec_from_file_location("roof_risk_model", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["roof_risk_model"] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")

    raw = sys.stdin.read().strip()
    payload = json.loads(raw) if raw else {}

    model_dir = Path(os.environ.get("ROOFRISK_MODEL_DIR", Path(__file__).resolve().parents[1] / "competition_submission" / "03-核心算法代码"))
    module = load_model_module(model_dir)
    result = module.evaluate_roof_risk(payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
