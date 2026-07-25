# CASCADE ⚡
### Resilient Multi-Agent Logistics & Travel Orchestration Engine
*Built for the CockroachDB × AWS Hackathon on Devpost*

---

## 🌟 Executive Summary

**CASCADE** is an autonomous, self-healing travel and multi-modal logistics orchestration engine built on **CockroachDB Cloud** and **AWS Bedrock**. 

In real-world travel, a single flight delay sets off a disastrous domino effect—causing missed train connections, cancelled hotel reservations, and expired shuttle vouchers. Standard travel platforms leave travelers stranded in endless customer service queues.

**CASCADE solves this through transactional graph resilience and reactive multi-agent AI:**
1. **Transactional Route Graph in CockroachDB**: User itineraries (Flight ➔ Train ➔ Hotel ➔ Shuttle) are stored as ACID-compliant graph nodes and edges.
2. **Instant Change Data Capture (CDC)**: External disruptions (e.g. flight delays) emit real-time Changefeed events from CockroachDB.
3. **AWS Bedrock Multi-Agent Engine**: Triggered by CDC, autonomous AI agents retrieve user preferences using **CockroachDB 1536-dimensional Vector Search** (HNSW index) and recalculate downstream legs.
4. **Model Context Protocol (MCP) Tools**: Agents call standardized MCP tools to query transit availability, rebook broken train legs, adjust hotel check-in windows, and commit rebooked segments atomically back to CockroachDB.

---

## 🏗️ Architecture Diagram

```
                       ┌─────────────────────────┐
                       │ External Disruption     │
                       │ (Flight Delay: DL-1402) │
                       └───────────┬─────────────┘
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │  CockroachDB Serverless │
                       │  - Vector Search (HNSW) │
                       │  - ACID Route Graph     │
                       └───────────┬─────────────┘
                                   │
                     CHANGEFEED (CDC Event)
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │  CASCADE CDC Listener   │
                       └───────────┬─────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                    AWS Bedrock Multi-Agent Engine                 │
│                                                                   │
│  ┌────────────────────┐   Vector Search  ┌─────────────────────┐  │
│  │ User Pref Agent    │ ◄──────────────► │  Vector Index (1536)│  │
│  └─────────┬──────────┘                  └─────────────────────┘  │
│            │                                                      │
│            ▼                                                      │
│  ┌────────────────────┐     MCP Protocol ┌─────────────────────┐  │
│  │ Cascade Repair Agent│ ◄──────────────► │ MCP Tools Server    │  │
│  └────────────────────┘                  └─────────────────────┘  │
└──────────────────────────────────┬────────────────────────────────┘
                                   │
                       ACID Rebook Transaction
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │  CockroachDB (Updated)  │
                       │  Status: SELF_HEALED    │
                       └───────────┬─────────────┘
                                   │
                         SSE Real-Time Stream
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │  Interactive UI         │
                       │  Dashboard (Live Graph) │
                       └─────────────────────────┘
```

---

## 🚀 Key Features & Innovations

- **pgvector & HNSW Vector Search**: Stores 1536-dimensional embeddings of user preferences directly inside CockroachDB (`VECTOR(1536)`). Uses cosine similarity (`vector_cosine_ops`) to match executive cabin, seat, and layover tolerances.
- **CockroachDB Change Data Capture (CDC)**: Streams DB mutations instantly, enabling zero-polling reactive agent workflows.
- **Model Context Protocol (MCP)**: Exposes clean tool APIs (`get_itinerary_graph`, `search_user_preferences_vector`, `rebook_cascade_segment`, `query_transit_availability`) to Bedrock agents.
- **ACID Transaction Resilience**: Handles distributed rebooking in serializable transactions with automatic CockroachDB retry handling (`code 40001`).
- **Live Glassmorphism Web Visualizer**: SSE-powered dashboard displaying live route graph nodes, agent thought streams, and real-time self-healing transitions.

---

## 🛠️ Project Structure

```
cascade-logistics/
├── .env.example                  # Template for CockroachDB & AWS keys
├── docker-compose.yml            # Local CockroachDB container configuration
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript compiler setup
│
├── src/
│   ├── config/
│   │   └── database.ts           # CockroachDB pool & serializable transaction runner
│   │
│   ├── db/
│   │   ├── schema.sql            # CockroachDB vector schema, route graph DDL, CDC changefeed
│   │   ├── seed.sql              # Base travel graph seed data
│   │   └── seed_runner.ts        # Database migration & 1536-dim vector embedding generator
│   │
│   ├── mcp/
│   │   ├── server.ts             # Model Context Protocol (MCP) server
│   │   └── tools/
│   │       ├── db_tools.ts       # CockroachDB graph queries & vector search tools
│   │       └── transport_tools.ts# External transit API mocks (Amtrak, Delta, Hotels)
│   │
│   ├── services/
│   │   ├── cdc_listener.ts       # CockroachDB Changefeed event listener service
│   │   ├── agent_engine.ts       # AWS Bedrock multi-agent decision engine
│   │   └── disruption_emulator.ts# CLI utility to inject flight disruptions
│   │
│   └── web/
│       ├── public/
│       │   └── index.html        # Glassmorphism interactive hackathon dashboard
│       └── app.ts                # Express backend streaming SSE updates
│
└── tests/                        # Automated unit & integration tests
    ├── cdc.test.ts               # Connection buffer & impact logic tests
    └── agent.test.ts             # MCP transit tool availability tests
```

---

## 💻 Quickstart Setup & Demo Execution

### Prerequisites
- Node.js v18+ & npm
- Docker (optional, for local CockroachDB container) OR CockroachDB Cloud Serverless account

### 1. Clone & Install Dependencies
```bash
cd /Users/urlok/Cascade
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
*(If using CockroachDB Cloud, paste your `DATABASE_URL` into `.env`)*

### 3. Start Local CockroachDB (Optional)
If testing locally with Docker:
```bash
docker-compose up -d
```

### 4. Run Migration & Seed Vector Data
```bash
npm run seed
```

### 5. Start the Live Application
```bash
npm start
```
Open your browser at **`http://localhost:3000`** to view the live dashboard.

### 6. Trigger Live Self-Healing Disruption Demo
Click the **"Simulate 2.5h Flight Delay (DL-1402)"** button on the UI, or run in terminal:
```bash
npm run emulator
```
Watch the CockroachDB CDC Changefeed fire, the Bedrock agents perform vector search on user preferences, call MCP tools, rebook the downstream Amtrak train, adjust hotel check-in times, and restore the itinerary graph to `SELF_HEALED` live on the dashboard!

---

## 🧪 Running Tests
```bash
npm test
```

---

## 🏆 Hackathon Submission Checklist

- [x] CockroachDB Cloud Serverless integration with SQL Dialect
- [x] `VECTOR(1536)` types with HNSW index & cosine similarity search
- [x] CockroachDB Changefeed (CDC) event trigger
- [x] AWS Bedrock AI integration with Claude 3 / Titan
- [x] Model Context Protocol (MCP) Server & Tool interfaces
- [x] Real-Time Web Visualization Dashboard with Server-Sent Events (SSE)
- [x] Comprehensive test suite & documentation
