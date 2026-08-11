-- ==============================================================================
-- CASCADE: Resilient Multi-Agent Logistics & Travel Orchestration Engine
-- CockroachDB Cloud SQL Schema with Vector Search, Graph Relations & CDC Changefeeds
-- Dialect: CockroachDB v23.2+ / PostgreSQL Compatible
-- ==============================================================================

-- 1. Enable Vector Extension (pgvector compatible syntax for CockroachDB)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Clean existing tables if re-initializing (Order respects FK constraints)
DROP TABLE IF EXISTS disruption_events CASCADE;
DROP TABLE IF EXISTS itinerary_segments CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Users Table (Stores user profiles and vector-embedded preferences)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    -- Vector embedding (1536 dimensions for OpenAI/Bedrock Titan embeddings)
    preference_embedding VECTOR(1536),
    -- Structured preference metadata for fast filtering
    preferences JSONB DEFAULT '{
        "preferred_cabin": "business",
        "max_layover_hours": 4,
        "transit_mode_priority": ["FLIGHT", "TRAIN", "TAXI", "HOTEL"],
        "seat_preference": "window",
        "hotel_min_stars": 4,
        "auto_rebook_threshold_min": 30
    }'::JSONB,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 4. Itineraries Table (Root transactional container for multi-modal routes)
CREATE TABLE itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK (
        status IN ('SCHEDULED', 'IN_TRANSIT', 'DISRUPTED', 'RECALCULATING', 'SELF_HEALED', 'COMPLETED', 'CANCELLED')
    ),
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_cost DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 5. Itinerary Segments Table (Transactional graph nodes and edges)
-- Each segment represents a travel leg (Flight -> Train -> Hotel) linked to previous node
CREATE TABLE itinerary_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    
    -- Segment type and details
    segment_type VARCHAR(50) NOT NULL CHECK (
        segment_type IN ('FLIGHT', 'TRAIN', 'HOTEL', 'TAXI', 'RENTAL_CAR')
    ),
    provider VARCHAR(100) NOT NULL,            -- e.g., 'Delta Air Lines', 'Amtrak', 'Hilton'
    reference_code VARCHAR(100) NOT NULL,        -- e.g., 'DL-1402', 'AMT-904', 'HTL-8821'
    
    -- Geographic & Routing parameters
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    
    -- Temporal parameters (ACID lockable during agent updates)
    scheduled_departure TIMESTAMPTZ NOT NULL,
    scheduled_arrival TIMESTAMPTZ NOT NULL,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    delay_minutes INT DEFAULT 0,
    
    -- Segment Execution Status
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK (
        status IN ('SCHEDULED', 'IN_TRANSIT', 'DELAYED', 'CANCELLED', 'RESCHEDULED', 'REBOOKED', 'COMPLETED')
    ),
    
    -- Transactional Graph relation (pointing to preceding segment node)
    previous_segment_id UUID REFERENCES itinerary_segments(id) ON DELETE SET NULL,
    
    -- Segment preference embedding for similarity vector search
    embedding VECTOR(1536),
    
    -- Additional metadata (e.g. seat details, room type, cancellation policies)
    metadata JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    
    CONSTRAINT unique_itinerary_sequence UNIQUE (itinerary_id, sequence_order)
);

-- 6. Disruption Events Table (Logs incoming CDC disruptions and agent intervention outcomes)
CREATE TABLE disruption_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES itinerary_segments(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('FLIGHT_DELAY', 'FLIGHT_CANCELLED', 'TRAIN_DELAY', 'MISSED_CONNECTION', 'WEATHER_ALERT')
    ),
    delay_minutes INT DEFAULT 0,
    impact_description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'PROCESSING', 'RESOLVED', 'MANUAL_INTERVENTION_REQUIRED', 'FAILED')
    ),
    agent_resolution_details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    resolved_at TIMESTAMPTZ
);

-- 7. High-Performance Indices for Querying & Vector Search
CREATE INDEX idx_itineraries_user ON itineraries(user_id);
CREATE INDEX idx_itineraries_status ON itineraries(status);
CREATE INDEX idx_segments_itinerary ON itinerary_segments(itinerary_id, sequence_order);
CREATE INDEX idx_segments_status ON itinerary_segments(status);
CREATE INDEX idx_segments_prev_segment ON itinerary_segments(previous_segment_id);
CREATE INDEX idx_disruptions_status ON disruption_events(status);
CREATE INDEX idx_disruptions_itinerary ON disruption_events(itinerary_id);

-- CockroachDB GIN Index for fast JSONB metadata querying
CREATE INDEX idx_users_preferences_gin ON users USING gin (preferences);

-- CockroachDB HNSW Vector Index for fast approximate nearest neighbor (ANN) search
CREATE INDEX idx_users_preference_embedding ON users USING hnsw (preference_embedding vector_cosine_ops);
CREATE INDEX idx_segments_embedding ON itinerary_segments USING hnsw (embedding vector_cosine_ops);

-- 8. CockroachDB Changefeed Initialization (CDC)
-- NOTE: For CockroachDB Cloud Serverless or Enterprise, Changefeeds stream database changes
-- into Kafka, AWS Kinesis, Webhook endpoints, or logical listeners.
-- The statement below configures a webhook sink changefeed for live status shifts.
-- 
-- Example statement to execute in CockroachDB CLI:
-- CREATE CHANGEFEED FOR TABLE itinerary_segments, disruption_events
-- INTO 'webhook://http://localhost:3000/api/cdc-webhook?insecure_tls_skip_verify=true'
-- WITH updated, resolved='10s', format=json;
