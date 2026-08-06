import { jest } from '@jest/globals';
import { generateAuditReport } from '../src/services/audit_report_generator';

describe('Executive PDF Audit Export Unit Tests', () => {
  it('should compile complete AuditReportData structure for B2B PDF rendering', () => {
    const report = generateAuditReport({
      incidentId: 'PROOF-REC-884910',
      travelerProfile: {
        name: 'Marcus Vance',
        email: 'marcus.vance@acme.com',
        preferredCabin: 'First Class Quiet Car',
        seatPreference: 'Window Row 1',
        hnswVectorScore: 0.989,
        vectorIndex: 'idx_users_preference_embedding (HNSW 1536-dim)',
      },
      originalItinerary: {
        tripTitle: 'Marcus Vance — JFK ➔ CDG',
        origin: 'JFK',
        destination: 'CDG',
        segments: [
          { type: 'FLIGHT', provider: 'Air France', referenceCode: 'AF-007', route: 'JFK → CDG', status: 'DELAYED' },
        ],
      },
    });

    expect(report.incidentId).toBe('PROOF-REC-884910');
    expect(report.travelerProfile.name).toBe('Marcus Vance');
    expect(report.cockroachDbTelemetry.txHash).toBeDefined();
    expect(report.cockroachDbTelemetry.isolationLevel).toBe('SERIALIZABLE');
    expect(report.financialDelta.policyStatus).toBe('AUTO_APPROVED');
  });
});
