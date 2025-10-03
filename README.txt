PitStop AI — Real‑Time Race Strategy Agent (Judge‑Ready Overview)

TL;DR
- Ask in plain English; the agent plans, simulates, iterates, and recommends the best pit strategy.
- Uses Meta Llama models via Cerebras tools API, Monte Carlo simulation, and a clean Next.js UI.
- One‑command run with Docker Compose; health checks included.

Why This Project Matters
- Demonstrates a true agentic workflow (parse → plan → simulate → analyze → refine → converge).
- Transparent: shows the agent’s thinking (iterations, tokens, timings, tool args).
- Accessible to non‑F1 audiences; visuals and copy emphasize outcomes over jargon.

Quick Start (2–3 minutes)
1) Requirements
   - Docker + Docker Compose
   - Optional: .env with LLM and Cerebras configuration

2) One Command Run
   - docker compose up --build
   - API:     http://localhost:8000
   - Frontend: http://localhost:3000

3) Health Checks
   - API:     GET /healthz → { status: "ok", data_loaded: true }
   - Frontend: http://localhost:3000 (200 OK)

Environment Variables (.env)
- FRONTEND_ORIGIN=http://localhost:3000
- LLM_API_BASE=https://api.cerebras.ai/v1
- LLM_API_KEY=YOUR_KEY
- LLM_MODEL_PLANNER=llama-4-scout-17b-16e-instruct
- LLM_MODEL_EXPLAINER=llama-4-maverick-17b-128e-instruct
- SIM_API_URL=http://127.0.0.1:8000/run_sim

What To Demo (3 Minutes)
1) Type: “We are 0.5s ahead at lap 8. Pit lap 12 hard or lap 10 medium?”
2) Show Agent Thinking panel: constraints parsed, iterations, tokens, timings.
3) Show final recommendation, comparison, and (optionally) the chart.
4) Mention SC support: try a preset that pits under Safety Car.

Agentic Workflow (High‑Level)
1) Parse Constraints (LLM)
   - Extracts lap, gap, tire compound/age, objectives, and constraints from natural language.
2) Generate Candidates (LLM)
   - Proposes 2–4 strategies (e.g., undercut/overcut, soft/medium/hard).
3) Simulate (Tool)
   - Calls FastAPI /run_sim → Monte Carlo engine (stochastic lap times, pit loss, degradation).
4) Analyze & Refine (LLM)
   - Evaluates results, proposes new variants, or stops if converged.
5) Converge
   - Stops at max iterations or when top strategies are within a small threshold (e.g., 0.1s).

Architecture (ASCII)
[ Next.js UI ]  →  [ FastAPI API ] → [ Iterative Planner (LLM via Cerebras) ]
        ↑                    ↓                 ↓              ↓
   Judge/User          /plan_and_explain   Generate      Analyze/Refine
        │                    ↓                 ↓              ↓
        └─────────── [ /run_sim Monte Carlo Engine ] ────────┘

Key Files
- api/main.py               FastAPI app, endpoints, CORS, health, caching
- api/schemas.py            Request/response models
- agent/iterative_planner.py Agent that parses, generates, simulates, refines
- agent/explainer.py        Deterministic explanation from sim results
- agent/config.py           LLM config (Cerebras base, model names)
- sim/core.py               Monte Carlo simulation (pit loss, degradation, SC window)
- frontend/pages/index.js   Main Next.js page (inputs, agent thinking, results)
- frontend/components/*     UI components (AgentThinking, ComparePanel, Plot, ExplainerCard)
- docker-compose.yml        Multi‑service orchestration with health checks

API Endpoints (FastAPI)
- GET  /healthz                          Health check
- POST /run_sim                          Run Monte Carlo simulation
- POST /plan_and_explain                 Iterative agent plan → sim → explain (returns trace)

Simulation Modeling Highlights
- Monte Carlo laps with noise and tire degradation curves per compound.
- Pit loss sampled (mean/std) and optionally reduced under Safety Car window.
- Breakeven lap: first lap post‑stop where you regain pre‑pit gap.
- Outputs P10/P50/P90 envelopes and median gap @ +5 laps per strategy.

Safety Car Support
- Optional sc_window: { start_lap, end_lap }
- sc_pit_loss_factor: reduces pit delta during SC (e.g., 0.6 → 40% faster stops)

Performance & Reliability
- LRU cache for identical simulation requests.
- CSV preload on startup to avoid per‑request I/O.
- Docker health checks for API and frontend; curl installed in containers.

Sponsor Alignment
- Meta Llama models power the agent’s planning and analysis.
- Cerebras provides the OpenAI‑compatible tools endpoint for low‑latency inference.
- Docker Compose orchestrates API + frontend with health checks.

Testing the Flow (Local)
- Open http://localhost:3000
- Use a preset like “🏆 Extend Lead Strategy”.
- Click “Run Strategy Simulation”.
- Watch the Agent Thinking panel (iterations, tokens, timings, decisions).
- Review the recommendation and comparison.

Troubleshooting
- “Agent modules not available”: ensure containers built and Python deps installed (api/requirements.txt).
- “No LLM key → mock mode”: set LLM_API_KEY to enable full agent loop; mock still returns usable output.
- CORS issues: FRONTEND_ORIGIN defaults to http://localhost:3000; can be overridden.
- Ports in use: stop other services on 3000/8000 or change compose ports.

Security Notes
- Keep .env out of version control (already ignored).
- Markdown documentation files are ignored by default in this repo.

Roadmap (Future Enhancements)
- Clarifying questions when inputs are ambiguous.
- Session memory: user preferences and prior decisions.
- Multi‑agent roles (Strategist/Analyst/Risk) with traceable outputs.
- Streaming planner trace to the UI.

License
- © 2025 PitStop AI. For hackathon judging and demo purposes.

Acknowledgements
- Meta (Llama models), Cerebras (hosted inference), Docker (orchestration).
