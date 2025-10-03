# agent/config.py
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()  # load .env automatically if present


@dataclass
class LLMConfig:
    api_base: str = os.getenv("LLM_API_BASE", "https://api.cerebras.ai/v1")
    api_key: str = os.getenv("LLM_API_KEY", "")
    planner_model: str = os.getenv(
        "LLM_MODEL_PLANNER", "llama-4-scout-17b-16e-instruct")
    explainer_model: str = os.getenv(
        "LLM_MODEL_EXPLAINER", "llama-4-maverick-17b-128e-instruct")
    sim_api_url: str = os.getenv(
        "SIM_API_URL", "http://127.0.0.1:8000/run_sim")
