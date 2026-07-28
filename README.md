<div align="center">

![CASCADE Hero Banner](assets/readme/hero-banner.svg)

# CASCADE ⚡
### Autonomous Executive Travel & Multi-Modal Logistics Recovery Engine
*Built for the CockroachDB × AWS Hackathon on Devpost*

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![CockroachDB](https://img.shields.io/badge/CockroachDB-Serverless-6933FF?style=for-the-badge&logo=cockroachlabs&logoColor=white)](https://www.cockroachlabs.com/)
[![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-Claude_3.5_Sonnet-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![MCP SDK](https://img.shields.io/badge/Model_Context_Protocol-SDK_1.0-10B981?style=for-the-badge&logo=open-ai&logoColor=white)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 🌟 Executive Summary & Enterprise Value Proposition

**CASCADE** is an autonomous, self-healing executive travel and multi-modal logistics recovery engine powered by **CockroachDB Cloud Change Data Capture (CDC)**, **1536-dimensional HNSW vector search**, and **AWS Bedrock Claude 3.5 Sonnet** multi-agent orchestration.

In real-world travel, a single flight delay sets off a catastrophic domino effect—causing missed train connections, invalidated hotel check-in windows, and stranded travelers. Standard travel platforms leave executives trapped in manual customer service queues. **CASCADE** eliminates manual intervention by turning user itineraries into ACID-compliant transactional graphs in CockroachDB that automatically recalculate, rebook, and self-heal downstream legs in **under 392ms**.

---

## ⚡ Key Capabilities & Verified Performance

| Feature Layer | Core Mechanism | Verified Tech & Specification |
| :--- | :--- | :--- |
| **Reactive CDC Engine** | Zero-Polling Changefeeds | Streams database mutations from CockroachDB to Node.js listener instant webhook. |
| **Vector Memory Recall** | HNSW Cosine Similarity | `VECTOR(1536)` embeddings matching cabin, quiet car, and layover tolerances (`vector_cosine_ops`). |
| **Multi-Agent Engine** | AWS Bedrock Orchestration | Risk evaluation, layover buffer calculation, and CoT reasoning powered by Claude 3.5 Sonnet. |
| **MCP Standard Tooling** | Protocol Tool API | 6 registered MCP tools (`get_itinerary_graph`, `search_user_preferences_vector`, etc.). |
| **Transaction Safety** | SERIALIZABLE Isolation | Atomic multi-segment rebooking with automatic CockroachDB `40001` conflict retry & Saga rollback. |
| **Live UI Visualizer** | SSE Event Streaming | Interactive glassmorphism dashboard with Leaflet.js & Turf.js great-circle route animation. |

---

## 🎯 What & Why: The Autonomous Self-Healing Mechanism

### The Problem: Travel Disruption Cascade
When a flight leg (`DL-1402`) experiences a 2.5-hour delay:
1. **Upstream Disruption**: Flight arrives late at Moynihan Transit Hub.
2. **Downstream Breakage**: Executive misses connecting Amtrak Acela train (`AMT-2150`).
3. **Tertiary Failure**: Hotel check-in window expires, and car shuttle reservation is lost.
4. **Legacy Failure**: Traditional systems require manual human rebooking, resulting in hours of delay.

```
[ Flight DL-1402 Delay (+150m) ] ➔ 💥 [ Missed Amtrak Train 2150 ] ➔ 💥 [ Cancelled Hotel Window ]
```

### The Solution: CASCADE Autonomous Self-Healing
CASCADE turns passive itineraries into active, reactive state graphs:
1. **CDC Mutation**: Delay update in CockroachDB fires a real-time Changefeed event.
2. **Vector Preference Search**: AI agents query CockroachDB using 1536-dim HNSW vector search to pull executive travel preferences (e.g. First Class Quiet Car, layover buffer > 60m).
3. **Multi-Branch Candidate Evaluation**: Agents evaluate candidate rebooking branches (Branch Alpha, Beta, Gamma) and select the highest HNSW match score.
4. **Atomic Rebooking**: Rebooked legs are committed inside a CockroachDB `SERIALIZABLE` transaction with automatic conflict resolution.

```
[ CDC Event ] ➔ [ 1536-Dim HNSW Vector Recall ] ➔ [ Bedrock Branch Evaluation ] ➔ [ SERIALIZABLE Rebook (<392ms) ]
```

---

## 🏗️ End-to-End System Architecture

<div align="center">

![CASCADE Architecture Diagram](assets/readme/architecture-diagram.svg)

</div>

### Architectural Pipeline Breakdown

#### 1. Transactional Route Graph (CockroachDB Cloud)
User itineraries are modeled as linked graph nodes inside `itinerary_segments`. Each node contains spatial parameters, temporal schedules, execution statuses, and preceding node pointers (`previous_segment_id`).

#### 2. Change Data Capture (CDC) Changefeeds
CockroachDB Changefeeds stream row-level `UPDATE` mutations on `itinerary_segments` and `disruption_events` to the CASCADE CDC Listener service without database polling.

#### 3. AWS Bedrock Multi-Agent Engine
The orchestrator executes multi-agent reasoning:
- **Risk Engine**: Calculates disruption severity scores and adds pre-emptive layover buffers (+45m).
- **Vector Agent**: Executes cosine similarity search over `users.preference_embedding VECTOR(1536)` using CockroachDB's HNSW index (`idx_users_preference_embedding`).
- **Branch Evaluator**: Compares candidate strategies:
  - `Branch Alpha (Speed Priority)`: Score 0.74
  - `Branch Beta (Zero Cost)`: Score 0.82
  - `Branch Gamma (HNSW Vector Winner)`: Score 0.96 (Amtrak Acela First Class Quiet Car)

#### 4. Model Context Protocol (MCP) Server
Exposes standardized tool interfaces over Stdio/HTTP transport to Bedrock agents:

| MCP Tool Name | Purpose & Inputs | Output |
| :--- | :--- | :--- |
| `get_itinerary_graph` | Fetches route nodes and edges for `itinerary_id` | Complete graph representation |
| `search_user_preferences_vector` | Executes 1536-dim cosine similarity search in CockroachDB | Top-K nearest preference matches |
| `update_segment_status` | Updates segment status and delay minutes | Updated segment status |
| `query_transit_availability` | Searches external transit providers (Amtrak, Delta, Hotels) | Available transit options |
| `estimate_cascade_impact` | Calculates downstream connecting leg buffer overlap | Impact diagnosis & slack window |
| `rebook_cascade_segment` | Atomically replaces broken segment in CockroachDB transaction | Committed rebooked segment |

#### 5. Transactional Safety & Serialization Failure Handling
Multi-agent rebookings run under `SERIALIZABLE` isolation. Concurrent seat claim conflicts automatically trigger CockroachDB error `40001_SERIALIZATION_FAILURE` handling, executing clean retries and Saga transaction rollbacks.

#### 6. Live Dashboard Visualizer (Leaflet.js + SSE)
Express streams Server-Sent Events (SSE) to the glassmorphism frontend. Leaflet.js and Turf.js calculate great-circle flight arcs, render real-time graph node state shifts, and display live agent Chain-of-Thought execution logs.

---

## 💻 Quickstart Setup & Execution Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **CockroachDB**: CockroachDB Cloud Serverless account OR local Docker container

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/cascade.git
cd cascade
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your CockroachDB connection string and AWS credentials:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

### 3. Run Database Migration & Vector Seeding
Seed CockroachDB schema, HNSW vector indices, and 1536-dimensional user preference embeddings:
```bash
npm run seed
```

### 4. Start the Application
Launch the Express server and SSE engine:
```bash
npm start
```
Open **`http://localhost:3000`** in your browser to access the live glassmorphism visualizer.

### 5. Trigger Live Disruption Demo
Click the **"Simulate 2.5h Flight Delay (DL-1402)"** button on the UI, or execute via CLI in a separate terminal:
```bash
npm run emulator
```

### 6. Additional Engine Commands

```bash
# Run Model Context Protocol (MCP) Server standalone over stdio
npm run mcp:server

# Run CockroachDB CDC Changefeed Listener standalone
npm run cdc:listener

# Run automated test suite (Jest)
npm test
```

---

## 📂 Repository Structure

```
cascade/
├── assets/
│   └── readme/
│       ├── hero-banner.svg          # Pure SVG hero banner graphic
│       └── architecture-diagram.svg # End-to-end system architecture SVG
├── src/
│   ├── config/
│   │   ├── database.ts              # CockroachDB pool & serializable transaction runner
│   │   └── aws_config.ts            # AWS Bedrock runtime client configuration
│   ├── db/
│   │   ├── schema.sql               # CockroachDB schema (VECTOR(1536), HNSW index, DDL)
│   │   ├── seed.sql                 # Base itinerary graph seed data
│   │   └── seed_runner.ts           # Migration runner & 1536-dim embedding generator
│   ├── mcp/
│   │   ├── server.ts                # Model Context Protocol (MCP) server
│   │   └── tools/
│   │       ├── db_tools.ts          # CockroachDB graph queries & vector search tools
│   │       └── transport_tools.ts   # Transit availability & impact estimation tools
│   ├── services/
│   │   ├── agent_engine.ts          # AWS Bedrock multi-agent orchestrator & CoT engine
│   │   ├── cdc_listener.ts          # CockroachDB Changefeed event listener service
│   │   └── disruption_emulator.ts   # CLI disruption injection utility
│   └── web/
│       ├── app.ts                   # Express server & SSE event hub
│       └── public/
│           ├── index.html           # Glassmorphism dashboard UI
│           └── styles.css           # Custom CSS styling tokens
└── tests/
    ├── cdc.test.ts                  # CDC listener & impact estimation unit tests
    └── agent.test.ts                # Agent engine & MCP tool integration tests
```

---

## 🧪 Automated Test Suite

Run the full integration and unit test suite:
```bash
npm test
```
The test suite verifies:
- `tests/cdc.test.ts`: Connection buffer calculations, lag detection, and delay impact assessment logic.
- `tests/agent.test.ts`: Agent fallback execution, MCP tool responses, and vector similarity ranking.

---

## 🏆 Hackathon Submission Checklist

- [x] **CockroachDB Cloud Integration**: Full serverless SQL schema with graph relationships.
- [x] **Vector Search Engine**: `VECTOR(1536)` types, HNSW index (`idx_users_preference_embedding`), and cosine similarity (`vector_cosine_ops`).
- [x] **Change Data Capture (CDC)**: Zero-polling Changefeeds for real-time disruption detection.
- [x] **AWS Bedrock AI Integration**: Multi-agent reasoning powered by Claude 3.5 Sonnet.
- [x] **Model Context Protocol (MCP)**: 6 registered tools exposed via standard MCP SDK interfaces.
- [x] **ACID Resilience**: CockroachDB `SERIALIZABLE` isolation with `40001` retry and Saga rollback handling.
- [x] **Real-Time Web Visualizer**: SSE-powered glassmorphism dashboard with Leaflet.js route maps.
- [x] **Comprehensive Documentation**: Complete setup instructions and architecture SVGs.

---

<div align="center">

*Built with ❤️ for the CockroachDB × AWS Hackathon*

</div>
