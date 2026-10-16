import pytest

from app.core.song import SourceUnavailable
from app.services.quota import QuotaBudget


def test_charge_until_limit_then_blocks():
    budget = QuotaBudget(250)
    budget.charge(100)
    budget.charge(100)
    with pytest.raises(SourceUnavailable):
        budget.charge(100)
    budget.charge(50)


def test_resets_on_new_day():
    day = ["2026-10-17"]
    budget = QuotaBudget(100, today=lambda: day[0])
    budget.charge(100)
    with pytest.raises(SourceUnavailable):
        budget.charge(1)
    day[0] = "2026-10-18"
    budget.charge(100)


def test_persists_across_instances(tmp_path):
    path = str(tmp_path / "q.json")
    QuotaBudget(150, path).charge(100)
    with pytest.raises(SourceUnavailable):
        QuotaBudget(150, path).charge(100)


def test_ignores_stale_or_corrupt_file(tmp_path):
    path = tmp_path / "q.json"
    path.write_text("not json")
    QuotaBudget(100, str(path)).charge(100)
    path.write_text('{"day": "1999-01-01", "used": 99999}')
    QuotaBudget(100, str(path)).charge(100)
