import tempfile
import unittest
from pathlib import Path

import pandas as pd

from tools.data_integration.build_roof_risk_dataset import (
    CLASS_NAMES,
    REQUIRED_COLUMNS,
    compute_risk_score,
    make_record_id,
    prepare_model_numeric,
    select_representatives,
    validate_source_frame,
    write_artifact,
)


def make_sample_frame():
    return pd.DataFrame(
        [
            {
                "时间": "2025/12/27 23:59",
                "设备编号": "监测1",
                "顶板离层速率": 0.0,
                "锚杆轴力增量": 0.0,
                "锚索轴力增量": 0.0,
                "支架阻力": 0.48,
                "涌水量": 11.16,
                "微震能量": 65.19,
                "距水体/岩溶体距离": 125.0,
                "数据质量": "正常",
                "风险等级": "低风险",
            }
        ]
    )


def make_predicted_records():
    records = []
    for index, label in enumerate(CLASS_NAMES):
        records.append(
            {
                "id": f"REC-20251227235{index}-{index:05d}",
                "true_class": label,
                "predicted_class": label,
                "confidence": 0.95 + index * 0.01,
            }
        )
    return records


class BuilderTests(unittest.TestCase):
    def test_make_record_id_is_stable(self):
        self.assertEqual(
            make_record_id("2025/12/27 23:59", "监测1", 0),
            "REC-202512272359-00000",
        )

    def test_compute_risk_score_uses_all_probabilities(self):
        self.assertEqual(compute_risk_score([0.0, 0.0, 0.0, 1.0]), 95)
        self.assertEqual(compute_risk_score([1.0, 0.0, 0.0, 0.0]), 20)
        self.assertEqual(compute_risk_score([0.25, 0.25, 0.25, 0.25]), 58)

    def test_validate_source_rejects_missing_column(self):
        frame = make_sample_frame().drop(columns=[REQUIRED_COLUMNS[-1]])
        with self.assertRaisesRegex(ValueError, "missing columns"):
            validate_source_frame(frame)

    def test_validate_source_rejects_non_finite_numeric_value(self):
        frame = make_sample_frame()
        frame.loc[0, "微震能量"] = float("nan")
        with self.assertRaisesRegex(ValueError, "non-finite"):
            validate_source_frame(frame)

    def test_select_representatives_returns_all_classes(self):
        result = select_representatives(make_predicted_records())
        self.assertEqual(list(result), CLASS_NAMES)

    def test_select_representatives_requires_correct_prediction(self):
        records = make_predicted_records()
        records[-1]["predicted_class"] = "较大风险"
        with self.assertRaisesRegex(ValueError, "重大风险"):
            select_representatives(records)

    def test_prepare_model_numeric_keeps_single_row_segment(self):
        class UnexpectedKalman:
            def smooth(self, values):
                raise AssertionError("single row segment must not be smoothed")

        result = prepare_model_numeric(make_sample_frame(), UnexpectedKalman())
        self.assertEqual(result.shape, (1, 7))
        self.assertAlmostEqual(result[0, 3], 0.48)

    def test_write_artifact_is_deterministic(self):
        artifact = {"schema_version": 1, "labels": CLASS_NAMES}
        with tempfile.TemporaryDirectory() as tmpdir:
            first = Path(tmpdir) / "first.json"
            second = Path(tmpdir) / "second.json"
            write_artifact(artifact, first)
            write_artifact(artifact, second)
            self.assertEqual(first.read_bytes(), second.read_bytes())


if __name__ == "__main__":
    unittest.main()
