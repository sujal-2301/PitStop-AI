# agent/llm_client.py
import json
import requests
from agent.config import LLMConfig


class ChatClient:
    def __init__(self, cfg: LLMConfig):
        self.cfg = cfg
        self.session = requests.Session()
        self.headers = {
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
        }

    def _to_tools(self, functions):
        """Convert OpenAI 'functions' schema into 'tools' for Chat Completions."""
        tools = []
        for fn in (functions or []):
            tools.append({
                "type": "function",
                "function": {
                    "name": fn["name"],
                    "description": fn.get("description", ""),
                    "parameters": fn.get("parameters", {"type": "object", "properties": {}}),
                }
            })
        return tools

    def chat(self, model: str, messages, *,  # force kwargs to avoid old call patterns
             tools=None, tool_choice="auto",
             max_tokens=500, temperature=0.0):
        """
        Cerebras Chat Completions (Tools API only):
          - tools: [{type:'function', function:{name,description,parameters}}]
          - tool_choice: 'auto' | {'type':'function','function':{'name':...}}
          - max_completion_tokens: int
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_completion_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice if tool_choice else "auto"

        r = self.session.post(
            f"{self.cfg.api_base}/chat/completions",
            headers=self.headers,
            data=json.dumps(payload),
            timeout=60,
        )
        if r.status_code >= 400:
            # surface full server message to caller
            raise RuntimeError(f"LLM HTTP {r.status_code}: {r.text}")
        return r.json()
