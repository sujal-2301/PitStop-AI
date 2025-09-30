# api/test_api.py
from fastapi.testclient import TestClient
from api.main import app
import json

client = TestClient(app)


def test_run_sim_endpoint():
    payload = {
        "base_lap": 10,
        "base_target_gap_s": -1.5,
        "current_compound": "soft",
        "current_tire_age": 8,
        "candidates": [
            {"pit_lap": 12, "compound": "medium"},
            {"pit_lap": 14, "compound": "hard"}
        ],
        "mc_samples": 200
    }
    r = client.post("/run_sim", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "candidates" in data
    assert len(data["candidates"]) == 2
    # ensure each candidate has median_gap_after_5_laps numeric
    for c in data["candidates"]:
        assert "median_gap_after_5_laps" in c
        assert isinstance(c["median_gap_after_5_laps"], float)
