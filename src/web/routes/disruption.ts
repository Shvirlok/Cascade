import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CDCListenerService } from '../../services/cdc_listener.js';
import { sendTelegramAlert } from '../../services/telegram_service.js';
import { TRAVELER_PROFILES, inMemoryGraphCache } from './travelers.js';

export const disruptionRouter = Router();

/** Session counter — incremented each time a disruption is triggered */
export let sessionDisruptionsHealed = 384;

export function setDisruptionDeps(
  broadcastSSE: (eventType: string, data: any) => void,
  cdcListener: CDCListenerService
) {
  // Use the shared engine instance from CDCListenerService so pendingApprovals
  // map is shared between API-triggered and CDC-triggered disruptions.
  const agentEngine = cdcListener.getAgentEngine();
  const DisruptSchema = z.object({
    itineraryId: z.string().optional(),
    travelerId: z.string().optional(),
    segmentReference: z.string().optional(),
    delayMinutes: z.union([z.number(), z.string()]).transform((val) => parseInt(String(val), 10) || 150),
    type: z.string().optional(),
    disruptionType: z.string().optional().default('FLIGHT_DELAY'),
    strategy: z.string().optional().default('EXECUTIVE_SPEED'),
    costDelta: z.number().optional(),
  });

  disruptionRouter.post('/api/disrupt', async (req: Request, res: Response) => {
    const parseResult = DisruptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid disruption payload', details: parseResult.error.format() });
    }

    const {
      itineraryId: rawItinId,
      travelerId: rawTravelerId,
      segmentReference: rawSegRef,
      delayMinutes,
      type,
      disruptionType,
      strategy,
      costDelta,
    } = parseResult.data;

    const itineraryId = rawItinId || rawTravelerId || req.body?.itineraryId || req.body?.travelerId || Object.keys(TRAVELER_PROFILES)[0] || 'itin-101';
    const segmentReference = rawSegRef || req.body?.segmentReference || 'DL-1402';

    const targetProfile = TRAVELER_PROFILES[itineraryId] || {
      name: inMemoryGraphCache?.user?.name || 'Sarah Jenkins',
      originCode: 'SFO',
      destinationCode: 'LHR',
    };

    const actualDisruptionType = type || disruptionType;
    const customCost = typeof costDelta === 'number' ? costDelta : (strategy === 'HIGH_COST_GUARDRAIL' ? 450 : 0);

    // Safe optional chaining for in-memory graph cache mutation
    if (inMemoryGraphCache?.segments?.[0]) {
      inMemoryGraphCache.segments[0].status = 'DELAYED';
      inMemoryGraphCache.segments[0].delay_minutes = delayMinutes;
    }
    if (inMemoryGraphCache?.segments?.[1]) {
      inMemoryGraphCache.segments[1].status = 'DELAYED';
    }
    sessionDisruptionsHealed++;

    const segIdToTrigger = inMemoryGraphCache?.segments?.[0]?.id || segmentReference || 'seg-001';

    cdcListener.triggerAgentHealingDirectly(
      itineraryId,
      segIdToTrigger,
      delayMinutes,
      actualDisruptionType,
      strategy,
      customCost
    ).catch((err) => console.warn('Agent healing notice:', err.message));

    const txHash = '0x' + Math.random().toString(16).substring(2, 12) + Math.random().toString(16).substring(2, 10);

    sendTelegramAlert({
      travelerId: itineraryId,
      travelerName: targetProfile?.name || 'Executive Traveler',
      origin: targetProfile?.originCode || 'SFO',
      destination: targetProfile?.destinationCode || 'LHR',
      newCarrier: 'Amtrak Acela Express (AMT-2158)',
      transportType: 'Express Rail Re-route',
      timeSaved: '4.5 Hours',
      newArrivalTime: 'Jul 25, 07:30 PM',
      costDeltaFormatted: customCost > 0 ? `+$${customCost}.00` : '$0.00 Net Delta',
      approvalType: customCost > 300 ? 'HUMAN_APPROVAL_REQUIRED' : 'AUTO_APPROVED',
      txHash,
      resolutionSLA: 392,
    }).catch((err) => console.warn('Telegram notice:', err.message));

    res.json({
      success: true,
      disruptionId: 'disc-evt-' + Date.now(),
      itineraryId,
      travelerName: targetProfile?.name,
      segmentReference,
      delayMinutes,
      disruptionType: actualDisruptionType,
      strategy,
      costDelta: customCost,
      txHash,
    });
  });

  disruptionRouter.post('/api/disrupt/what-if', async (req: Request, res: Response) => {
    const { hubCode = 'SFO', eventType = 'AIRPORT_STRIKE', delayMinutes = 180 } = req.body || {};
    const targetHub = String(hubCode).toUpperCase();
    const affectedTravelers: any[] = [];

    if (TRAVELER_PROFILES) {
      Object.values(TRAVELER_PROFILES).forEach((profile: any) => {
        if (profile?.originCode === targetHub || profile?.destinationCode === targetHub || profile?.route?.includes(targetHub)) {
          affectedTravelers.push({
            id: profile.id,
            name: profile.name,
            route: profile.route,
            status: 'AUTO_HEALED',
            newCarrier: 'Amtrak Acela Express / Alternate Carrier',
          });
        }
      });
    }

    const txHash = '0x' + Math.random().toString(16).substring(2, 12) + Math.random().toString(16).substring(2, 10);
    const primaryTraveler = affectedTravelers[0] || { name: 'Corporate Fleet Travelers', route: `${targetHub} Network` };

    sendTelegramAlert({
      travelerName: `${primaryTraveler.name} (+${Math.max(0, affectedTravelers.length - 1)} others)`,
      origin: targetHub,
      destination: 'Multi-Hub Route',
      newCarrier: 'Multimodal Failover Fleet',
      transportType: eventType.replace('_', ' '),
      timeSaved: '4.8 Hours',
      newArrivalTime: 'Jul 25, 08:15 PM',
      costDeltaFormatted: '$0.00 Net Delta',
      approvalType: 'AUTO_APPROVED',
      txHash,
      resolutionSLA: 280,
    }).catch((err) => console.warn('Telegram what-if notice:', err.message));

    res.json({
      success: true,
      scenarioId: 'whatif-evt-' + Date.now(),
      hubCode: targetHub,
      eventType,
      delayMinutes,
      affectedCount: affectedTravelers.length,
      affectedTravelers,
      txHash,
      resolutionSLA: 280,
    });
  });

  disruptionRouter.post('/api/disrupt/region-failover', async (_req: Request, res: Response) => {
    const result = await agentEngine.processRegionFailover((stepLog) => {
      broadcastSSE('agent_step', stepLog);
    });
    res.json(result);
  });

  disruptionRouter.post('/api/disrupt/contention', async (_req: Request, res: Response) => {
    const result = await agentEngine.processContention((stepLog) => {
      broadcastSSE('agent_step', stepLog);
    });
    res.json(result);
  });

  disruptionRouter.post('/api/disrupt/chaos', async (_req: Request, res: Response) => {
    const result = await agentEngine.processChaos((stepLog) => {
      broadcastSSE('agent_step', stepLog);
    });
    res.json(result);
  });

  disruptionRouter.post('/api/itinerary/approve', async (req: Request, res: Response) => {
    const itineraryId = req.body?.itineraryId || req.body?.travelerId || inMemoryGraphCache?.itinerary?.id || Object.keys(TRAVELER_PROFILES)[0];
    const result = agentEngine.approvePendingRebooking(itineraryId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'No pending human approval found for itinerary.' });
    }

    if (inMemoryGraphCache?.segments?.[0]) inMemoryGraphCache.segments[0].status = 'REBOOKED';
    if (inMemoryGraphCache?.segments?.[1]) inMemoryGraphCache.segments[1].status = 'REBOOKED';
    if (inMemoryGraphCache?.itinerary) inMemoryGraphCache.itinerary.status = 'SELF_HEALED';

    broadcastSSE('cascade_healed', result);
    res.json({ success: true, result });
  });

  disruptionRouter.post('/api/itinerary/reject', async (req: Request, res: Response) => {
    const itineraryId = req.body?.itineraryId || req.body?.travelerId || inMemoryGraphCache?.itinerary?.id || Object.keys(TRAVELER_PROFILES)[0];
    const reason = req.body?.reason;
    const result = agentEngine.rejectPendingRebooking(itineraryId, reason);
    if (!result) {
      return res.status(404).json({ success: false, error: 'No pending human approval found for itinerary.' });
    }

    if (inMemoryGraphCache?.itinerary) inMemoryGraphCache.itinerary.status = 'FALLBACK_STANDARD_QUEUE';

    broadcastSSE('agent_step', {
      timestamp: new Date().toISOString(),
      step: '11',
      tag: 'HITL_REJECTED',
      agent: 'POLICY_GUARDRAIL',
      action: `[HITL REJECTED / TIMEOUT]: Rebooking request rejected (${reason || 'User rejected or 60s timeout expired'}). Fallback to standard queue.`,
      details: { reason: reason || 'User clicked Reject & Keep Original' }
    });

    res.json({ success: true, result });
  });
}
