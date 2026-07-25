import { estimateCascadeImpact } from '../src/mcp/tools/transport_tools.js';

describe('CDC & Connection Impact Logic Tests', () => {
  test('should detect broken downstream connection when arrival exceeds departure window', () => {
    const arrivalTime = '2026-07-25T18:00:00.000Z';
    const connectingDepartureTime = '2026-07-25T18:30:00.000Z'; // Only 30m slack (< 45m buffer requirement)

    const impact = estimateCascadeImpact(arrivalTime, connectingDepartureTime, 45);

    expect(impact.isBroken).toBe(true);
    expect(impact.slackMinutes).toBe(30);
    expect(impact.recommendedDelayMinutes).toBeGreaterThan(0);
  });

  test('should pass connection when delay is minimal and buffer is preserved', () => {
    const arrivalTime = '2026-07-25T15:00:00.000Z';
    const connectingDepartureTime = '2026-07-25T18:00:00.000Z'; // 180m slack (> 45m buffer requirement)

    const impact = estimateCascadeImpact(arrivalTime, connectingDepartureTime, 45);

    expect(impact.isBroken).toBe(false);
    expect(impact.slackMinutes).toBe(180);
    expect(impact.recommendedDelayMinutes).toBe(0);
  });
});
