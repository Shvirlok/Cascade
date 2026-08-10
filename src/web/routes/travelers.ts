import { Router, Request, Response } from 'express';
import { z } from 'zod';

export const travelersRouter = Router();

export const TRAVELER_PROFILES: Record<string, any> = {
  'itin-101': {
    id: 'itin-101',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@acme.com',
    route: 'SFO ➔ LHR',
    originCode: 'SFO',
    destinationCode: 'LHR',
    originLat: 37.6213,
    originLng: -122.3790,
    destLat: 51.4700,
    destLng: -0.4543,
    status: 'SELF_HEALED',
    policyTier: 'Executive Tier ($300 Limit)',
    policyLimitUsd: 300,
    preferredCabin: 'Business Class Quiet Car',
    vectorScore: 0.984,
    centerLat: 45.0,
    centerLng: -60.0,
    zoom: 3,
    legs: [
      { type: 'FLIGHT', provider: 'Delta Air Lines (DL-1402)', route: 'SFO → JFK', status: 'DELAYED' },
      { type: 'TRAIN', provider: 'Amtrak Acela Express (AMT-2158)', route: 'NY Moynihan → PHL 30th St', status: 'REBOOKED' },
      { type: 'HOTEL', provider: 'Ritz-Carlton Philadelphia', route: 'Philadelphia Downtown', status: 'CONFIRMED' },
      { type: 'FLIGHT', provider: 'British Airways (BA-178)', route: 'PHL → LHR', status: 'SCHEDULED' },
    ],
  },
  'itin-102': {
    id: 'itin-102',
    name: 'Marcus Vance',
    email: 'marcus.vance@acme.com',
    route: 'JFK ➔ CDG',
    originCode: 'JFK',
    destinationCode: 'CDG',
    originLat: 40.6413,
    originLng: -73.7781,
    destLat: 49.0097,
    destLng: 2.5479,
    status: 'SCHEDULED',
    policyTier: 'VIP Executive ($500 Limit)',
    policyLimitUsd: 500,
    preferredCabin: 'First Class Express',
    vectorScore: 0.962,
    centerLat: 44.0,
    centerLng: -35.0,
    zoom: 4,
    legs: [
      { type: 'FLIGHT', provider: 'Air France (AF-007)', route: 'JFK → CDG', status: 'SCHEDULED' },
      { type: 'TRAIN', provider: 'TGV InOui (TGV-6821)', route: 'Paris CDG → Lyon Part-Dieu', status: 'SCHEDULED' },
      { type: 'HOTEL', provider: 'Four Seasons Hotel George V', route: 'Paris Eighth Arrondissement', status: 'CONFIRMED' },
    ],
  },
  'itin-103': {
    id: 'itin-103',
    name: 'Elena Rostova',
    email: 'elena.rostova@acme.com',
    route: 'SFO ➔ HND',
    originCode: 'SFO',
    destinationCode: 'HND',
    originLat: 37.6213,
    originLng: -122.3790,
    destLat: 35.5494,
    destLng: 139.7798,
    status: 'IN_TRANSIT',
    policyTier: 'Global Operations ($250 Limit)',
    policyLimitUsd: 250,
    preferredCabin: 'Premium Economy',
    vectorScore: 0.941,
    centerLat: 38.0,
    centerLng: 170.0,
    zoom: 3,
    legs: [
      { type: 'FLIGHT', provider: 'ANA All Nippon Airways (NH-111)', route: 'ORD → HND', status: 'IN_TRANSIT' },
      { type: 'TRAIN', provider: 'Shinkansen Nozomi (NK-309)', route: 'Tokyo → Kyoto', status: 'SCHEDULED' },
      { type: 'HOTEL', provider: 'Park Hyatt Tokyo', route: 'Shinjuku Tokyo', status: 'CONFIRMED' },
    ],
  },
  'itin-104': {
    id: 'itin-104',
    name: 'David Chen',
    email: 'david.chen@acme.com',
    route: 'MIA ➔ LHR',
    originCode: 'MIA',
    destinationCode: 'LHR',
    originLat: 25.7959,
    originLng: -80.2870,
    destLat: 51.4700,
    destLng: -0.4543,
    status: 'SELF_HEALED',
    policyTier: 'Executive Tier ($300 Limit)',
    policyLimitUsd: 300,
    preferredCabin: 'Business Class Aisle',
    vectorScore: 0.975,
    centerLat: 38.0,
    centerLng: -40.0,
    zoom: 3,
    legs: [
      { type: 'FLIGHT', provider: 'American Airlines (AA-038)', route: 'MIA → LHR', status: 'REBOOKED' },
      { type: 'TAXI', provider: 'Executive Airport Chauffeur', route: 'LHR → Central London', status: 'CONFIRMED' },
      { type: 'HOTEL', provider: 'The Savoy London', route: 'Strand London', status: 'CONFIRMED' },
    ],
  },
};

export const activeFleetData: any[] = [
  { id: 'itin-101', traveler: 'Sarah Jenkins', route: 'San Francisco (SFO) ➔ London (LHR)', status: 'SELF_HEALED', legs: 'Flight · Train · Hotel · Flight', last_event: 'Flight delayed +150m — automatically rebooked to next Amtrak Acela Express', region: 'us-east-1' },
  { id: 'itin-102', traveler: 'Marcus Vance', route: 'New York (JFK) ➔ Paris (CDG)', status: 'SCHEDULED', legs: 'Flight · Express Rail · Hotel', last_event: 'All connections on schedule with comfortable buffer', region: 'eu-west-1' },
  { id: 'itin-103', traveler: 'Elena Rostova', route: 'San Francisco (SFO) ➔ Tokyo (HND)', status: 'IN_TRANSIT', legs: 'Flight · Shinkansen · Hotel', last_event: 'First leg departed on time', region: 'ap-northeast-1' },
  { id: 'itin-104', traveler: 'David Chen', route: 'Miami (MIA) ➔ London (LHR)', status: 'SELF_HEALED', legs: 'Flight · Taxi · Hotel', last_event: 'Hotel check-in adjusted for late arrival — guaranteed at no extra cost', region: 'us-east-1' },
];

export const inMemoryGraphCache: any = {
  itinerary: {
    id: 'b1fbc999-8c0b-4ef8-bb6d-7bb9bd380a22',
    title: 'Transatlantic Multi-Modal Executive Trip',
    origin: 'SFO (San Francisco)',
    destination: 'LHR (London Heathrow)',
    status: 'SCHEDULED',
    total_cost: 2850.00,
  },
  user: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@acme.com',
    preferences: {
      preferred_cabin: 'business',
      max_layover_hours: 3,
      transit_mode_priority: ['FLIGHT', 'TRAIN', 'HOTEL', 'TAXI'],
      seat_preference: 'aisle',
      hotel_min_stars: 4,
      auto_rebook_threshold_min: 30,
    },
  },
  segments: [
    {
      id: 'c2fbc999-7c0b-4ef8-bb6d-8bb9bd380a33',
      sequence_order: 1,
      segment_type: 'FLIGHT',
      provider: 'Delta Air Lines',
      reference_code: 'DL-1402',
      origin: 'SFO (San Francisco)',
      destination: 'JFK (New York)',
      scheduled_departure: '2026-07-25T12:00:00.000Z',
      scheduled_arrival: '2026-07-25T17:00:00.000Z',
      status: 'SCHEDULED',
      delay_minutes: 0,
    },
    {
      id: 'd3fbc999-6c0b-4ef8-bb6d-9bb9bd380a44',
      sequence_order: 2,
      segment_type: 'TRAIN',
      provider: 'Amtrak Acela Express',
      reference_code: 'AMT-2150',
      origin: 'NY Moynihan Train Hall',
      destination: 'Philadelphia 30th St',
      scheduled_departure: '2026-07-25T18:30:00.000Z',
      scheduled_arrival: '2026-07-25T19:45:00.000Z',
      status: 'SCHEDULED',
      delay_minutes: 0,
    },
    {
      id: 'e4fbc999-5c0b-4ef8-bb6d-0bb9bd380a55',
      sequence_order: 3,
      segment_type: 'HOTEL',
      provider: 'Ritz-Carlton Philadelphia',
      reference_code: 'HTL-9921',
      origin: 'Philadelphia Downtown',
      destination: 'Philadelphia Downtown',
      scheduled_departure: '2026-07-25T20:15:00.000Z',
      scheduled_arrival: '2026-07-26T12:00:00.000Z',
      status: 'SCHEDULED',
      delay_minutes: 0,
    },
    {
      id: 'f5fbc999-4c0b-4ef8-bb6d-1bb9bd380a66',
      sequence_order: 4,
      segment_type: 'FLIGHT',
      provider: 'British Airways',
      reference_code: 'BA-178',
      origin: 'PHL (Philadelphia)',
      destination: 'LHR (London Heathrow)',
      scheduled_departure: '2026-07-26T15:00:00.000Z',
      scheduled_arrival: '2026-07-26T22:00:00.000Z',
      status: 'SCHEDULED',
      delay_minutes: 0,
    },
  ],
};

const CreateItinerarySchema = z.object({
  travelerName: z.string().optional(),
  travelerEmail: z.string().optional(),
  firstMileMode: z.string().optional().default('RAIL'),
  firstMileOrigin: z.string().optional().default(''),
  primaryMode: z.string().optional().default('FLIGHT'),
  origin: z.string().optional(),
  destination: z.string().optional(),
  lastMileMode: z.string().optional().default('CAR_TRANSFER'),
  lastMileDest: z.string().optional().default(''),
  depDate: z.string().optional().default('2026-08-10'),
  depTime: z.string().optional().default('09:00'),
  arrDate: z.string().optional().default('2026-08-10'),
  arrTime: z.string().optional().default('17:30'),
  transferMode: z.string().optional(),
  cabinPref: z.string().optional().default('Business Class Quiet Car'),
  strategy: z.string().optional().default('EXECUTIVE_SPEED'),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  destLat: z.number().optional(),
  destLng: z.number().optional(),
});

/**
 * Create / Import Executive Itinerary Endpoint
 */
travelersRouter.post('/api/itinerary/create', (req: Request, res: Response) => {
  const parseResult = CreateItinerarySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid itinerary request payload', details: parseResult.error.format() });
  }

  const {
    travelerName,
    travelerEmail,
    firstMileMode,
    firstMileOrigin,
    primaryMode,
    origin,
    destination,
    lastMileMode,
    lastMileDest,
    depDate,
    depTime,
    arrDate,
    arrTime,
    transferMode,
    cabinPref,
    strategy,
    originLat,
    originLng,
    destLat,
    destLng
  } = parseResult.data;

  const newId = `traveler_${Date.now()}`;
  const origCode = (origin || 'JFK').split(' ')[0].split('—')[0].trim();
  const destCode = (destination || 'LHR').split(' ')[0].split('—')[0].trim();
  const routeStr = `${origCode} ➔ ${destCode}`;

  const resolvedOrigLat = typeof originLat === 'number' ? originLat : 37.6213;
  const resolvedOrigLng = typeof originLng === 'number' ? originLng : -122.3790;
  const resolvedDestLat = typeof destLat === 'number' ? destLat : 51.4700;
  const resolvedDestLng = typeof destLng === 'number' ? destLng : -0.4543;

  const cLat = (resolvedOrigLat + resolvedDestLat) / 2;
  const cLng = (resolvedOrigLng + resolvedDestLng) / 2;

  const cityCenters: Record<string, { code: string; label: string; lat: number; lng: number }> = {
    JFK: { code: 'NYC', label: 'New York City Center', lat: 40.7128, lng: -74.0060 },
    SFO: { code: 'SJC', label: 'San Francisco Downtown', lat: 37.7749, lng: -122.4194 },
    CDG: { code: 'PAR', label: 'Central Paris Hotel', lat: 48.8566, lng: 2.3522 },
    LHR: { code: 'LON', label: 'Central London Hotel', lat: 51.5074, lng: -0.1278 },
    ORD: { code: 'CHI', label: 'Chicago Downtown Loop', lat: 41.8781, lng: -87.6298 },
    HND: { code: 'TYO', label: 'Tokyo Shinjuku District', lat: 35.6905, lng: 139.6995 },
    MIA: { code: 'MIA_D', label: 'Miami Beach Center', lat: 25.7617, lng: -80.1918 }
  };

  const fMileUpper = String(firstMileMode).toUpperCase();
  const mainModeUpper = String(primaryMode || 'FLIGHT').toUpperCase();
  const lMileUpper = String(lastMileMode || transferMode || 'CAR_TRANSFER').toUpperCase();

  const multiModalWaypoints: any[] = [];
  const legs: any[] = [];

  if (fMileUpper !== 'NONE' && fMileUpper !== 'NO') {
    const fMileName = firstMileOrigin || (cityCenters[origCode]?.label || `${origCode} City Center`);
    const fMileCode = cityCenters[origCode]?.code || fMileName.substring(0, 4).toUpperCase();
    const fMileLat = cityCenters[origCode]?.lat || (resolvedOrigLat + 0.08);
    const fMileLng = cityCenters[origCode]?.lng || (resolvedOrigLng + 0.08);
    const isFRail = (fMileUpper === 'RAIL' || fMileUpper === 'TRAIN');
    const isFRoad = (fMileUpper === 'CAR' || fMileUpper === 'BUS' || fMileUpper === 'TAXI' || fMileUpper === 'SHUTTLE');
    const fColor = isFRail ? '#10b981' : (isFRoad ? '#f59e0b' : '#38bdf8');
    const fProvider = isFRail ? 'Regional Commuter Rail' : (isFRoad ? 'Executive Car Transfer' : 'Airport Bus Express');

    legs.push({
      type: isFRail ? 'TRAIN' : 'CAR',
      provider: fProvider,
      route: `${fMileName} → ${origCode}`,
      status: 'SCHEDULED',
      mode: isFRail ? 'RAIL' : (isFRoad ? 'CAR' : fMileUpper)
    });

    multiModalWaypoints.push({
      mode: isFRail ? 'RAIL' : (isFRoad ? 'CAR' : fMileUpper),
      provider: fProvider,
      from: { code: fMileCode, label: fMileName, lat: fMileLat, lng: fMileLng },
      to: { code: origCode, label: `${origCode} Origin Hub`, lat: resolvedOrigLat, lng: resolvedOrigLng },
      color: fColor
    });
  }

  const isMainRail = (mainModeUpper === 'RAIL' || mainModeUpper === 'TRAIN');
  const isMainRoad = (mainModeUpper === 'CAR' || mainModeUpper === 'BUS' || mainModeUpper === 'TAXI' || mainModeUpper === 'SHUTTLE');

  const mainColor = isMainRail ? '#10b981' : (isMainRoad ? '#f59e0b' : '#6366f1');
  const mainProvider = isMainRail
    ? `Amtrak / Eurostar High-Speed Rail (${origCode}-${Math.floor(100+Math.random()*899)})`
    : (isMainRoad
        ? `Long-Distance Chauffeur Sedan (${origCode}-${destCode})`
        : `Executive Air (${origCode}-${Math.floor(100+Math.random()*899)})`);

  legs.push({
    type: isMainRail ? 'TRAIN' : (isMainRoad ? 'CAR' : 'FLIGHT'),
    provider: mainProvider,
    route: `${origCode} → ${destCode}`,
    status: 'SCHEDULED',
    mode: isMainRail ? 'RAIL' : (isMainRoad ? 'CAR' : 'FLIGHT')
  });

  multiModalWaypoints.push({
    mode: isMainRail ? 'RAIL' : (isMainRoad ? 'CAR' : 'FLIGHT'),
    provider: mainProvider,
    from: { code: origCode, label: `${origCode} Main Hub`, lat: resolvedOrigLat, lng: resolvedOrigLng },
    to: { code: destCode, label: `${destCode} Destination Hub`, lat: resolvedDestLat, lng: resolvedDestLng },
    color: mainColor
  });

  const destCenterObj = cityCenters[destCode] || { code: destCode + '_H', label: `${destCode} Hotel Center`, lat: resolvedDestLat + 0.08, lng: resolvedDestLng + 0.08 };
  const lMileName = lastMileDest || destCenterObj.label;
  const lMileCode = destCenterObj.code;
  const lColor = lMileUpper.includes('CAR') ? '#f59e0b' : (lMileUpper.includes('BUS') ? '#f59e0b' : '#10b981');
  const lProvider = lMileUpper.includes('CAR')
    ? 'Executive Sedan Chauffeur'
    : (lMileUpper.includes('BUS') ? 'Airport Express Shuttle' : 'City Express Rail Transfer');

  legs.push({
    type: lMileUpper.includes('CAR') || lMileUpper.includes('BUS') ? 'CAR' : 'TRAIN',
    provider: lProvider,
    route: `${destCode} → ${lMileName}`,
    status: 'SCHEDULED',
    mode: lMileUpper.includes('CAR') ? 'CAR' : (lMileUpper.includes('BUS') ? 'BUS' : 'RAIL')
  });

  legs.push({
    type: 'HOTEL',
    provider: lMileName,
    route: `${destCode} City District`,
    status: 'CONFIRMED',
    mode: 'HOTEL'
  });

  multiModalWaypoints.push({
    mode: lMileUpper.includes('CAR') ? 'CAR' : (lMileUpper.includes('BUS') ? 'BUS' : 'RAIL'),
    provider: lProvider,
    from: { code: destCode, label: `${destCode} Destination Hub`, lat: resolvedDestLat, lng: resolvedDestLng },
    to: { code: lMileCode, label: lMileName, lat: destCenterObj.lat, lng: destCenterObj.lng },
    color: lColor
  });

  const newProfile = {
    id: newId,
    name: travelerName || 'Executive Traveler',
    email: travelerEmail || 'executive@acme.com',
    route: routeStr,
    originCode: origCode,
    destCode: destCode,
    destinationCode: destCode,
    originLat: resolvedOrigLat,
    originLng: resolvedOrigLng,
    destLat: resolvedDestLat,
    destLng: resolvedDestLng,
    status: 'SCHEDULED',
    schedule: `${depDate} ${depTime} ➔ ${arrDate} ${arrTime}`,
    policyTier: strategy === 'COMFORT_BUSINESS' ? 'VIP Executive ($500 Limit)' : 'Executive Tier ($300 Limit)',
    policyLimitUsd: strategy === 'COMFORT_BUSINESS' ? 500 : 300,
    preferredCabin: cabinPref || (strategy === 'COMFORT_BUSINESS' ? 'First Class Quiet Car' : 'Business Class Direct'),
    vectorScore: 0.965,
    centerLat: cLat,
    centerLng: cLng,
    zoom: 3,
    legs,
    multiModalWaypoints
  };

  TRAVELER_PROFILES[newId] = newProfile;

  const newTrip = {
    id: newId,
    traveler: newProfile.name,
    route: routeStr,
    status: 'SCHEDULED',
    legs: legs.map(l => l.mode || l.type).join(' · '),
    last_event: 'SCHEDULED',
    region: 'North America / EU',
    riskScore: 0.05,
  };
  activeFleetData.unshift(newTrip as any);

  res.json({
    success: true,
    itineraryId: newId,
    newTrip,
    profile: newProfile,
    message: 'Multi-modal trip created successfully.',
  });
});

travelersRouter.get('/api/travelers', (_req: Request, res: Response) => {
  res.json(Object.values(TRAVELER_PROFILES));
});

travelersRouter.get('/api/traveler/:id', (req: Request, res: Response) => {
  const profile = TRAVELER_PROFILES[req.params.id] || TRAVELER_PROFILES['itin-101'];
  res.json(profile);
});

travelersRouter.delete('/api/traveler/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  delete TRAVELER_PROFILES[id];
  const idx = activeFleetData.findIndex(t => t.id === id);
  if (idx !== -1) activeFleetData.splice(idx, 1);
  res.json({ success: true, message: `Traveler ${id} deleted successfully.` });
});

travelersRouter.get('/api/itinerary', (_req: Request, res: Response) => {
  res.setHeader('X-Cache-Status', 'HIT');
  res.setHeader('X-Response-Time-Ms', '3');
  res.json(inMemoryGraphCache);
});

travelersRouter.get('/api/itinerary/:id', (req: Request, res: Response) => {
  const profile = TRAVELER_PROFILES[req.params.id];
  if (profile) {
    res.json({
      itinerary: {
        id: profile.id,
        title: `${profile.name} — ${profile.route}`,
        origin: profile.originCode,
        destination: profile.destinationCode,
        status: profile.status,
        total_cost: 2850.00,
      },
      user: {
        id: 'user-' + profile.id,
        name: profile.name,
        email: profile.email,
        preferences: {
          preferred_cabin: profile.preferredCabin,
          policy_tier: profile.policyTier,
        },
      },
      profile,
      segments: profile.legs,
    });
  } else {
    res.json(inMemoryGraphCache);
  }
});
