# CIRO — Crisis Intelligence & Response Orchestrator

> Real-time agentic crisis response system for metropolitan areas, with primary focus on Pakistani cities.

## Architecture

```
CIRO/
├── mobile/              # React Native (Expo) Mobile App
│   ├── app/(tabs)/      # Tab screens: Dashboard, Report, Alerts, Settings
│   ├── services/        # API communication layer
│   └── constants/       # Design system tokens
│
├── backend/             # Python FastAPI Backend
│   ├── agents/          # 6-agent pipeline
│   │   ├── signal_ingestion.py      # Agent 1: Parse & normalize signals
│   │   ├── crisis_detection.py      # Agent 2: Detect & classify crises
│   │   ├── situation_analysis.py    # Agent 3: Cascading impact analysis
│   │   ├── action_planning.py       # Agent 4: Coordinated response plans
│   │   ├── simulation_execution.py  # Agent 5: Simulate actions
│   │   ├── outcome_visualization.py # Agent 6: Compile outcomes
│   │   └── orchestrator.py          # Master pipeline orchestrator
│   ├── models.py        # Pydantic data contracts
│   ├── config.py        # API keys & configuration
│   └── main.py          # FastAPI server
│
└── CIRO_AGENT_INSTRUCTIONS.md  # Full system specification
```

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo) |
| Agent Orchestration | Google Antigravity |
| LLM | Gemini 2.0 Flash (Vertex AI) |
| Backend | Python FastAPI |
| Database | Firebase Firestore |
| Maps & Traffic | Google Maps API |
| Weather | OpenWeatherMap API |

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
```

## Agent Pipeline

```
INGEST → DETECT → ANALYZE → PLAN → SIMULATE → VISUALIZE
```

Every crisis signal flows through all 6 agents in sequence, producing a full response with before/after simulation and measurable outcomes.

---

**Hackathon Build • May 2026 • Powered by Google Antigravity**
