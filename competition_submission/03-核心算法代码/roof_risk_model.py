from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class MetricThreshold:
    attention: float
    warning: float
    danger: float


THRESHOLDS: dict[str, MetricThreshold] = {
    "roof_stress": MetricThreshold(attention=22.0, warning=30.0, danger=40.0),
    "separation": MetricThreshold(attention=12.0, warning=22.0, danger=35.0),
    "subsidence": MetricThreshold(attention=12.0, warning=24.0, danger=42.0),
    "support_resistance": MetricThreshold(attention=8500.0, warning=10000.0, danger=12000.0),
    "anchor_load": MetricThreshold(attention=120.0, warning=170.0, danger=230.0),
    "microseismic_energy": MetricThreshold(attention=600.0, warning=1100.0, danger=1800.0),
}

WEIGHTS: dict[str, float] = {
    "roof_stress": 0.24,
    "separation": 0.20,
    "subsidence": 0.16,
    "support_resistance": 0.18,
    "anchor_load": 0.10,
    "microseismic_energy": 0.12,
}


def normalize_metric(value: float, threshold: MetricThreshold) -> float:
    if value <= threshold.attention:
        return max(0.0, value / threshold.attention * 30.0)
    if value <= threshold.warning:
        span = threshold.warning - threshold.attention
        return 30.0 + (value - threshold.attention) / span * 25.0
    if value <= threshold.danger:
        span = threshold.danger - threshold.warning
        return 55.0 + (value - threshold.warning) / span * 30.0
    return min(100.0, 85.0 + (value - threshold.danger) / threshold.danger * 15.0)


def classify(score: float) -> tuple[str, str]:
    if score >= 85:
        return "red", "顶板垮落预警"
    if score >= 70:
        return "orange", "支架阻力异常"
    if score >= 50:
        return "yellow", "离层异常"
    if score >= 30:
        return "attention", "顶板压力升高"
    return "green", "正常监测"


def recommend_actions(level: str) -> list[str]:
    actions = {
        "green": ["保持常规巡检", "维持自动采集", "记录监测基线"],
        "attention": ["提高采样频率", "复核重点测点", "观察应力和位移趋势"],
        "yellow": ["降低推进速度", "检查锚杆锚索受力", "复核离层仪和支架状态"],
        "orange": ["准备停机处置", "调整支架初撑力", "现场巡检出口关键区域"],
        "red": ["立即停机撤人", "封控高风险区域", "执行补强支护和持续监测"],
    }
    return actions[level]


def evaluate_roof_risk(sample: dict[str, Any]) -> dict[str, Any]:
    contribution: dict[str, float] = {}
    base_score = 0.0

    for key, weight in WEIGHTS.items():
        value = float(sample.get(key, 0.0))
        metric_score = normalize_metric(value, THRESHOLDS[key])
        weighted = metric_score * weight
        contribution[key] = round(weighted, 2)
        base_score += weighted

    stress_growth = max(0.0, float(sample.get("stress_growth_rate", 0.0)))
    displacement_growth = max(0.0, float(sample.get("displacement_growth_rate", 0.0)))
    coupling = min(1.0, max(0.0, float(sample.get("spatial_coupling_index", 0.0))))

    trend_bonus = min(8.0, stress_growth * 1.2 + displacement_growth * 1.4)
    spatial_bonus = coupling * 7.0
    risk_score = round(min(100.0, base_score + trend_bonus + spatial_bonus), 2)
    risk_level, stage = classify(risk_score)

    strongest = max(contribution, key=contribution.get)
    explanation = (
        f"综合风险分值为 {risk_score}，主要贡献指标为 {strongest}。"
        f"趋势修正 {trend_bonus:.2f} 分，空间联动修正 {spatial_bonus:.2f} 分，"
        f"判定阶段为“{stage}”。"
    )

    return {
        "sensor_id": sample.get("sensor_id", "unknown"),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "stage": stage,
        "contribution": contribution,
        "explanation": explanation,
        "actions": recommend_actions(risk_level),
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sample_path = Path(__file__).with_name("sample_input.json")
    sample = json.loads(sample_path.read_text(encoding="utf-8"))
    result = evaluate_roof_risk(sample)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
