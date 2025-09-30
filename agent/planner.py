# agent/planner.py
import json
import requests
from agent.config import LLMConfig
from agent.llm_client import ChatClient

SYSTEM_PLANNER = (
    "You are the PitStop AI PLANNER. Your only job is to convert a user's natural-language request "
    "into a single, valid call to the run_sim tool (JSON arguments). DO NOT produce a textual answer here. "
    "Rules: \n"
    "1) ALWAYS call the run_sim function and return arguments only in valid JSON. \n"
    "2) Required fields: base_lap (int >=1), base_target_gap_s (float), current_compound ('soft'|'medium'|'hard'), "
    "current_tire_age (int >=0), candidates (array of {pit_lap:int, compound:str}). \n"
    "3) If any required field is missing from the user's utterance, infer reasonable defaults "
    "(base_lap=10, base_target_gap_s=0.0, current_compound='medium', current_tire_age=6). "
    "If the user supplies no candidates, ask for clarification instead of inventing them. \n"
    "4) Set mc_samples to 200 unless the user requests otherwise. \n"
    "5) Do NOT invent or hallucinate numbers beyond reasonable defaults. Numeric values must come from the user's request or plausible defaults. \n"
    "6) Reply with a function_call object only (the LLM framework will convert that to a run_sim invocation)."
)


def load_tool_schema(path="api/tool_schema/run_sim.json"):
    with open(path, "r") as f:
        return json.load(f)


def plan_and_run(user_text: str, cfg: LLMConfig):
    """
    - Ask the planner LLM to produce a function_call (run_sim) with arguments.
    - Validate JSON args, call the local /run_sim endpoint, return tool args + sim result.
    """
    client = ChatClient(cfg)
    tool = load_tool_schema()

    messages = [
        {"role": "system", "content": SYSTEM_PLANNER},
        {"role": "user", "content": user_text}
    ]

    # Request the model propose a function call
    resp = client.chat(
        model=cfg.planner_model,
        messages=messages,
        functions=[tool],
        function_call="auto",
        max_tokens=350,
        temperature=0.0
    )

    choice = resp["choices"][0]["message"]

    # If the model returned a function_call use it; otherwise try forcing it (rare)
    if "function_call" not in choice:
        # second attempt forcing name
        resp = client.chat(
            model=cfg.planner_model,
            messages=messages,
            functions=[tool],
            function_call={"name": "run_sim"},
            max_tokens=350,
            temperature=0.0
        )
        choice = resp["choices"][0]["message"]

    func_call = choice.get("function_call", {})
    args_raw = func_call.get("arguments", "{}")

    try:
        args = json.loads(args_raw)
    except Exception as e:
        raise ValueError(
            f"Planner returned non-JSON arguments: {args_raw!r}") from e

    # Basic local validation & defaults
    if "base_lap" not in args:
        args["base_lap"] = 10
    if "base_target_gap_s" not in args:
        args["base_target_gap_s"] = 0.0
    if "current_compound" not in args:
        args["current_compound"] = "medium"
    if "current_tire_age" not in args:
        args["current_tire_age"] = 6
    if "candidates" not in args or not args["candidates"]:
        raise ValueError(
            "No candidates provided by planner; require at least one candidate strategy.")

    # Cap mc_samples to a safe number
    if "mc_samples" in args:
        args["mc_samples"] = min(int(args["mc_samples"]), 500)
    else:
        args["mc_samples"] = 200

    # Execute the simulation via our FastAPI endpoint
    r = requests.post(cfg.sim_api_url, json=args, timeout=60)
    r.raise_for_status()
    sim_result = r.json()

    return {"tool_args": args, "sim_result": sim_result}
