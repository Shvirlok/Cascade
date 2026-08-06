import { CascadeAgentEngine, FIRST_MILE_DELAY_THRESHOLD_MINS, MIN_INTERNATIONAL_HUB_BUFFER_MINS } from '../src/services/agent_engine.js';

describe('First-Mile Bypass Engine', () => {
  const engine = new CascadeAgentEngine();

  test('delay=45 at threshold: should NOT trigger first-mile switch', async () => {
    const r = await engine.processDisruption('t1','s1',45,'FLIGHT_DELAY','EXECUTIVE_SPEED');
    expect(r.firstMileSwitchOccurred).toBeFalsy();
    expect(r.firstMileAlternative).toBeUndefined();
    const modalSteps = r.actionLogs.filter(l => l.tag === 'MODAL_EVALUATION');
    expect(modalSteps).toHaveLength(0);
  });

  test('delay=150 FLIGHT_DELAY: should trigger switch with 4 CoT steps', async () => {
    const r = await engine.processDisruption('t2','s2',150,'FLIGHT_DELAY','EXECUTIVE_SPEED');
    expect(r.firstMileSwitchOccurred).toBe(true);
    expect(r.firstMileAlternative).toBeDefined();
    expect(r.firstMileAlternative!.mode).toBe('RAIL');
    expect(r.firstMileAlternative!.provider).toContain('Amtrak Acela');
    expect(r.firstMileAlternative!.bufferMins).toBeGreaterThan(0);
    const tags = r.actionLogs.map(l => l.tag);
    expect(tags).toContain('MODAL_EVALUATION');
    expect(tags).toContain('MODAL_SCORING');
    expect(tags).toContain('SMART_SWITCH');
    expect(tags).toContain('BUFFER_RESTORED');
  });

  test('delay=200 HOTEL_OVERBOOK: should NOT trigger (wrong disruption type)', async () => {
    const r = await engine.processDisruption('t3','s3',200,'HOTEL_OVERBOOK','EXECUTIVE_SPEED');
    expect(r.firstMileSwitchOccurred).toBeFalsy();
    const tags = r.actionLogs.map(l => l.tag);
    expect(tags).not.toContain('MODAL_EVALUATION');
  });

  test('constants are exported correctly', () => {
    expect(FIRST_MILE_DELAY_THRESHOLD_MINS).toBe(45);
    expect(MIN_INTERNATIONAL_HUB_BUFFER_MINS).toBe(75);
  });
});
