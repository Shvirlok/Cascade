import { generateAuditReport, exportAuditReportMarkdown } from '../src/services/audit_report_generator.js';

describe('Post-Incident Executive Audit Report Tests', () => {
  test('should generate complete audit report structure with all required fields', () => {
    const report = generateAuditReport({
      incidentId: 'PROOF-REC-TEST99',
      estimatedTimeSaved: {
        hoursSaved: '4.5 Hours',
        layoverSlackRestored: '+90m Buffer',
        slaResolutionTimeMs: 392,
      },
    });

    expect(report.incidentId).toBe('PROOF-REC-TEST99');
    expect(report.timestamp).toBeDefined();
    expect(report.travelerProfile.name).toBe('Sarah Jenkins');
    expect(report.travelerProfile.hnswVectorScore).toBeGreaterThan(0.9);
    expect(report.originalItinerary.segments.length).toBeGreaterThan(0);
    expect(report.healedItinerary.segments.length).toBeGreaterThan(0);
    expect(report.financialDelta.policyStatus).toBeDefined();
    expect(report.cockroachDbTelemetry.isolationLevel).toBe('SERIALIZABLE');
    expect(report.cockroachDbTelemetry.txHash).toContain('0x');
    expect(report.cockroachDbTelemetry.proofSignature).toContain('sha256-cockroach-bedrock');
  });

  test('should format audit report into clean Markdown for exporting', () => {
    const report = generateAuditReport({
      incidentId: 'PROOF-REC-TEST99',
    });

    const markdown = exportAuditReportMarkdown(report);

    expect(markdown).toContain('# CASCADE Executive Post-Incident Audit Report');
    expect(markdown).toContain('`PROOF-REC-TEST99`');
    expect(markdown).toContain('## 1. Executive Summary');
    expect(markdown).toContain('## 2. Executive Traveler Profile');
    expect(markdown).toContain('## 3. Itinerary Transformation Matrix');
    expect(markdown).toContain('## 4. Agent Chain-of-Thought (CoT) Execution Log');
    expect(markdown).toContain('## 5. CockroachDB Transaction & Compliance Telemetry');
    expect(markdown).toContain('SERIALIZABLE');
  });
});
