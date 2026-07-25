-- ==============================================================================
-- CASCADE Seed Data Script
-- Populates demo User Profiles, Multi-Modal Itineraries, Connected Segment Graph,
-- and Vector Embeddings for Hackathon Demonstrations
-- ==============================================================================

-- 1. Insert Demo User (Sarah Jenkins - Frequent Executive Traveler)
INSERT INTO users (id, name, email, phone, preferences)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Sarah Jenkins',
    'sarah.jenkins@acme.com',
    '+1-555-019-2834',
    '{
        "preferred_cabin": "business",
        "max_layover_hours": 3,
        "transit_mode_priority": ["FLIGHT", "TRAIN", "TAXI", "HOTEL"],
        "seat_preference": "aisle",
        "hotel_min_stars": 4,
        "auto_rebook_threshold_min": 30,
        "preferred_train_class": "first_class"
    }'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Itinerary (San Francisco -> New York -> London Executive Trip)
INSERT INTO itineraries (id, user_id, title, status, origin, destination, start_time, end_time, total_cost)
VALUES (
    'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Transatlantic Multi-Modal Conference Itinerary',
    'SCHEDULED',
    'San Francisco (SFO)',
    'London Heathrow (LHR)',
    NOW() + INTERVAL '12 hours',
    NOW() + INTERVAL '48 hours',
    2850.00
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert Travel Graph Segments (Flight DL-1402 -> Amtrak Train AMT-2150 -> Hilton Hotel -> Flight BA-178)
-- Leg 1: Flight SFO -> JFK (Delta Airlines)
INSERT INTO itinerary_segments (
    id, itinerary_id, sequence_order, segment_type, provider, reference_code,
    origin, destination, scheduled_departure, scheduled_arrival, status, previous_segment_id, metadata
) VALUES (
    'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
    'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
    1,
    'FLIGHT',
    'Delta Air Lines',
    'DL-1402',
    'SFO (San Francisco)',
    'JFK (New York)',
    NOW() + INTERVAL '12 hours',
    NOW() + INTERVAL '17 hours',
    'SCHEDULED',
    NULL,
    '{"flight_number": "DL1402", "seat": "3B", "cabin": "First Class", "gate": "A12"}'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Leg 2: High-Speed Train JFK/Moynihan -> Philadelphia Conference Center (Amtrak Acela)
INSERT INTO itinerary_segments (
    id, itinerary_id, sequence_order, segment_type, provider, reference_code,
    origin, destination, scheduled_departure, scheduled_arrival, status, previous_segment_id, metadata
) VALUES (
    'd3fbc999-6c0b-4ef8-bb6d-9bb9bd380a44',
    'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
    2,
    'TRAIN',
    'Amtrak Acela Express',
    'AMT-2150',
    'NY Moynihan Train Hall',
    'Philadelphia 30th St',
    NOW() + INTERVAL '18 hours 30 minutes',
    NOW() + INTERVAL '19 hours 45 minutes',
    'SCHEDULED',
    'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
    '{"train_number": "2150", "car": "Quiet Car 2", "seat": "11A", "buffer_time_mins": 90}'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Leg 3: Luxury Hotel Accommodation (The Ritz-Carlton Philadelphia)
INSERT INTO itinerary_segments (
    id, itinerary_id, sequence_order, segment_type, provider, reference_code,
    origin, destination, scheduled_departure, scheduled_arrival, status, previous_segment_id, metadata
) VALUES (
    'e4fbc999-5c0b-4ef8-bb6d-0bb9bd380a55',
    'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
    3,
    'HOTEL',
    'Ritz-Carlton Philadelphia',
    'HTL-9921',
    'Philadelphia Downtown',
    'Philadelphia Downtown',
    NOW() + INTERVAL '20 hours 15 minutes',
    NOW() + INTERVAL '36 hours',
    'SCHEDULED',
    'd3fbc999-6c0b-4ef8-bb6d-9bb9bd380a44',
    '{"room_type": "Executive King Suite", "late_checkin_guaranteed": true}'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Leg 4: Return Flight PHL -> LHR (British Airways)
INSERT INTO itinerary_segments (
    id, itinerary_id, sequence_order, segment_type, provider, reference_code,
    origin, destination, scheduled_departure, scheduled_arrival, status, previous_segment_id, metadata
) VALUES (
    'f5fbc999-4c0b-4ef8-bb6d-1bb9bd380a66',
    'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
    4,
    'FLIGHT',
    'British Airways',
    'BA-178',
    'PHL (Philadelphia)',
    'LHR (London Heathrow)',
    NOW() + INTERVAL '39 hours',
    NOW() + INTERVAL '46 hours',
    'SCHEDULED',
    'e4fbc999-5c0b-4ef8-bb6d-0bb9bd380a55',
    '{"flight_number": "BA178", "seat": "4K", "cabin": "Club World"}'::JSONB
) ON CONFLICT (id) DO NOTHING;
