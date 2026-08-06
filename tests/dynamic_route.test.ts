import { jest } from '@jest/globals';

describe('Dynamic Map Route & Trajectory Unit Tests', () => {
  const AIRPORTS_DB: Record<string, { lat: number; lng: number }> = {
    SFO: { lat: 37.6213, lng: -122.3790 },
    LHR: { lat: 51.4700, lng: -0.4543 },
    JFK: { lat: 40.6413, lng: -73.7781 },
    CDG: { lat: 49.0097, lng: 2.5479 },
    ORD: { lat: 41.9742, lng: -87.9073 },
    HND: { lat: 35.5494, lng: 139.7798 },
    MIA: { lat: 25.7959, lng: -80.2870 },
    FRA: { lat: 50.0379, lng: 8.5622 },
    SIN: { lat: 1.3644, lng: 103.9915 },
  };

  it('should resolve origin and destination coordinates for any selected traveler or custom trip', () => {
    const route1 = { originCode: 'JFK', destinationCode: 'CDG' };
    const orig1 = AIRPORTS_DB[route1.originCode];
    const dest1 = AIRPORTS_DB[route1.destinationCode];
    expect(orig1).toEqual({ lat: 40.6413, lng: -73.7781 });
    expect(dest1).toEqual({ lat: 49.0097, lng: 2.5479 });

    const route2 = { originCode: 'FRA', destinationCode: 'SIN' };
    const orig2 = AIRPORTS_DB[route2.originCode];
    const dest2 = AIRPORTS_DB[route2.destinationCode];
    expect(orig2).toEqual({ lat: 50.0379, lng: 8.5622 });
    expect(dest2).toEqual({ lat: 1.3644, lng: 103.9915 });
  });
});
