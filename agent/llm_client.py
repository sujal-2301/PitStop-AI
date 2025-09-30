import json
import os
import requests
from agent.config import LLMConfig


class ChatClient:
    def __init__(self, cfg: LLMConfig):
        self.cfg = cfg
        self.session = requests.Session()
        self.headers = {
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json"
        }

    def chat(self, model: str, messages, functions=None, function_call="auto", max_tokens=500, temperature=0):
        payload = {"model": model, "messages": messages,
                   "temperature": temperature, "max_tokens": max_tokens}
        if functions:
            payload["functions"] = functions
            payload["function_call"] = function_call
        r = self.session.post(f"{self.cfg.api_base}/chat/completions",
                              headers=self.headers, data=json.dumps(payload), timeout=60)
        r.raise_for_status()
        return r.json()
