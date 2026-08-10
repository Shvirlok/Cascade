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

/** Returns a mode emoji and header line based on approval type */
function buildHeader(approvalType: string, travelerName: string): string {
  if (approvalType === 'HUMAN_APPROVAL_REQUIRED') {
    return (
      `⚠️ <b>HUMAN APPROVAL REQUIRED</b>\n` +
      `<i>Autonomous threshold exceeded — awaiting corporate sign-off</i>\n`
    );
  }
  if (approvalType === 'FALLBACK_STANDARD_QUEUE') {
    return (
      `🔴 <b>REBOOKING REJECTED</b>\n` +
      `<i>Transferred to standard concierge queue</i>\n`
    );
  }
  return (
    `✅ <b>CASCADE SELF-HEALED</b>\n` +
    `<i>Autonomous recovery completed — no action needed</i>\n`
  );
}

/** Transport type → emoji */
function modeEmoji(transportType: string): string {
  const t = transportType.toLowerCase();
  if (t.includes('rail') || t.includes('train') || t.includes('acela') || t.includes('tgv') || t.includes('shinkansen')) return '🚄';
  if (t.includes('flight') || t.includes('air') || t.includes('charter') || t.includes('jet')) return '✈️';
  if (t.includes('car') || t.includes('chauffeur') || t.includes('sedan') || t.includes('transfer')) return '🚗';
  if (t.includes('hotel') || t.includes('suite') || t.includes('check')) return '🏨';
  if (t.includes('bus') || t.includes('shuttle')) return '🚌';
  return '🔄';
}

/** Cost delta → coloured badge text */
function costBadge(delta: string): string {
  if (delta.startsWith('+$') && delta !== '+$0.00') return `💸 <b>${delta}</b>`;
  if (delta.includes('Covered') || delta.includes('$0.00') || delta === '$0.00 Net Delta') return `✅ <b>${delta}</b>`;
  return `💰 <b>${delta}</b>`;
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
  const emoji = modeEmoji(transportType);

  const isHitl = approvalType === 'HUMAN_APPROVAL_REQUIRED';
  const divider = isHitl
    ? '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
    : '─────────────────────────';

  const message =
    buildHeader(approvalType, data.travelerName) +
    `\n` +
    `${divider}\n` +
    `\n` +
    `👤 <b>Passenger</b>\n` +
    `   ${data.travelerName}\n` +
    `\n` +
    `🗺 <b>Disrupted Route</b>\n` +
    `   <code>${data.origin} ──▶ ${data.destination}</code>\n` +
    `\n` +
    `${emoji} <b>Resolution</b>\n` +
    `   ${data.newCarrier}\n` +
    `   <i>${transportType}</i>\n` +
    `\n` +
    `⏱ <b>Time Recovered</b>\n` +
    `   ${timeSaved}  ·  New arrival: <b>${newArrivalTime}</b>\n` +
    `\n` +
    `💼 <b>Financial Impact</b>\n` +
    `   ${costBadge(costDelta)}\n` +
    (data.customNote
      ? `\n📋 <b>Control Room Note</b>\n   <i>${data.customNote}</i>\n`
      : '') +
    `\n` +
    `${divider}\n` +
    `🔗 <b>CockroachDB Proof-of-Commit</b>\n` +
    `   <code>${data.txHash}</code>\n` +
    `\n` +
    `⚡ Resolved in <b>${slaMs}ms</b>  ·  SERIALIZABLE TX  ·  Multi-Region`;

  // Inline keyboard — use the public bot link (Telegram rejects localhost URLs in buttons)
  const botUrl = 'https://t.me/CascadeAWS_bot';
  const replyMarkup = {
    inline_keyboard: [[
      {
        text: isHitl ? '⚠️ Review in Bot →' : '🤖 Open @CascadeAWS_bot →',
        url: botUrl,
      },
    ]],
  };

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
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
