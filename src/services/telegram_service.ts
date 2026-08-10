/**
 * Enterprise Control Room Broadcast Telegram Alert Service for CASCADE
 */

export interface TelegramBroadcastPayload {
  travelerId?: string;
  travelerName: string;
  origin: string;
  destination: string;
  newCarrier: string;
  transportType?: string;
  timeSaved?: string;
  newArrivalTime?: string;
  costDeltaFormatted?: string;
  approvalType?: string;
  customNote?: string;
  txHash: string;
  resolutionSLA?: number;
}

export async function sendTelegramAlert(data: TelegramBroadcastPayload): Promise<{ sent: boolean; reason?: string; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { sent: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' };
  }

  const travelerId = data.travelerId || 'itin-101';
  const port = process.env.PORT || '3000';
  const dashboardUrl = `http://localhost:${port}/?traveler=${travelerId}`;
  const transportType = data.transportType || 'Express Rail Re-route';
  const timeSaved = data.timeSaved || '4.5 Hours';
  const newArrivalTime = data.newArrivalTime || 'Jul 25, 07:30 PM';
  const costDelta = data.costDeltaFormatted || '$0.00 Net Delta';
  const approvalType = data.approvalType || 'AUTO_APPROVED';
  const slaMs = data.resolutionSLA || 392;
  const noteLine = data.customNote ? `\n<b>Control Room Note:</b> <i>${data.customNote}</i>` : '';

  const message =
    `<b>CASCADE Executive Control Room Alert</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Passenger:</b> ${data.travelerName}\n` +
    `<b>Disrupted Segment:</b> ${data.origin} ➔ ${data.destination}\n` +
    `<b>Resolution Action:</b> ${data.newCarrier} (${transportType})\n\n` +
    `<b>Time Saved:</b> ${timeSaved} (New Arrival: ${newArrivalTime})\n` +
    `<b>Financial Impact:</b> ${costDelta} [${approvalType}]` +
    `${noteLine}\n` +
    `<b>CockroachDB Proof:</b> <code>${data.txHash}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Autonomous Self-Healing Completed in ${slaMs}ms</i>\n` +
    `<a href="${dashboardUrl}">Open System Dashboard</a>`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const result = (await response.json()) as any;
    if (result.ok) {
      return { sent: true };
    } else {
      console.warn('[Telegram Broadcast Notice]:', result.description || 'Telegram API error');
      return { sent: false, error: result.description || 'Telegram API error' };
    }
  } catch (err: any) {
    console.warn('[Telegram Broadcast Exception]:', err.message);
    return { sent: false, error: err.message };
  }
}
