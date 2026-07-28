import { jest } from '@jest/globals';
import { sendTelegramAlert } from '../src/services/telegram_service';

describe('Custom Traveler Identity & Dynamic State Unit Tests', () => {
  it('should format custom traveler alert payload with exact traveler name and route', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'mock_bot_token';
    process.env.TELEGRAM_CHAT_ID = 'mock_chat_id';

    let capturedBody: any = null;
    const globalFetch = global.fetch;

    global.fetch = jest.fn().mockImplementation((url: any, options: any) => {
      if (options && options.body) {
        capturedBody = JSON.parse(options.body);
      }
      return Promise.resolve({
        json: () => Promise.resolve({ ok: true }),
      });
    }) as any;

    const customTravelerId = `traveler_${Date.now()}`;
    const result = await sendTelegramAlert({
      travelerId: customTravelerId,
      travelerName: 'Yaroslav',
      origin: 'FRA',
      destination: 'SIN',
      newCarrier: 'Singapore Airlines (SQ-325)',
      transportType: 'Flight Re-route',
      timeSaved: '5.2 Hours',
      newArrivalTime: 'Jul 26, 06:45 AM',
      costDeltaFormatted: '$0.00 Net Delta',
      approvalType: 'AUTO_APPROVED',
      txHash: '0x778899aabbcc',
      resolutionSLA: 285,
    });

    expect(result.sent).toBe(true);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.text).toContain('Passenger:</b> Yaroslav');
    expect(capturedBody.text).toContain('FRA ➔ SIN');
    expect(capturedBody.text).toContain('Singapore Airlines (SQ-325)');
    expect(capturedBody.text).toContain('0x778899aabbcc');

    global.fetch = globalFetch;
  });
});
