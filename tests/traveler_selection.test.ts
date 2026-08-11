import { jest } from '@jest/globals';
import { generateAuditReport } from '../src/services/audit_report_generator';

describe('Traveler Selection & Dynamic Profile Unit Tests', () => {
  it('should compile personalized audit report data for custom traveler context', () => {
    const report = generateAuditReport({
      incidentId: 'INC-TEST-001',
      travelerProfile: {
        name: 'Marcus Vance',
        email: 'marcus.vance@acme.com',
        preferredCabin: 'First Class Quiet Car',
        seatPreference: 'Window',
        hnswVectorScore: 0.991,
        vectorIndex: 'idx_users_preference_embedding',
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

    expect(report.incidentId).toBe('INC-TEST-001');
    expect(report.travelerProfile.name).toBe('Marcus Vance');
    expect(report.originalItinerary.origin).toBe('JFK');
    expect(report.originalItinerary.destination).toBe('CDG');
  });
});
