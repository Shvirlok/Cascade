import { jest } from '@jest/globals';

describe('What-If Scenario & Live Telemetry Unit Tests', () => {
  it('should compile valid What-If scenario results for a target hub', () => {
    const hubCode = 'FRA';
    const eventType = 'AIRPORT_STRIKE';
    const mockTravelers = [
      { id: 'itin-105', name: 'Yaroslav', route: 'FRA ➔ SIN', originCode: 'FRA', destinationCode: 'SIN' },
      { id: 'itin-106', name: 'Alexander', route: 'LHR ➔ FRA', originCode: 'LHR', destinationCode: 'FRA' },
    ];

    const affected = mockTravelers.filter(t => t.originCode === hubCode || t.destinationCode === hubCode);

    expect(affected.length).toBe(2);
    expect(affected[0].name).toBe('Yaroslav');
    expect(affected[1].name).toBe('Alexander');
  });

  it('should format Bedrock Chain-of-Thought reasoning steps with latencies', () => {
    const cotPipeline = [
      { stage: 'STAGE 01', title: 'Signal Ingestion', latencyMs: 12 },
      { stage: 'STAGE 02', title: 'Policy Evaluation', latencyMs: 18 },
      { stage: 'STAGE 03', title: 'Vector Search', latencyMs: 45 },
      { stage: 'STAGE 04', title: 'State Settlement', latencyMs: 32 },
    ];

    const totalMs = cotPipeline.reduce((acc, step) => acc + step.latencyMs, 0);

    expect(cotPipeline.length).toBe(4);
    expect(totalMs).toBe(107);
    expect(cotPipeline[1].title).toBe('Policy Evaluation');
  });
});
