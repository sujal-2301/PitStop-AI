import os
import json
from agent.config import LLMConfig
from agent.planner import plan_and_run
from agent.explainer import explain


def main():
    cfg = LLMConfig()
    user_text = (
        "We are 1.5 seconds behind the target car at lap 10. "
        "Simulate pitting on lap 12 for mediums and also try hard on lap 14. "
        "Current tires are soft with age 8."
    )
    plan = plan_and_run(user_text, cfg)
    exp = explain(plan["tool_args"], plan["sim_result"], cfg)
    print("\n=== Decision ===")
    print(exp.decision)
    print("\n=== Rationale ===")
    for r in exp.rationale:
        print("-", r)
    print("\n=== Assumptions ===")
    for a in exp.assumptions:
        print("-", a)
    print("\n=== Risks ===")
    for r in exp.risks:
        print("-", r)
    print("\n=== Fallback ===")
    print(exp.fallback)
    if exp.metrics and exp.metrics.median_gap_by_lap:
        m = exp.metrics.median_gap_by_lap
        print(
            f"\nMetric: median gap at lap {m['lap']} = {m['gap_seconds']:.2f}s")


if __name__ == "__main__":
    main()
