import { CascadeAgentEngine, POLICY_AUTO_APPROVAL_LIMIT_USD } from '../src/services/agent_engine.js';

describe('Human-in-the-Loop & Corporate Policy Guardrails Tests', () => {
  let agentEngine: CascadeAgentEngine;

  beforeEach(() => {
    agentEngine = new CascadeAgentEngine();
  });

  test('should auto-approve self-healing when rebooking cost is <= $300', async () => {
    const report = await agentEngine.processDisruption(
      'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
      'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
      120,
      'FLIGHT_DELAY',
      'EXECUTIVE_SPEED',
      undefined,
      0 // $0 rebooking cost delta
    );

    expect(report.status).toBe('SELF_HEALED');
    expect(report.requiresHumanApproval).toBe(false);
    expect(report.policyLimitUsd).toBe(POLICY_AUTO_APPROVAL_LIMIT_USD);
  });

  test('should trigger HUMAN_APPROVAL_REQUIRED state when rebooking cost exceeds $300 limit', async () => {

    const report = await agentEngine.processDisruption(
      'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
      'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
      240,
      'FLIGHT_DELAY',
      'HIGH_COST_GUARDRAIL',
      undefined,
      450 // $450 rebooking cost delta > $300
    );

    expect(report.status).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(report.requiresHumanApproval).toBe(true);
    expect(report.costDeltaUsd).toBe(450);
    expect(report.policyLimitUsd).toBe(300);

    const pending = agentEngine.getPendingApproval('b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22');
    expect(pending).toBeDefined();
    expect(pending.rebookingCost).toBe(450);
  });

  test('should commit CockroachDB transaction upon human approval', async () => {
    // 1. Trigger high-cost disruption
    await agentEngine.processDisruption(
      'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
      'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
      240,
      'FLIGHT_DELAY',
      'HIGH_COST_GUARDRAIL',
      undefined,
      450
    );

    // 2. Approve pending rebooking
    const approvedReport = agentEngine.approvePendingRebooking('b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22');
    expect(approvedReport).not.toBeNull();
    expect(approvedReport!.status).toBe('SELF_HEALED');
    expect(approvedReport!.requiresHumanApproval).toBe(false);
    expect(approvedReport!.rebookedSegments).toHaveLength(1);

    // 3. Verify pending state cleared
    expect(agentEngine.getPendingApproval('b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22')).toBeUndefined();
  });

  test('should fallback to standard queue when human rejects or timeout expires', async () => {
    // 1. Trigger high-cost disruption
    await agentEngine.processDisruption(
      'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
      'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
      240,
      'FLIGHT_DELAY',
      'HIGH_COST_GUARDRAIL',
      undefined,
      450
    );

    // 2. Reject pending rebooking
    const rejectedReport = agentEngine.rejectPendingRebooking('b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22', '60s Timeout Expired');
    expect(rejectedReport).not.toBeNull();
    expect(rejectedReport!.status).toBe('FALLBACK_STANDARD_QUEUE');

    // 3. Verify pending state cleared
    expect(agentEngine.getPendingApproval('b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22')).toBeUndefined();
  });
});
