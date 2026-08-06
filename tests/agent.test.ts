import { queryTransitAvailability } from '../src/mcp/tools/transport_tools.js';

describe('Multi-Agent Transport MCP Tool Tests', () => {
  test('should return valid train transit options when flight delay breaks Amtrak connection', async () => {
    const earliestDeparture = new Date('2026-07-25T19:30:00.000Z').toISOString();

    const trainOptions = await queryTransitAvailability(
      'TRAIN',
      'NY Moynihan Train Hall',
      'Philadelphia 30th St',
      earliestDeparture
    );

    expect(trainOptions).toHaveLength(2);
    expect(trainOptions[0].provider).toContain('Amtrak');
    expect(trainOptions[0].seat_available).toBe(true);
    expect(new Date(trainOptions[0].departure_time).getTime()).toBeGreaterThan(
      new Date(earliestDeparture).getTime()
    );
  });

  test('should return hotel late check-in options for delayed arrivals', async () => {
    const arrivalTime = new Date('2026-07-25T23:30:00.000Z').toISOString();

    const hotelOptions = await queryTransitAvailability(
      'HOTEL',
      'Philadelphia Downtown',
      'Philadelphia Downtown',
      arrivalTime
    );

    expect(hotelOptions).toHaveLength(1);
    expect(hotelOptions[0].provider).toContain('Ritz-Carlton');
    expect(hotelOptions[0].notes).toContain('Late check-in confirmed');
  });
});
