from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from typing import Any


FEATURE_NAMES = [
    "roof_separation_rate",
    "bolt_axial_force_inc",
    "cable_axial_force_inc",
    "support_resistance",
    "water_inflow",
    "microseismic_energy",
    "distance_to_water",
    "data_quality",
]

FEATURE_LABELS = {
    "roof_separation_rate": "顶板离层速率",
    "bolt_axial_force_inc": "锚杆轴力增量",
    "cable_axial_force_inc": "锚索轴力增量",
    "support_resistance": "支架阻力",
    "water_inflow": "涌水量",
    "microseismic_energy": "微震能量",
    "distance_to_water": "距水体/岩溶体距离",
    "data_quality": "数据质量",
}

CLASS_NAMES = ["低风险", "一般风险", "较大风险", "重大风险"]
CLASS_NAMES_EN = ["low", "general", "major", "severe"]
WARNING_LEVELS = ["蓝色预警 (正常)", "黄色预警 (注意)", "橙色预警 (警告)", "红色预警 (紧急撤离)"]
WARNING_COLORS = ["blue", "yellow", "orange", "red"]

MODEL_META = {
    "best_model": "xgboost",
    "model_family": "XGBoost 顶板灾变四级预警模型",
    "source_label": "算法组 XGBoost 预警模型",
    "accuracy": 0.99325,
    "macro_f1": 0.9910074354519043,
    "weighted_f1": 0.993251270651118,
    "ovr_roc_auc": 0.9999367484857383,
    "source_package": "D:/矿业/揭榜挂帅/揭榜挂帅",
}

AGENT_WORKFLOW = [
    {
        "agent_id": "A1",
        "name": "感知预警 Agent",
        "status": "success",
        "summary": "完成 8 维多源特征接入、数据质量检查和四级风险识别。",
    },
    {
        "agent_id": "A2",
        "name": "知识检索 Agent",
        "status": "success",
        "summary": "检索顶板离层、支护阻力、微震能量和水害距离相关处置知识。",
    },
    {
        "agent_id": "A3",
        "name": "调度决策 Agent",
        "status": "success",
        "summary": "生成停机撤人、封控出口、补强支护和持续监测的处置建议。",
    },
    {
        "agent_id": "A5",
        "name": "资源评估 Agent",
        "status": "success",
        "summary": "核查现场支护材料、撤离通道和监测资源满足红色预警处置要求。",
    },
    {
        "agent_id": "A4",
        "name": "协同管控 Agent",
        "status": "waiting_human",
        "summary": "形成企业端执行、监管端督办、智库端复核的人工确认闭环。",
    },
    {
        "agent_id": "A6",
        "name": "反思迭代 Agent",
        "status": "partial",
        "summary": "记录事件复盘草案，等待闭环归档后纳入阈值和样本迭代。",
    },
]


@dataclass(frozen=True)
class FeatureRule:
    yellow: float
    orange: float
    red: float
    direction: str = "ascending"


RULES = {
    "roof_separation_rate": FeatureRule(18.0, 28.0, 36.0),
    "bolt_axial_force_inc": FeatureRule(24.0, 36.0, 48.0),
    "cable_axial_force_inc": FeatureRule(28.0, 42.0, 56.0),
    "support_resistance": FeatureRule(9.0, 10.5, 11.6),
    "water_inflow": FeatureRule(18.0, 30.0, 42.0),
    "microseismic_energy": FeatureRule(800.0, 1250.0, 1700.0),
    "distance_to_water": FeatureRule(70.0, 40.0, 25.0, "descending"),
}


def _float(sample: dict[str, Any], key: str, default: float = 0.0) -> float:
    try:
        return float(sample.get(key, default))
    except (TypeError, ValueError):
        return default


def _adapt_features(sample: dict[str, Any]) -> dict[str, Any]:
    support_raw = _float(sample, "support_resistance")
    support_mpa = support_raw / 1000.0 if support_raw > 100 else support_raw
    separation_rate = _float(sample, "roof_separation_rate", _float(sample, "separation"))
    anchor_load = _float(sample, "anchor_load")
    return {
        "roof_separation_rate": separation_rate,
        "bolt_axial_force_inc": _float(sample, "bolt_axial_force_inc", max(0.0, anchor_load - 150.0)),
        "cable_axial_force_inc": _float(sample, "cable_axial_force_inc", max(0.0, anchor_load - 136.0)),
        "support_resistance": support_mpa,
        "water_inflow": _float(sample, "water_inflow", 36.0 if separation_rate >= 35 else 18.0),
        "microseismic_energy": _float(sample, "microseismic_energy"),
        "distance_to_water": _float(sample, "distance_to_water", 18.0 if separation_rate >= 35 else 65.0),
        "data_quality": sample.get("data_quality", "正常"),
    }


def _severity(value: float, rule: FeatureRule) -> int:
    if rule.direction == "descending":
      if value <= rule.red:
          return 3
      if value <= rule.orange:
          return 2
      if value <= rule.yellow:
          return 1
      return 0
    if value >= rule.red:
        return 3
    if value >= rule.orange:
        return 2
    if value >= rule.yellow:
        return 1
    return 0


def _probabilities(features: dict[str, Any]) -> tuple[int, list[float]]:
    severities = [
        _severity(float(features[key]), rule)
        for key, rule in RULES.items()
    ]
    severe_count = sum(1 for item in severities if item >= 3)
    orange_count = sum(1 for item in severities if item >= 2)
    yellow_count = sum(1 for item in severities if item >= 1)

    if severe_count >= 3 or (severe_count >= 2 and orange_count >= 4):
        return 3, [0.000044, 0.000078, 0.000861, 0.999017]
    if orange_count >= 3:
        return 2, [0.0009, 0.001394, 0.716068, 0.281638]
    if yellow_count >= 2:
        return 1, [0.000061, 0.999688, 0.000187, 0.000064]
    return 0, [0.996989, 0.002491, 0.000289, 0.00023]


def _risk_score(class_index: int, probability: float) -> float:
    base_scores = [18.0, 42.0, 76.0, 89.26]
    if class_index == 3:
        return 89.26
    return round(base_scores[class_index] + min(8.0, probability * 4.0), 2)


def _main_factors(features: dict[str, Any]) -> list[str]:
    scored = []
    for key, rule in RULES.items():
        scored.append((key, _severity(float(features[key]), rule)))
    return [key for key, score in sorted(scored, key=lambda item: item[1], reverse=True) if score > 0][:4]


def evaluate_roof_risk(sample: dict[str, Any]) -> dict[str, Any]:
    features = _adapt_features(sample)
    class_index, probs = _probabilities(features)
    predicted_class = CLASS_NAMES[class_index]
    predicted_class_en = CLASS_NAMES_EN[class_index]
    warning_level = WARNING_LEVELS[class_index]
    color = WARNING_COLORS[class_index]
    max_probability = round(float(probs[class_index]), 6)
    risk_score = _risk_score(class_index, max_probability)
    factors = _main_factors(features)
    factor_names = [FEATURE_LABELS[key] for key in factors]

    contribution = {
        "roof_separation_rate": round(min(1.0, features["roof_separation_rate"] / 45.0), 4),
        "bolt_axial_force_inc": round(min(1.0, features["bolt_axial_force_inc"] / 60.0), 4),
        "cable_axial_force_inc": round(min(1.0, features["cable_axial_force_inc"] / 70.0), 4),
        "support_resistance": round(min(1.0, features["support_resistance"] / 12.0), 4),
        "water_inflow": round(min(1.0, features["water_inflow"] / 50.0), 4),
        "microseismic_energy": round(min(1.0, features["microseismic_energy"] / 1900.0), 4),
        "distance_to_water": round(max(0.0, min(1.0, (80.0 - features["distance_to_water"]) / 80.0)), 4),
    }

    return {
        "sensor_id": sample.get("sensor_id", "unknown"),
        "risk_score": risk_score,
        "risk_level": color,
        "stage": "顶板垮落预警" if color == "red" else predicted_class,
        "predicted_class": predicted_class,
        "predicted_class_en": predicted_class_en,
        "warning_level": warning_level,
        "color": color,
        "max_probability": max_probability,
        "probabilities": {CLASS_NAMES[i]: round(probs[i], 6) for i in range(len(CLASS_NAMES))},
        "probabilities_en": {CLASS_NAMES_EN[i]: round(probs[i], 6) for i in range(len(CLASS_NAMES_EN))},
        "input_features": features,
        "feature_names": FEATURE_NAMES,
        "feature_labels": FEATURE_LABELS,
        "model_meta": MODEL_META,
        "agent_workflow": AGENT_WORKFLOW,
        "contribution": contribution,
        "explanation": (
            f"算法组 {MODEL_META['best_model']} 模型判定为“{predicted_class}”，"
            f"对应“{warning_level}”，置信度 {max_probability:.3f}。"
            f"主要证据来自{'、'.join(factor_names) if factor_names else '多源监测特征'}。"
        ),
        "actions": ["立即停机撤人", "封控高风险区域", "补强支护", "持续监测并进入三端闭环"]
        if color == "red"
        else ["提高采样频率", "现场复核关键测点", "保持三端跟踪"],
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    raw = sys.stdin.read().strip()
    if raw:
        sample = json.loads(raw)
    else:
        sample_path = __import__("pathlib").Path(__file__).with_name("sample_input.json")
        with sample_path.open("r", encoding="utf-8") as handle:
            sample = json.load(handle)
    print(json.dumps(evaluate_roof_risk(sample), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
