# agent/planner.py
import json
import requests
from agent.config import LLMConfig
from agent.llm_client import ChatClient

# ---------------------- System Prompt ----------------------
SYSTEM_PLANNER = (
    "You are the PitStop AI PLANNER. Convert the user's natural-language request "
    "into a single call to the run_sim tool by providing valid JSON arguments. "
    "Do not write prose. Always invoke the tool.\n\n"
    "Required fields in arguments:\n"
    "- base_lap (int >=1)\n"
    "- base_target_gap_s (float)\n"
    "- current_compound ('soft'|'medium'|'hard')\n"
    "- current_tire_age (int >=0)\n"
    "- candidates (array of { pit_lap:int, compound:'soft'|'medium'|'hard' })\n"
    "Defaults if missing: base_lap=10, base_target_gap_s=0.0, current_compound='medium', "
    "current_tire_age=6, mc_samples=200 (cap at 500)."
)

# ---------------------- Tool Schema Load/Sanitize ----------------------


def load_tool_schema(path="api/tool_schema/run_sim.json"):
    with open(path, "r") as f:
        return json.load(f)


# Cerebras Chat Completions (tools) rejects some JSON Schema keywords.
UNSUPPORTED_KEYS = {
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "minItems", "maxItems", "multipleOf", "patternProperties"
}


def sanitize_schema(obj):
    if isinstance(obj, dict):
        return {
            k: sanitize_schema(v)
            for k, v in obj.items()
            if k not in UNSUPPORTED_KEYS
        }
    if isinstance(obj, list):
        return [sanitize_schema(v) for v in obj]
    return obj

# ---------------------- Safe Coercion Helpers ----------------------


def _int_or(default, *vals):
    for v in vals:
        try:
            if v is None:
                continue
            return int(v)
        except (TypeError, ValueError):
            continue
    return default


def _float_or(default, *vals):
    for v in vals:
        try:
            if v is None:
                continue
            return float(v)
        except (TypeError, ValueError):
            continue
    return default


def _compound_or(default, v):
    if isinstance(v, str):
        s = v.lower().strip()
        if s in {"soft", "medium", "hard"}:
            return s
    return default

# ---------------------- LLM Tool-Call Extraction ----------------------


def _extract_args_from_choice(choice_message) -> dict:
    """
    Tools API shape:
      message.tool_calls -> [{ "type":"function", "function":{"name": "...", "arguments": "{...}"}}]
    """
    tcs = choice_message.get("tool_calls") or []
    if tcs:
        fn = tcs[0].get("function") or {}
        args_raw = fn.get("arguments", "{}")
        return json.loads(args_raw)
    raise ValueError("Planner did not return tool_calls with arguments")

# ---------------------- Main Orchestration ----------------------


def plan_and_run(user_text: str, cfg: LLMConfig):
    """
    - Ask the planner LLM (Meta model via Cerebras) to produce a tool call (run_sim) with arguments.
    - Normalize & validate arguments.
    - Call the /run_sim endpoint.
    - Return tool args + sim result.
    """
    client = ChatClient(cfg)

    # Load & sanitize tool schema parameters
    raw_tool = load_tool_schema()
    clean_params = sanitize_schema(raw_tool.get(
        "parameters", {"type": "object", "properties": {}}))

    tools = [{
        "type": "function",
        "function": {
            "name": raw_tool["name"],
            "description": raw_tool.get("description", ""),
            "parameters": clean_params,
        }
    }]

    messages = [
        {"role": "system", "content": SYSTEM_PLANNER},
        {"role": "user", "content": user_text},
    ]

    # Ask model to propose a tool call
    resp = client.chat(
        model=cfg.planner_model,
        messages=messages,
        tools=tools,                     # Tools API only
        tool_choice="auto",              # let the model pick the tool
        max_tokens=350,
        temperature=0.0,
    )
    choice = resp["choices"][0]["message"]

    # If no tool call came back, force it once
    if not choice.get("tool_calls"):
        resp = client.chat(
            model=cfg.planner_model,
            messages=messages,
            tools=tools,
            tool_choice={"type": "function",
                         "function": {"name": raw_tool["name"]}},
            max_tokens=350,
            temperature=0.0,
        )
        choice = resp["choices"][0]["message"]

    # Raw arguments from LLM
    args = _extract_args_from_choice(choice)

    # -------- Strict normalization & validation (handles None/strings) --------
    args["base_lap"] = _int_or(10, args.get("base_lap"))
    args["base_target_gap_s"] = _float_or(0.0, args.get("base_target_gap_s"))
    args["current_compound"] = _compound_or(
        "medium", args.get("current_compound"))
    args["current_tire_age"] = _int_or(6, args.get("current_tire_age"))

    # Interpret “behind/ahead” phrasing if present in the user text
    text = (user_text or "").lower()
    gap = args["base_target_gap_s"]
    if "behind" in text and gap > 0:
        args["base_target_gap_s"] = -gap
    elif "ahead" in text and gap < 0:
        args["base_target_gap_s"] = -gap

    # candidates: list of { pit_lap:int, compound:str }
    raw_cands = args.get("candidates") or []
    norm_cands = []
    for c in raw_cands:
        c = c or {}
        pit = _int_or(None, c.get("pit_lap"))
        comp = _compound_or(None, c.get("compound"))
        if pit is not None and comp is not None:
            norm_cands.append({"pit_lap": pit, "compound": comp})
    if not norm_cands:
        raise ValueError(
            "No valid candidates provided by planner; require at least one candidate.")
    args["candidates"] = norm_cands

    # mc_samples: clamp to [1, 500], default 200
    mc = _int_or(200, args.get("mc_samples"))
    mc = max(1, min(mc, 500))
    args["mc_samples"] = mc
    # -------------------------------------------------------------------------

    # Execute the simulation via FastAPI
    r = requests.post(cfg.sim_api_url, json=args, timeout=60)
    r.raise_for_status()
    sim_result = r.json()

    return {"tool_args": args, "sim_result": sim_result}
