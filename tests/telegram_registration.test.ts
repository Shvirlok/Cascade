import { jest } from '@jest/globals';
import { sendTelegramAlert } from '../src/services/telegram_service';

describe('Enterprise Broadcast Channel Payload Resolution Unit Tests', () => {
  it('should compile valid enterprise broadcast payload with default fallbacks', async () => {
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
      travelerName: 'Elena Rostova',
      origin: 'ORD',
      destination: 'HND',
      newCarrier: 'ANA All Nippon Airways',
      txHash: '0x987654321',
    });

    expect(result.sent).toBe(true);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.text).toContain('Elena Rostova');
    expect(capturedBody.text).toContain('ORD ──▶ HND');   // new arrow format
    expect(capturedBody.text).toContain('4.5 Hours');
    expect(capturedBody.reply_markup).toBeDefined();

    global.fetch = globalFetch;
  });
});
