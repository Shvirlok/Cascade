import { query, withTransaction, formatVector } from '../../config/database.js';

export interface ItineraryGraphResult {
  itinerary: any;
  user: any;
  segments: any[];
}

export async function getItineraryGraph(itineraryId: string): Promise<ItineraryGraphResult> {
  const itinResult = await query(
    `SELECT * FROM itineraries WHERE id = $1`,
    [itineraryId]
  );

  if (itinResult.rows.length === 0) {
    throw new Error(`Itinerary not found for ID: ${itineraryId}`);
  }

  const itinerary = itinResult.rows[0];

  const userResult = await query(
    `SELECT id, name, email, preferences FROM users WHERE id = $1`,
    [itinerary.user_id]
  );
  const user = userResult.rows[0];

  const segmentsResult = await query(
    `SELECT 
      id, itinerary_id, sequence_order, segment_type, provider, reference_code,
      origin, destination, scheduled_departure, scheduled_arrival, actual_departure, actual_arrival,
      delay_minutes, status, previous_segment_id, metadata
     FROM itinerary_segments 
     WHERE itinerary_id = $1 
     ORDER BY sequence_order ASC`,
    [itineraryId]
  );

  return { itinerary, user, segments: segmentsResult.rows };
}

export async function searchUserPreferencesVector(
  userId: string,
  targetEmbedding: number[],
  topK: number = 3
): Promise<any[]> {
  const vecParam = formatVector(targetEmbedding);
  const sql = `
    SELECT id, name, preferences,
      (preference_embedding <=> $1::VECTOR(1536)) AS distance
    FROM users 
    WHERE id = $2
    ORDER BY distance ASC
    LIMIT $3;
  `;
  const result = await query(sql, [vecParam, userId, topK]);
  return result.rows;
}

export async function updateSegmentStatus(
  segmentId: string,
  status: string,
  delayMinutes: number = 0
): Promise<any> {
  return await withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE itinerary_segments 
       SET status = $1, delay_minutes = $2, updated_at = clock_timestamp()
       WHERE id = $3
       RETURNING *`,
      [status, delayMinutes, segmentId]
    );

    if (res.rows.length === 0) {
      throw new Error(`Segment with ID ${segmentId} not found`);
    }

    const updatedSeg = res.rows[0];

    if (status === 'DELAYED' || status === 'CANCELLED') {
      await client.query(
        `UPDATE itineraries 
         SET status = 'DISRUPTED', updated_at = clock_timestamp() 
         WHERE id = $1`,
        [updatedSeg.itinerary_id]
      );
    }

    return updatedSeg;
  });
}

export async function logDisruptionEvent(
  itineraryId: string,
  segmentId: string,
  eventType: string,
  delayMinutes: number,
  impactDescription: string
): Promise<any> {
  const sql = `
    INSERT INTO disruption_events (
      itinerary_id, segment_id, event_type, delay_minutes, impact_description, status
    ) VALUES ($1, $2, $3, $4, $5, 'PENDING')
    RETURNING *;
  `;
  const res = await query(sql, [itineraryId, segmentId, eventType, delayMinutes, impactDescription]);
  return res.rows[0];
}

export async function rebookCascadeSegment(
  segmentId: string,
  newProvider: string,
  newReferenceCode: string,
  newDeparture: string,
  newArrival: string,
  additionalCost: number = 0,
  newMetadata: object = {}
): Promise<any> {
  return await withTransaction(async (client) => {
    const segRes = await client.query(
      `UPDATE itinerary_segments 
       SET provider = $1, 
           reference_code = $2, 
           scheduled_departure = $3::TIMESTAMPTZ, 
           scheduled_arrival = $4::TIMESTAMPTZ, 
           status = 'REBOOKED', 
           delay_minutes = 0,
           metadata = metadata || $5::JSONB,
           updated_at = clock_timestamp()
       WHERE id = $6
       RETURNING *`,
      [newProvider, newReferenceCode, newDeparture, newArrival, JSON.stringify(newMetadata), segmentId]
    );

    if (segRes.rows.length === 0) {
      throw new Error(`Segment ${segmentId} not found for rebooking`);
    }

    const rebookedSeg = segRes.rows[0];

    await client.query(
      `UPDATE itineraries 
       SET total_cost = total_cost + $1, 
           status = 'SELF_HEALED', 
           updated_at = clock_timestamp() 
       WHERE id = $2`,
      [additionalCost, rebookedSeg.itinerary_id]
    );

    await client.query(
      `UPDATE disruption_events 
       SET status = 'RESOLVED', 
           agent_resolution_details = $1::JSONB,
           resolved_at = clock_timestamp()
       WHERE segment_id = $2 AND status IN ('PENDING', 'PROCESSING')`,
      [JSON.stringify({ rebooked_provider: newProvider, reference: newReferenceCode, cost_delta: additionalCost }), segmentId]
    );

    return rebookedSeg;
  });
}
