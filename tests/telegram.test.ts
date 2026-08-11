import { jest } from '@jest/globals';
import { sendTelegramAlert } from '../src/services/telegram_service';

describe('Enterprise Control Room Broadcast Telegram Unit Tests', () => {
  it('should gracefully handle missing env credentials without throwing errors', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const result = await sendTelegramAlert({
      travelerName: 'Sarah Jenkins',
      origin: 'SFO',
      destination: 'LHR',
      newCarrier: 'Amtrak Acela Express (AMT-2158)',
      txHash: '0x1234567890abcdef',
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('TELEGRAM_BOT_TOKEN');
  });

  it('should format enterprise B2B control room HTML payload correctly', async () => {
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

    const result = await sendTelegramAlert({
      travelerId: 'itin-102',
      travelerName: 'Marcus Vance',
      origin: 'JFK',
      destination: 'CDG',
      newCarrier: 'Air France (AF-007)',
      transportType: 'Flight Re-route',
      timeSaved: '3.5 Hours',
      newArrivalTime: 'Jul 25, 08:15 PM',
      costDeltaFormatted: '$0.00 Net Delta',
      approvalType: 'AUTO_APPROVED',
      txHash: '0xabc123456789',
      resolutionSLA: 312,
    });

    expect(result.sent).toBe(true);
    expect(capturedBody).not.toBeNull();
    // New beautiful format checks
    expect(capturedBody.text).toContain('CASCADE SELF-HEALED');
    expect(capturedBody.text).toContain('Marcus Vance');
    expect(capturedBody.text).toContain('JFK ──▶ CDG');
    expect(capturedBody.text).toContain('Air France (AF-007)');
    expect(capturedBody.text).toContain('0xabc123456789');
    // Inline keyboard should be present
    expect(capturedBody.reply_markup).toBeDefined();
    expect(capturedBody.reply_markup.inline_keyboard[0][0].text).toContain('CascadeAWS_bot');

    global.fetch = globalFetch;
  });
});
