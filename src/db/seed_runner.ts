import fs from 'fs';
import path from 'path';
import { pool, checkDatabaseConnection, formatVector } from '../config/database.js';

/**
 * Generate synthetic 1536-dimensional normalized vector array
 */
function generateDummyVector(seedStr: string): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const vec: number[] = [];
  let normSq = 0;
  for (let i = 0; i < 1536; i++) {
    const val = Math.sin(hash + i * 0.1);
    vec.push(val);
    normSq += val * val;
  }
  
  // Normalize vector to unit magnitude for cosine similarity
  const norm = Math.sqrt(normSq);
  return vec.map((v) => v / norm);
}

export async function runSeed(): Promise<void> {
  console.log('Starting CockroachDB CASCADE Database Migration and Seed...');

  const isAlive = await checkDatabaseConnection();
  if (!isAlive) {
    console.error('Cannot connect to CockroachDB. Please check your DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    const schemaSqlPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const seedSqlPath = path.join(process.cwd(), 'src', 'db', 'seed.sql');

    console.log('Executing DDL Schema (`schema.sql`)...');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    await pool.query(schemaSql);
    console.log('CockroachDB tables and vector indices created.');

    console.log('Executing Seed SQL (`seed.sql`)...');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
    await pool.query(seedSql);
    console.log('Base user and itinerary records seeded.');

    // Inject Vector Embeddings for Vector Search demonstration
    console.log('Injecting 1536-dim vector embeddings into user and segment records...');
    
    // User preference embedding (Executive traveler profile vector)
    const userVector = generateDummyVector('executive_traveler_preference');
    await pool.query(
      `UPDATE users SET preference_embedding = $1::VECTOR(1536) WHERE email = 'sarah.jenkins@acme.com'`,
      [formatVector(userVector)]
    );

    // Segment vectors
    const segments = await pool.query('SELECT id, provider, segment_type FROM itinerary_segments');
    for (const seg of segments.rows) {
      const vec = generateDummyVector(`segment_${seg.segment_type}_${seg.provider}`);
      await pool.query(
        `UPDATE itinerary_segments SET embedding = $1::VECTOR(1536) WHERE id = $2`,
        [formatVector(vec), seg.id]
      );
    }

    console.log('Seed completed successfully! CASCADE engine ready for disruptions.');
  } catch (err: any) {
    console.error('Migration and seed failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Allow direct execution
if (process.argv[1]?.includes('seed_runner')) {
  runSeed().catch(() => process.exit(1));
}
