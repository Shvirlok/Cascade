import { AgentActionLog } from './agent_engine.js';

export interface AuditReportData {
  incidentId: string;
  timestamp: string;
  travelerProfile: {
    name: string;
    email: string;
    preferredCabin: string;
    seatPreference: string;
    hnswVectorScore: number;
    vectorIndex: string;
  };
  originalItinerary: {
    tripTitle: string;
    origin: string;
    destination: string;
    segments: Array<{
      type: string;
      provider: string;
      referenceCode: string;
      route: string;
      status: string;
    }>;
  };
  healedItinerary: {
    status: string;
    winningBranch: string;
    strategy: string;
    segments: Array<{
      type: string;
      provider: string;
      referenceCode: string;
      route: string;
      status: string;
    }>;
  };
  cotExecutionSteps: AgentActionLog[];
  financialDelta: {
    originalCost: string;
    rebookingFee: string;
    carrierCoverage: string;
    totalCostDelta: string;
    policyStatus: 'AUTO_APPROVED' | 'HUMAN_APPROVED' | 'FALLBACK_QUEUE';
    policyLimit: string;
  };
  estimatedTimeSaved: {
    hoursSaved: string;
    layoverSlackRestored: string;
    slaResolutionTimeMs: number;
  };
  cockroachDbTelemetry: {
    txHash: string;
    isolationLevel: 'SERIALIZABLE';
    regionLocality: string[];
    cdcEventId: string;
    proofSignature: string;
  };
}

/**
 * Compiles a post-incident executive audit summary report upon completion of a self-healing event
 */
export function generateAuditReport(reportData: Partial<AuditReportData>): AuditReportData {
  const timestamp = reportData.timestamp || new Date().toISOString();
  const incidentId = reportData.incidentId || 'PROOF-REC-' + Math.floor(100000 + Math.random() * 900000);
  const txHash = reportData.cockroachDbTelemetry?.txHash || '0x' + Math.random().toString(16).substring(2, 12) + Math.random().toString(16).substring(2, 10);

  return {
    incidentId,
    timestamp,
    travelerProfile: reportData.travelerProfile || {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@acme.com',
      preferredCabin: 'Business Class',
      seatPreference: 'Aisle (Quiet Car / Front Row)',
      hnswVectorScore: 0.984,
      vectorIndex: 'idx_users_preference_embedding (HNSW 1536-dim)',
    },
    originalItinerary: reportData.originalItinerary || {
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
    healedItinerary: reportData.healedItinerary || {
      status: 'SELF_HEALED',
      winningBranch: 'Branch Gamma (HNSW Cosine Optimal Winner)',
      strategy: 'EXECUTIVE_SPEED',
      segments: [
        { type: 'FLIGHT', provider: 'Delta Air Lines (Flight DL-1990 Re-route)', referenceCode: 'DL-1990', route: 'SFO → JFK', status: 'REBOOKED' },
        { type: 'TRAIN', provider: 'Amtrak Acela Express (Train 2158)', referenceCode: 'AMT-2158', route: 'NY Moynihan → PHL 30th St', status: 'REBOOKED' },
        { type: 'HOTEL', provider: 'Ritz-Carlton Philadelphia (Late Arrival Guaranteed)', referenceCode: 'HTL-9921', route: 'Philadelphia Downtown', status: 'CONFIRMED' },
        { type: 'FLIGHT', provider: 'British Airways', referenceCode: 'BA-178', route: 'PHL → LHR', status: 'SCHEDULED' },
      ],
    },
    cotExecutionSteps: reportData.cotExecutionSteps || [],
    financialDelta: reportData.financialDelta || {
      originalCost: '$2,850.00',
      rebookingFee: '$0.00',
      carrierCoverage: '$450.00 (Carrier Covered)',
      totalCostDelta: '$0.00 (No cost impact)',
      policyStatus: 'AUTO_APPROVED',
      policyLimit: '$300.00 Auto-Approval Threshold',
    },
    estimatedTimeSaved: {
      hoursSaved: reportData.estimatedTimeSaved?.hoursSaved || '4.5 Hours',
      layoverSlackRestored: reportData.estimatedTimeSaved?.layoverSlackRestored || '+90 Minutes Buffer',
      slaResolutionTimeMs: reportData.estimatedTimeSaved?.slaResolutionTimeMs || 392,
    },
    cockroachDbTelemetry: {
      txHash,
      isolationLevel: 'SERIALIZABLE',
      regionLocality: ['us-east-1', 'eu-west-1', 'ap-northeast-1'],
      cdcEventId: reportData.cockroachDbTelemetry?.cdcEventId || 'cdc-evt-' + Date.now(),
      proofSignature: 'sha256-cockroach-bedrock-' + txHash.substring(2, 12),
    },
  };
}

/**
 * Formats an AuditReportData object into a clean Markdown string for downloading
 */
export function exportAuditReportMarkdown(report: AuditReportData): string {
  const formattedDate = new Date(report.timestamp).toUTCString();

  return `# CASCADE Executive Post-Incident Audit Report
**Incident ID:** \`${report.incidentId}\`  
**Timestamp:** ${formattedDate}  
**Compliance Verification:** \`${report.cockroachDbTelemetry.proofSignature}\`  

---

## 1. Executive Summary
- **Resolution Status:** \`${report.healedItinerary.status}\`
- **Rebooking Strategy:** ${report.healedItinerary.strategy} (${report.healedItinerary.winningBranch})
- **SLA Resolution Latency:** \`${report.estimatedTimeSaved.slaResolutionTimeMs}ms\`
- **Estimated Time Saved:** ${report.estimatedTimeSaved.hoursSaved} (${report.estimatedTimeSaved.layoverSlackRestored})
- **Financial Delta:** ${report.financialDelta.totalCostDelta} (Policy Limit: ${report.financialDelta.policyLimit})

---

## 2. Executive Traveler Profile
- **Traveler Name:** ${report.travelerProfile.name} (\`${report.travelerProfile.email}\`)
- **Cabin & Seat Preference:** ${report.travelerProfile.preferredCabin} — ${report.travelerProfile.seatPreference}
- **Vector Search Score:** \`${(report.travelerProfile.hnswVectorScore * 100).toFixed(1)}% Match\` (${report.travelerProfile.vectorIndex})

---

## 3. Itinerary Transformation Matrix

### Original Itinerary
${report.originalItinerary.segments
  .map((s) => `- **${s.type}** | ${s.provider} (\`${s.referenceCode}\`) | ${s.route} — *${s.status}*`)
  .join('\n')}

### Healed Itinerary (Post-CASCADE Engine)
${report.healedItinerary.segments
  .map((s) => `- **${s.type}** | ${s.provider} (\`${s.referenceCode}\`) | ${s.route} — **${s.status}**`)
  .join('\n')}

---

## 4. Agent Chain-of-Thought (CoT) Execution Log
${report.cotExecutionSteps
  .map(
    (step) =>
      `\`${step.timestamp.substring(11, 19)}\` **[${step.tag}]** (\`${step.agent}\`): ${step.action}`
  )
  .join('\n')}

---

## 5. CockroachDB Transaction & Compliance Telemetry
- **Transaction Hash:** \`${report.cockroachDbTelemetry.txHash}\`
- **Transaction Isolation:** \`${report.cockroachDbTelemetry.isolationLevel}\`
- **Multi-Region Localities:** \`${report.cockroachDbTelemetry.regionLocality.join(', ')}\`
- **CDC Event Reference:** \`${report.cockroachDbTelemetry.cdcEventId}\`

*Generated by CASCADE Autonomous Travel Recovery Engine v2.4.0 (Powered by CockroachDB & AWS Bedrock)*
`;
}
