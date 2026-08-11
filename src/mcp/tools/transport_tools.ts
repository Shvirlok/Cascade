export interface TransitOption {
  option_id: string;
  provider: string;
  reference_code: string;
  transit_type: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  cabin_or_class: string;
  seat_available: boolean;
  notes: string;
}

export async function queryTransitAvailability(
  transitType: string,
  origin: string,
  destination: string,
  earliestDepartureIso: string
): Promise<TransitOption[]> {
  const baseTime = new Date(earliestDepartureIso);

  if (transitType === 'TRAIN') {
    const option1Time = new Date(baseTime.getTime() + 60 * 60 * 1000);
    const option2Time = new Date(baseTime.getTime() + 150 * 60 * 1000);
    return [
      { option_id: 'opt_train_acela_2158', provider: 'Amtrak Acela Express', reference_code: 'AMT-2158', transit_type: 'TRAIN', departure_time: option1Time.toISOString(), arrival_time: new Date(option1Time.getTime() + 75 * 60 * 1000).toISOString(), price: 185.00, cabin_or_class: 'First Class Quiet Car', seat_available: true, notes: 'Direct connection from Moynihan Hall to PHL 30th St.' },
      { option_id: 'opt_train_ner_175', provider: 'Amtrak Regional Express', reference_code: 'AMT-175', transit_type: 'TRAIN', departure_time: option2Time.toISOString(), arrival_time: new Date(option2Time.getTime() + 90 * 60 * 1000).toISOString(), price: 110.00, cabin_or_class: 'Business Class', seat_available: true, notes: 'Flexible ticket with Wi-Fi.' },
    ];
  }

  if (transitType === 'FLIGHT') {
    const flight1Time = new Date(baseTime.getTime() + 120 * 60 * 1000);
    return [
      { option_id: 'opt_flight_dl_1990', provider: 'Delta Air Lines', reference_code: 'DL-1990', transit_type: 'FLIGHT', departure_time: flight1Time.toISOString(), arrival_time: new Date(flight1Time.getTime() + 330 * 60 * 1000).toISOString(), price: 340.00, cabin_or_class: 'First Class', seat_available: true, notes: 'Direct re-route SFO to JFK.' },
    ];
  }

  if (transitType === 'HOTEL') {
    return [
      { option_id: 'opt_hotel_ritz_late', provider: 'Ritz-Carlton Philadelphia', reference_code: 'HTL-9921-MOD', transit_type: 'HOTEL', departure_time: baseTime.toISOString(), arrival_time: new Date(baseTime.getTime() + 16 * 60 * 60 * 1000).toISOString(), price: 0.00, cabin_or_class: 'Executive King Suite', seat_available: true, notes: 'Late check-in confirmed by hotel concierge. Reservation held.' },
    ];
  }

  return [];
}

export function estimateCascadeImpact(
  delayedArrivalIso: string,
  nextDepartureIso: string,
  requiredBufferMinutes: number = 45
): { isBroken: boolean; slackMinutes: number; recommendedDelayMinutes: number } {
  const arrTime = new Date(delayedArrivalIso).getTime();
  const depTime = new Date(nextDepartureIso).getTime();
  const slackMinutes = Math.floor((depTime - arrTime) / (1000 * 60));
  const isBroken = slackMinutes < requiredBufferMinutes;
  const recommendedDelayMinutes = isBroken ? Math.abs(slackMinutes) + requiredBufferMinutes : 0;
  return { isBroken, slackMinutes, recommendedDelayMinutes };
}
