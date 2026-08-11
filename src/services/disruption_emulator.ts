import { query, withTransaction, checkDatabaseConnection } from '../config/database.js';

export interface DisruptionSimulationResult {
  disruptionId: string;
  itineraryId: string;
  segmentId: string;
  segmentCode: string;
  delayMinutes: number;
  message: string;
}


export async function simulateFlightDisruption(
  segmentReference: string = 'DL-1402',
  delayMinutes: number = 150
): Promise<DisruptionSimulationResult> {
  console.log(`Emulating Flight Disruption: Flight ${segmentReference} delayed by ${delayMinutes} minutes...`);

  return await withTransaction(async (client) => {

    const segRes = await client.query(
      `SELECT id, itinerary_id, provider, reference_code, origin, destination 
       FROM itinerary_segments 
       WHERE reference_code = $1 OR reference_code LIKE $2 
       LIMIT 1`,
      [segmentReference, `%${segmentReference}%`]
    );

    if (segRes.rows.length === 0) {
      throw new Error(`Target segment '${segmentReference}' not found in CockroachDB.`);
    }

    const segment = segRes.rows[0];


    await client.query(
      `UPDATE itinerary_segments 
       SET status = 'DELAYED', delay_minutes = $1, updated_at = clock_timestamp() 
       WHERE id = $2`,
      [delayMinutes, segment.id]
    );


    await client.query(
      `UPDATE itineraries 
       SET status = 'DISRUPTED', updated_at = clock_timestamp() 
       WHERE id = $1`,
      [segment.itinerary_id]
    );


    const eventRes = await client.query(
      `INSERT INTO disruption_events (
        itinerary_id, segment_id, event_type, delay_minutes, impact_description, status
       ) VALUES ($1, $2, 'FLIGHT_DELAY', $3, $4, 'PENDING')
       RETURNING id`,
      [
        segment.itinerary_id,
        segment.id,
        delayMinutes,
        `Severe weather delay of ${delayMinutes} minutes reported for Flight ${segment.reference_code} (${segment.origin} -> ${segment.destination})`,
      ]
    );

    const disruptionId = eventRes.rows[0].id;

    console.log(`CockroachDB CDC Event Emitted! Disruption ID: ${disruptionId}`);

    return {
      disruptionId,
      itineraryId: segment.itinerary_id,
      segmentId: segment.id,
      segmentCode: segment.reference_code,
      delayMinutes,
      message: `Disruption successfully injected into CockroachDB for ${segment.reference_code}. CDC event generated.`,
    };
  });
}


if (process.argv[1]?.includes('disruption_emulator')) {
  (async () => {
    const isAlive = await checkDatabaseConnection();
    if (!isAlive) {
      console.error('Database not reachable.');
      process.exit(1);
    }
    const flightRef = process.argv[2] || 'DL-1402';
    const delayMins = parseInt(process.argv[3] || '150', 10);
    await simulateFlightDisruption(flightRef, delayMins);
    process.exit(0);
  })();
}
