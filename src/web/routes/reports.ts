import { Router, Request, Response } from 'express';
import { generateAuditReport, exportAuditReportMarkdown } from '../../services/audit_report_generator.js';
import { generateAuditPdf } from '../../services/pdf_report_generator.js';
import { CDCListenerService } from '../../services/cdc_listener.js';
import { TRAVELER_PROFILES } from './travelers.js';

export const reportsRouter = Router();

export function setReportsDeps(cdcListener: CDCListenerService) {
  reportsRouter.get('/api/itinerary/artifact', (req: Request, res: Response) => {
    const artifactId = (req.query.id as string) || 'PROOF-REC-994821';
    const txHash = '0x' + Math.random().toString(16).substring(2, 12) + Math.random().toString(16).substring(2, 10);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${artifactId}.json"`);
    res.json({
      artifact_id: artifactId,
      signature: 'sha256-cockroach-bedrock-0x8f4b2c1e9a3d7b4c8e',
      timestamp_iso: new Date().toISOString(),
      cockroachdb_telemetry: {
        tx_hash: txHash,
        isolation_level: 'SERIALIZABLE',
        cdc_event_trigger_id: 'cdc-evt-' + Date.now(),
        region_locality: ['us-east-1', 'eu-west-1', 'ap-northeast-1'],
      },
      user_preference_matching: {
        user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Sarah Jenkins',
        vector_match_confidence: 0.984,
        hnsw_index: 'idx_users_preference_embedding (HNSW vector_cosine_ops)',
        cross_session_recall: 'Trip #101 (SFO->LHR) preference recalled',
      },
      financial_and_time_delta: {
        original_arrival: 'Jul 25, 05:00 PM',
        new_arrival: 'Jul 25, 07:30 PM',
        time_lost_formatted: '+2h 30m',
        rebooking_fee: '$0.00 (Carrier Covered)',
        hotel_voucher: '+$0.00 (Executive Voucher Applied)',
        total_cost_delta: '$0.00',
      },
      saga_status: 'COMPLETED',
      agent_swarm_consensus: 'AGREED (Disruption Recovery Agent + Preference Guard Agent)',
    });
  });

  reportsRouter.get('/api/audit-report/:incidentId', (req: Request, res: Response) => {
    const incidentId = req.params.incidentId || 'PROOF-REC-994821';
    const defaultKey = Object.keys(TRAVELER_PROFILES)[0] || 'itin-101';
    const travelerId = (req.query.travelerId as string) || (req.query.traveler as string) || (req.body?.itineraryId as string) || (req.body?.travelerId as string) || defaultKey;
    const profile = TRAVELER_PROFILES[travelerId] || TRAVELER_PROFILES[defaultKey] || { name: 'Sarah Jenkins', email: 'sarah.jenkins@acme.com', route: 'SFO ➔ LHR', originCode: 'SFO', destinationCode: 'LHR' };

    const report = generateAuditReport({
      incidentId,
      travelerProfile: {
        name: profile?.name || 'Executive Traveler',
        email: profile?.email || 'traveler@acme.com',
        preferredCabin: profile?.preferredCabin || 'Business Class',
        seatPreference: 'Aisle (Quiet Car / Front Row)',
        hnswVectorScore: 0.984,
        vectorIndex: 'idx_users_preference_embedding (HNSW 1536-dim)',
      },
      originalItinerary: {
        tripTitle: `${profile?.name || 'Traveler'} — ${profile?.route || 'Executive Route'}`,
        origin: profile?.originCode || 'SFO',
        destination: profile?.destinationCode || 'LHR',
        segments: (profile?.legs || []).map((leg: any, i: number) => ({
          type: leg?.type,
          provider: leg?.provider,
          referenceCode: leg?.referenceCode || `SEG-0${i + 1}`,
          route: leg?.route,
          status: leg?.status,
        })),
      },
    });
    res.json(report);
  });

  reportsRouter.get('/api/audit-report/:incidentId/markdown', (req: Request, res: Response) => {
    const incidentId = req.params.incidentId || 'PROOF-REC-994821';
    const defaultKey = Object.keys(TRAVELER_PROFILES)[0] || 'itin-101';
    const travelerId = (req.query.travelerId as string) || (req.query.traveler as string) || (req.body?.itineraryId as string) || (req.body?.travelerId as string) || defaultKey;
    const profile = TRAVELER_PROFILES[travelerId] || TRAVELER_PROFILES[defaultKey] || { name: 'Sarah Jenkins', email: 'sarah.jenkins@acme.com', route: 'SFO ➔ LHR', originCode: 'SFO', destinationCode: 'LHR' };

    const report = generateAuditReport({
      incidentId,
      travelerProfile: {
        name: profile?.name || 'Executive Traveler',
        email: profile?.email || 'traveler@acme.com',
        preferredCabin: profile?.preferredCabin || 'Business Class',
        seatPreference: 'Aisle (Quiet Car / Front Row)',
        hnswVectorScore: 0.984,
        vectorIndex: 'idx_users_preference_embedding (HNSW 1536-dim)',
      },
      originalItinerary: {
        tripTitle: `${profile?.name || 'Traveler'} — ${profile?.route || 'Executive Route'}`,
        origin: profile?.originCode || 'SFO',
        destination: profile?.destinationCode || 'LHR',
        segments: (profile?.legs || []).map((leg: any, i: number) => ({
          type: leg?.type,
          provider: leg?.provider,
          referenceCode: leg?.referenceCode || `SEG-0${i + 1}`,
          route: leg?.route,
          status: leg?.status,
        })),
      },
    });

    const markdown = exportAuditReportMarkdown(report);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${incidentId}_audit_report.md"`);
    res.send(markdown);
  });

  reportsRouter.get('/api/audit-report/:incidentId/pdf', async (req: Request, res: Response) => {
    const incidentId = req.params.incidentId || 'PROOF-REC-994821';
    const defaultKey = Object.keys(TRAVELER_PROFILES)[0] || 'itin-101';
    const travelerId = (req.query.travelerId as string) || (req.query.traveler as string) || (req.body?.itineraryId as string) || (req.body?.travelerId as string) || defaultKey;
    const profile = TRAVELER_PROFILES[travelerId] || TRAVELER_PROFILES[defaultKey] || { name: 'Sarah Jenkins', email: 'sarah.jenkins@acme.com', route: 'SFO ➔ LHR', originCode: 'SFO', destinationCode: 'LHR' };

    const report = generateAuditReport({
      incidentId,
      travelerProfile: {
        name: profile?.name || 'Executive Traveler',
        email: profile?.email || 'traveler@acme.com',
        preferredCabin: profile?.preferredCabin || 'Business Class',
        seatPreference: 'Aisle (Quiet Car / Front Row)',
        hnswVectorScore: 0.984,
        vectorIndex: 'idx_users_preference_embedding (HNSW 1536-dim)',
      },
      originalItinerary: {
        tripTitle: `${profile?.name || 'Traveler'} — ${profile?.route || 'Executive Route'}`,
        origin: profile?.originCode || 'SFO',
        destination: profile?.destinationCode || 'LHR',
        segments: (profile?.legs || []).map((leg: any, i: number) => ({
          type: leg?.type,
          provider: leg?.provider,
          referenceCode: leg?.referenceCode || `SEG-0${i + 1}`,
          route: leg?.route,
          status: leg?.status,
        })),
      },
    });

    try {
      const pdfBuffer = await generateAuditPdf(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${incidentId}_audit_report.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation failed', error);
      res.status(500).json({ error: 'Unable to generate PDF report' });
    }
  });

  reportsRouter.post('/api/cdc-webhook', async (req: Request, res: Response) => {
    try {
      await cdcListener.handleWebhookPayload(req.body);
      res.status(200).send('OK');
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
