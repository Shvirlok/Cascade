import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAuditReport } from '../services/audit_report_generator.js';
import { generateAuditPdf } from '../services/pdf_report_generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--output');
  const out = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : path.join(process.cwd(), 'out', 'audit-report.pdf');
  return { out };
}

async function main() {
  try {
    const { out } = parseArgs();
    const outDir = path.dirname(out);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    console.log('Generating PDF...', { out });

    const report = generateAuditReport({
      incidentId: `PROOF-REC-${Math.floor(100000 + Math.random() * 900000)}`,
      travelerProfile: {
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@acme.com',
        preferredCabin: 'Business Class',
        seatPreference: 'Aisle (Quiet Car / Front Row)',
        hnswVectorScore: 0.984,
        vectorIndex: 'idx_users_preference_embedding (HNSW 1536-dim)',
      },
      originalItinerary: {
        tripTitle: 'Transatlantic Multi-Modal Executive Trip',
        origin: 'SFO (San Francisco)',
        destination: 'LHR (London Heathrow)',
        segments: [
          { type: 'FLIGHT', provider: 'Delta Air Lines', referenceCode: 'DL-1402', route: 'SFO → JFK', status: 'DELAYED' },
          { type: 'TRAIN', provider: 'Amtrak Acela Express', referenceCode: 'AMT-2150', route: 'NY Moynihan → PHL 30th St', status: 'MISSED' },
          { type: 'HOTEL', provider: 'Ritz-Carlton Philadelphia', referenceCode: 'HTL-9921', route: 'Philadelphia Downtown', status: 'SCHEDULED' },
          { type: 'FLIGHT', provider: 'British Airways', referenceCode: 'BA-178', route: 'PHL → LHR', status: 'SCHEDULED' },
        ],
      },
    });

    const pdfBuffer = await generateAuditPdf(report);
    fs.writeFileSync(out, pdfBuffer);
    console.log('PDF generated at', out);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${__filename}`) {
  main();
}
