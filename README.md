<div align="center">

![CASCADE Hero Banner](assets/readme/hero-banner.svg)

# CASCADE
### Autonomous Executive Travel & Multi-Modal Logistics Recovery Engine
*Built for the CockroachDB × AWS Hackathon on Devpost*

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CockroachDB](https://img.shields.io/badge/CockroachDB-v23.2_Serverless-6933FF?style=for-the-badge&logo=cockroachlabs&logoColor=white)](https://www.cockroachlabs.com/)
[![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-Claude_3.5_Sonnet-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![MCP SDK](https://img.shields.io/badge/Model_Context_Protocol-SDK_1.0-10B981?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Telegram](https://img.shields.io/badge/Telegram_Bot-Alerts-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## Executive Summary

**CASCADE** is an autonomous, self-healing executive travel and multi-modal logistics recovery engine.

When a single flight is delayed, the downstream domino effect—missed train connections, invalidated hotel windows, stranded executives—is instantaneous. Legacy travel platforms leave passengers in manual customer-service queues for hours. CASCADE eliminates that entirely.

At its core, every itinerary is stored as an **ACID-compliant transactional graph** inside **CockroachDB**. A live **Change Data Capture (CDC)** listener watches the database for disruption events and automatically triggers a multi-agent reasoning pipeline powered by **AWS Bedrock (Claude 3.5 Sonnet)**. Within a sub-second SLA, the engine queries 1536-dimensional **HNSW vector embeddings** to recall executive preferences, evaluates multi-branch rebooking candidates, commits the winner in a **SERIALIZABLE** transaction, and broadcasts the result over a live **SSE event stream** to the dashboard and via a **Telegram Bot alert**.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CASCADE — Autonomous Recovery Engine                       │
└────────────────────────────────────────────────────────────────────────────────────────┘

  Browser / Telegram                  Express API Server (port 3000)
  ┌─────────────────┐                 ┌──────────────────────────────────────────────────┐
  │  Glassmorphism  │◄── SSE Stream ──│  GET /api/stream       (text/event-stream)        │
  │  Dashboard      │                 │  POST /api/disrupt     (trigger healing)          │
  │  (index.html)   │────HTTP/REST───►│  POST /api/itinerary/create  (3-step modal)      │
  │                 │                 │  GET /api/dashboard    (live metrics)             │
  │  @CascadeAWS    │◄── Bot Alert ───│  GET /api/health       (CRDB + AWS status)       │
  │  _bot Telegram  │                 │  GET /api/itinerary/artifact  (proof download)   │
  └─────────────────┘                 │  GET /api/reports/pdf  (PDF export)              │
                                      └────────────────────────┬─────────────────────────┘
                                                               │
                              ┌────────────────────────────────▼──────────────────────────┐
                              │                   CDC Listener Service                      │
                              │  Polls disruption_events every 3 000ms                     │
                              │  Accepts webhook payloads from CockroachDB Changefeed       │
                              │  Emits: cdc_event · agent_step · cascade_healed ·           │
                              │         human_approval_required  →  SSE broadcast           │
                              └────────────────────────────────┬──────────────────────────┘
                                                               │
                              ┌────────────────────────────────▼──────────────────────────┐
                              │              CascadeAgentEngine  (agent_engine.ts)         │
                              │                                                             │
                              │  Step 0    MCP_CONNECT      CockroachDB MCP Cloud Server   │
                              │  Step 0b   CRDB_SKILL_EXEC  Observability index health     │
                              │  Step 1    CDC_EVENT        Disruption ingested             │
                              │  Step 2    PREDICTIVE_GUARD Risk score 0–99                │
                              │  Step 3    AGENT_MEMORY     1536-dim HNSW vector recall    │
                              │  Step 3c–f FIRST_MILE       Smart bypass: air → rail       │
                              │  Step 4    VECTOR_EXPLAIN   Candidate scoring (HNSW)       │
                              │  Step 5    BRANCH_EVAL      Alpha · Beta · Gamma           │
                              │  Step 5b   HITL_GUARDRAIL   Policy check $300 limit        │
                              │  Step 6–7  SAGA_ROLLBACK    Compensation on major delay    │
                              │  Step 8    BEDROCK_AGENT    Claude 3.5 Sonnet CoT          │
                              │  Step 9    CRDB_ACID        SERIALIZABLE TX commit         │
                              │  Step 10   CASCADE_COMPLETE Proof artifact + Telegram      │
                              └────────────────────────────────┬──────────────────────────┘
                                                               │
                    ┌──────────────────────────┐   ┌───────────▼───────────────────────────┐
                    │   AWS Bedrock             │   │   CockroachDB v23.2 (Serverless)       │
                    │   Claude 3.5 Sonnet       │   │                                        │
                    │   Titan Embed v2 (1536d)  │   │  users              (VECTOR 1536-dim)  │
                    │   InvokeModelCommand      │   │  itineraries        (status graph)     │
                    │   @aws-sdk/client-        │   │  itinerary_segments (graph nodes)      │
                    │   bedrock-runtime         │   │  disruption_events  (CDC queue)        │
                    └──────────────────────────┘   │                                        │
                                                    │  HNSW idx: vector_cosine_ops           │
                    ┌──────────────────────────┐   │  GIN idx:  JSONB preferences           │
                    │   MCP Server (port 3001)  │   │  Changefeed → webhook / polling        │
                    │   @modelcontextprotocol   │   │  SERIALIZABLE isolation                │
                    │   /sdk  (StdioTransport)  │   │  40001 conflict auto-retry             │
                    │                           │   └───────────────────────────────────────┘
                    │   Tools exposed:          │
                    │   get_itinerary_graph     │
                    │   search_user_prefs_vec   │
                    │   update_segment_status   │
                    │   query_transit_avail     │
                    │   estimate_cascade_impact │
                    │   rebook_cascade_segment  │
                    └──────────────────────────┘
```

---

## Key Features

### 1. 3-Step Route Builder Modal

The `POST /api/itinerary/create` endpoint accepts a three-layer trip definition built from the frontend modal:

| Step | Field | Description |
|------|-------|-------------|
| **Step 1 — Traveler** | `travelerName`, `travelerEmail`, `cabinPref`, `strategy` | Profile and corporate policy tier |
| **Step 2 — Route** | `firstMileMode`, `origin`, `destination`, `primaryMode`, `lastMileMode` | Multi-modal leg config (FLIGHT / RAIL / CAR / BUS / SHUTTLE) |
| **Step 3 — Schedule** | `depDate`, `depTime`, `arrDate`, `arrTime` | Departure and arrival windows |

The backend assembles `multiModalWaypoints` and `legs` arrays, persists them to the in-memory traveler fleet, and returns a fully structured itinerary profile ready for disruption simulation.

---

### 2. AWS Bedrock Multi-Agent Engine

The `CascadeAgentEngine` class (`src/services/agent_engine.ts`) implements **six architectural pillars**:

| Pillar | Method | Description |
|--------|--------|-------------|
| **Reactive CDC Healing** | `processDisruption()` | Main 10-step chain-of-thought resolution pipeline |
| **Resource Contention** | `processContention()` | SERIALIZABLE `40001` conflict — two travelers claim the same seat |
| **Smart First-Mile Bypass** | `evaluateFirstMileBypass()` | Replaces delayed flight with High-Speed Rail when delay > 45 min |
| **Human-in-the-Loop** | `approvePendingRebooking()` / `rejectPendingRebooking()` | Halts autonomous commit when cost delta exceeds $300 policy limit |
| **Cascade Chaos Mode** | `processChaos()` | Iterative resolution of 3 simultaneous failures (flight + train + hotel) |
| **Multi-Region Failover** | `processRegionFailover()` | Simulates `us-east-1` → `eu-west-1` CockroachDB region failover |

When AWS credentials are present, the engine invokes `InvokeModelCommand` against `anthropic.claude-3-5-sonnet-20240620-v1:0` for final chain-of-thought synthesis. When absent, it falls back to deterministic heuristics within the same sub-second SLA.

**Multi-branch rebooking scoring:**

```
Branch Alpha  — Speed Priority        (FLIGHT  DL-1990)          Score: 0.74   +$85.00
Branch Beta   — Zero Cost / Carrier   (TRAIN   AMT-175)           Score: 0.82   $0.00
Branch Gamma  — HNSW Preference Win   (TRAIN   AMT-2158 1st Cls)  Score: 0.96   ← WINNER
```

---

### 3. CockroachDB Audit Trail

Every resolved disruption produces an `AuditReportData` artifact (`src/services/audit_report_generator.ts`) containing:

- **Traveler profile** — name, email, cabin preference, HNSW vector score, index name
- **Original itinerary** — all segments with provider, reference code, and status
- **Healed itinerary** — winning branch, strategy, and post-recovery segments
- **Chain-of-thought execution log** — every `AgentActionLog` step with timestamp, tag, agent, and details payload
- **Financial delta** — original cost, rebooking fee, carrier coverage, total delta, policy approval status
- **CockroachDB telemetry** — `txHash`, isolation level (`SERIALIZABLE`), region locality (`us-east-1` · `eu-west-1` · `ap-northeast-1`), CDC event ID, SHA-256 proof signature

The artifact is downloadable as JSON via `GET /api/itinerary/artifact?id=PROOF-REC-XXXXXX` and as a formatted PDF via `GET /api/reports/pdf` (rendered with `pdfkit`).

---

### 4. SSE Event Stream

`GET /api/stream` (`src/web/app.ts`) establishes a persistent `text/event-stream` connection:

| Event | Emitted When |
|-------|-------------|
| `connected` | Client first subscribes |
| `cdc_event` | CDC poll detects a `PENDING` disruption |
| `agent_step` | Each step of `processDisruption()` completes |
| `cascade_healed` | Full resolution report is finalized |
| `human_approval_required` | Cost delta exceeds $300 policy auto-approval limit |

A 15-second keepalive heartbeat (`': keepalive\n\n'`) prevents proxy timeouts. Dead clients are pruned from the `sseClients[]` array on every broadcast.

---

### 5. Telegram Bot Alerts

`src/services/telegram_service.ts` sends formatted HTML messages to `@CascadeAWS_bot` after every disruption resolution:

- **Resolution header** — `✅ CASCADE SELF-HEALED` / `⚠️ HUMAN APPROVAL REQUIRED` / `🔴 REBOOKING REJECTED`
- **Passenger name**, disrupted route (`origin ──▶ destination`), resolution mode + carrier, time recovered, new arrival time
- **Financial impact badge** — colour-coded cost delta
- **CockroachDB proof-of-commit** — transaction hash, isolation level, resolution SLA in milliseconds
- **Inline keyboard button** — deep link to `https://t.me/CascadeAWS_bot`

---

### 6. CockroachDB Vector Search & CDC

**Schema highlights** (`src/db/schema.sql`):

```sql
-- 1536-dimensional preference embeddings with HNSW index
CREATE TABLE users (
    preference_embedding VECTOR(1536),
    preferences          JSONB DEFAULT '{...}'
);
CREATE INDEX idx_users_preference_embedding ON users
    USING hnsw (preference_embedding vector_cosine_ops);

-- Itinerary segment graph with FK chain
CREATE TABLE itinerary_segments (
    previous_segment_id UUID REFERENCES itinerary_segments(id),
    embedding           VECTOR(1536),
    status VARCHAR(50) CHECK (status IN (
        'SCHEDULED','IN_TRANSIT','DELAYED','CANCELLED',
        'RESCHEDULED','REBOOKED','COMPLETED'))
);

-- CDC Changefeed (webhook or polling fallback)
-- CREATE CHANGEFEED FOR TABLE itinerary_segments, disruption_events
-- INTO 'webhook://http://localhost:3000/api/cdc-webhook?...'
-- WITH updated, resolved='10s', format=json;
```

**MCP Tool surface** (`src/mcp/server.ts` — 6 registered tools):

| Tool | Purpose |
|------|---------|
| `get_itinerary_graph` | Fetch full itinerary + user + segments from CockroachDB |
| `search_user_preferences_vector` | Cosine-similarity ANN search over 1536-dim preference embeddings |
| `update_segment_status` | Atomic status update + parent itinerary status cascade |
| `log_disruption_event` | Insert new `PENDING` disruption event into CDC queue |
| `rebook_cascade_segment` | Atomic rebook: update segment, adjust cost, resolve disruption event |
| `estimate_cascade_impact` | Calculate connection viability from delay + buffer parameters |
| `query_transit_availability` | Search mock provider pool (Delta, Amtrak, Hotels, Eurostar) |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | ≥ 18 |
| Language | TypeScript | 5.4 |
| Web framework | Express | 4.19 |
| Database | CockroachDB | v23.2 (pgvector-compatible) |
| DB driver | `pg` (node-postgres) | 8.22 |
| Vector dimensions | Amazon Titan Embed v2 / CockroachDB HNSW | 1536-dim |
| AI reasoning | AWS Bedrock — Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20240620-v1:0` |
| AI SDK | `@aws-sdk/client-bedrock-runtime` | ^3.500 |
| Agent protocol | Model Context Protocol SDK | 1.0 |
| Validation | Zod | 3.23 |
| Notifications | Telegram Bot API | HTTP REST |
| PDF export | PDFKit | 0.19 |
| Testing | Jest + ts-jest | 29 |
| Containerisation | Docker Compose (CockroachDB v23.2.3) | — |

---

## Project Structure

```
cascade-logistics/
├── src/
│   ├── config/
│   │   ├── aws_config.ts           # Bedrock client + credential validation
│   │   └── database.ts             # CockroachDB pool, SERIALIZABLE retry, offline fallback
│   ├── db/
│   │   ├── schema.sql              # Full schema (VECTOR, HNSW, GIN, CDC)
│   │   ├── seed.sql                # Sample travelers, itineraries, segments
│   │   └── seed_runner.ts          # Schema init + seed execution
│   ├── mcp/
│   │   ├── server.ts               # MCP stdio server with 6 registered tools
│   │   └── tools/
│   │       ├── db_tools.ts         # CockroachDB MCP tools
│   │       └── transport_tools.ts  # Transit availability + cascade impact tools
│   ├── services/
│   │   ├── agent_engine.ts         # CascadeAgentEngine — 6-pillar orchestrator (796 lines)
│   │   ├── audit_report_generator.ts   # Post-incident executive audit report
│   │   ├── cdc_listener.ts         # CDC polling + webhook handler + SSE emitter
│   │   ├── disruption_emulator.ts  # Standalone disruption injection CLI
│   │   ├── mcp_client.ts           # MCP client connector
│   │   ├── pdf_report_generator.ts # PDFKit audit report renderer
│   │   └── telegram_service.ts     # Telegram Bot HTML alert builder + sender
│   └── web/
│       ├── app.ts                  # Express server, SSE endpoint, CDC wiring
│       ├── public/
│       │   ├── index.html          # Glassmorphism dashboard SPA (294 KB)
│       │   ├── styles.css          # Dashboard CSS (54 KB)
│       │   └── audit-report-template.html
│       └── routes/
│           ├── disruption.ts       # POST /api/disrupt
│           ├── reports.ts          # GET /api/reports/pdf, /api/itinerary/artifact
│           ├── system.ts           # GET /api/dashboard, /api/health
│           └── travelers.ts        # GET|POST /api/itinerary/* + 3-step modal
├── tests/                          # 12 Jest test files
├── assets/
│   ├── readme/
│   │   ├── hero-banner.svg
│   │   └── architecture-diagram.svg
│   └── pdf-template.html
├── docker-compose.yml              # CockroachDB v23.2.3 single-node
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Installation

### Prerequisites

- Node.js ≥ 18
- CockroachDB Cloud account **or** Docker (for local single-node)
- AWS account with Bedrock access (Claude 3.5 Sonnet enabled in `us-east-1`)
- Telegram Bot token (optional — alerts skipped gracefully if absent)

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/cascade-logistics.git
cd cascade-logistics
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see `.env.example` for all keys).

> **Without AWS credentials** — the agent engine automatically falls back to deterministic heuristics. The full healing pipeline runs; only the final Claude CoT synthesis step is bypassed.
>
> **Without CockroachDB** — the server enters `IS_OFFLINE_FALLBACK` mode and serves all data from in-memory state. Every feature remains fully demonstrable.

### 3. Start CockroachDB (Docker)

```bash
docker-compose up -d
```

Starts CockroachDB v23.2.3 on port `26257`; Admin UI on `8080`.

### 4. Initialise Schema & Seed

```bash
npm run seed
```

### 5. Run the Application

```bash
npm run dev        # hot-reload
# or
npm start          # production
```

Open **http://localhost:3000** for the live dashboard.

### 6. (Optional) Start the MCP Server

```bash
npm run mcp:server
```

Exposes 6 CockroachDB MCP tools over `stdio` transport to any compatible client.

### 7. Run Tests

```bash
npm test
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stream` | SSE event stream (`text/event-stream`) |
| `GET` | `/api/dashboard` | Live fleet metrics + active itineraries |
| `GET` | `/api/health` | CockroachDB + AWS Bedrock health status |
| `POST` | `/api/disrupt` | Trigger a disruption + autonomous healing |
| `POST` | `/api/itinerary/create` | 3-step route builder — create new itinerary |
| `GET` | `/api/itinerary/graph` | Fetch transactional itinerary graph from CRDB |
| `GET` | `/api/itinerary/artifact` | Download proof-of-commit JSON artifact |
| `GET` | `/api/reports/pdf` | Export audit report as PDF |

### Trigger a Disruption

```bash
curl -X POST http://localhost:3000/api/disrupt \
  -H "Content-Type: application/json" \
  -d '{
    "itineraryId": "itin-101",
    "delayMinutes": 150,
    "disruptionType": "FLIGHT_DELAY",
    "strategy": "EXECUTIVE_SPEED"
  }'
```

### High-Cost HITL Guardrail

```bash
curl -X POST http://localhost:3000/api/disrupt \
  -H "Content-Type: application/json" \
  -d '{
    "itineraryId": "itin-101",
    "delayMinutes": 150,
    "strategy": "HIGH_COST_GUARDRAIL",
    "costDelta": 450
  }'
# → status: HUMAN_APPROVAL_REQUIRED  ($450 > $300 auto-approval limit)
# → broadcasts human_approval_required SSE event to all connected clients
```

---

## Seeded Traveler Profiles

| Itinerary | Traveler | Route | Mode Chain | Policy Tier | HNSW Score |
|-----------|----------|-------|------------|-------------|------------|
| `itin-101` | Sarah Jenkins | SFO → LHR | Flight · Train · Hotel · Flight | Executive ($300) | 0.984 |
| `itin-102` | Marcus Vance | JFK → CDG | Flight · TGV Rail · Hotel | VIP Executive ($500) | 0.962 |
| `itin-103` | Elena Rostova | ORD → HND | Flight · Shinkansen · Hotel | Global Ops ($250) | 0.941 |
| `itin-104` | David Chen | MIA → LHR | Flight · Taxi · Hotel | Executive ($300) | 0.975 |
| `itin-105` | Yaroslav Vane | FRA → SIN | Car · Flight · MRT Rail · Hotel | VIP Executive ($500) | 0.991 |
| `itin-106` | Alexander Wright | LHR → FRA | Car · Flight · ICE Rail · Hotel | Executive ($300) | 0.982 |

---

## Disruption Simulation Strategies

| Strategy Key | Behaviour |
|---|---|
| `EXECUTIVE_SPEED` | Fastest rebooking regardless of cost (within $300 policy) |
| `COST_OPTIMIZATION` | Prefers carrier-covered or zero-delta options |
| `HIGH_COST_GUARDRAIL` | Forces cost delta above policy limit to demonstrate HITL approval flow |

---

## License

MIT © CASCADE Team
