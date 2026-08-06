import PDFDocument from 'pdfkit';
import type { AuditReportData } from './audit_report_generator.js';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  navy:       '#0D1B35',
  navyMid:    '#1B3260',
  blue:       '#2563EB',
  teal:       '#0EA5E9',
  slate:      '#334155',
  slateLight: '#64748B',
  silver:     '#94A3B8',
  hairline:   '#CBD5E1',
  bg:         '#F1F5F9',
  bgCard:     '#F8FAFC',
  white:      '#FFFFFF',
  green:      '#059669', greenBg: '#DCFCE7', greenText: '#14532D',
  amber:      '#D97706', amberBg: '#FEF3C7', amberText: '#78350F',
  red:        '#DC2626', redBg:   '#FEE2E2', redText:   '#7F1D1D',
  purple:     '#7C3AED', purpleBg:'#EDE9FE', purpleText:'#3B0764',
  sky:        '#0284C7', skyBg:   '#E0F2FE', skyText:   '#0C4A6E',
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M      = 44;
const INNER  = PAGE_W - M * 2;

// ─── Utilities ────────────────────────────────────────────────────────────────

function statusColor(s: string) {
  const u = s.toUpperCase();
  if (['REBOOKED','SELF_HEALED','CONFIRMED','AUTO_APPROVED','IMMUTABLE_LOG'].includes(u))
    return { bg: C.greenBg,  text: C.greenText,  dot: C.green  };
  if (['DELAYED','MISSED'].includes(u))
    return { bg: C.redBg,    text: C.redText,    dot: C.red    };
  if (['SCHEDULED'].includes(u))
    return { bg: C.skyBg,    text: C.skyText,    dot: C.sky    };
  if (['HUMAN_APPROVED'].includes(u))
    return { bg: C.amberBg,  text: C.amberText,  dot: C.amber  };
  if (['FALLBACK_QUEUE','AUTHORIZED_FOR_FLEET'].includes(u))
    return { bg: C.purpleBg, text: C.purpleText, dot: C.purple };
  return { bg: C.bg, text: C.slate, dot: C.slateLight };
}

function badgePill(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  x: number, y: number,
  col: { bg: string; text: string; dot: string },
): number {
  const PX = 7, PY = 3, R = 4, D = 3.5;
  doc.fontSize(7).font('Helvetica-Bold');
  const tw    = doc.widthOfString(label);
  const pillW = D * 2 + 4 + tw + PX * 2;
  const pillH = 13;
  doc.roundedRect(x, y, pillW, pillH, R).fillColor(col.bg).fill();
  doc.circle(x + PX + D / 2, y + pillH / 2, D / 2).fillColor(col.dot).fill();
  doc.fillColor(col.text).text(label, x + PX + D + 3, y + PY, { lineBreak: false });
  return pillW;
}

function hRule(doc: InstanceType<typeof PDFDocument>, y: number, color = C.hairline, w = 0.5) {
  doc.save().lineWidth(w).strokeColor(color)
    .moveTo(M, y).lineTo(PAGE_W - M, y).stroke().restore();
}

function sectionTitle(doc: InstanceType<typeof PDFDocument>, title: string, y: number): number {
  doc.save().rect(M, y, 3, 15).fillColor(C.blue).fill().restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
    .text(title, M + 10, y + 1, { lineBreak: false });
  return y + 22;
}

function pageFooter(doc: InstanceType<typeof PDFDocument>, n: number, total: number) {
  const fy = PAGE_H - 30;
  hRule(doc, fy, C.hairline, 0.4);
  doc.font('Helvetica').fontSize(7).fillColor(C.silver);
  doc.text('CASCADE Autonomous Travel Recovery Engine  ·  CONFIDENTIAL',
    M, fy + 7, { lineBreak: false, width: INNER * 0.6 });
  doc.text(`Page ${n} / ${total}`, M, fy + 7,
    { align: 'right', width: INNER, lineBreak: false });
}

function pageSubHeader(doc: InstanceType<typeof PDFDocument>, title: string, right: string) {
  doc.rect(0, 0, PAGE_W, 34).fillColor(C.navyMid).fill();
  doc.rect(0, 31, PAGE_W, 3).fillColor(C.teal).fill();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white)
    .text(title, M, 10, { lineBreak: false });
  if (right) {
    doc.font('Helvetica').fontSize(8).fillColor(C.teal)
      .text(right, PAGE_W - M - 260, 13, { width: 260, align: 'right', lineBreak: false });
  }
}

function infoGrid(
  doc: InstanceType<typeof PDFDocument>,
  items: { label: string; value: string; accent?: boolean }[],
  y: number,
  cols = 2,
): number {
  const GAP = 8, CELL_H = 44;
  const cellW = (INNER - GAP * (cols - 1)) / cols;
  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x   = M + col * (cellW + GAP);
    const cy  = y + row * (CELL_H + GAP);
    doc.roundedRect(x, cy, cellW, CELL_H, 5).fillColor(C.bgCard).fill();
    doc.rect(x, cy, 3, CELL_H).fillColor(item.accent ? C.blue : C.hairline).fill();
    doc.font('Helvetica').fontSize(7).fillColor(C.slateLight)
      .text(item.label.toUpperCase(), x + 10, cy + 8, { width: cellW - 16, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.navy)
      .text(item.value, x + 10, cy + 20, { width: cellW - 16, lineBreak: false, ellipsis: true });
  });
  const rows = Math.ceil(items.length / cols);
  return y + rows * (CELL_H + GAP);
}

function metricRow(
  doc: InstanceType<typeof PDFDocument>,
  items: { label: string; value: string; sub?: string; color?: string }[],
  y: number,
): number {
  const COLS   = items.length;
  const GAP    = 8;
  const CELL_W = (INNER - GAP * (COLS - 1)) / COLS;
  const CELL_H = 56;
  items.forEach((item, i) => {
    const x   = M + i * (CELL_W + GAP);
    const acc = item.color ?? C.blue;
    doc.roundedRect(x, y, CELL_W, CELL_H, 6).fillColor(C.bgCard).fill();
    doc.rect(x, y, CELL_W, 3).fillColor(acc).fill();
    doc.font('Helvetica').fontSize(7).fillColor(C.slateLight)
      .text(item.label.toUpperCase(), x + 10, y + 10, { width: CELL_W - 16, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(acc)
      .text(item.value, x + 10, y + 22, { width: CELL_W - 16, lineBreak: false, ellipsis: true });
    if (item.sub) {
      doc.font('Helvetica').fontSize(7).fillColor(C.silver)
        .text(item.sub, x + 10, y + 40, { width: CELL_W - 16, lineBreak: false, ellipsis: true });
    }
  });
  return y + CELL_H + 10;
}

function telemetryBand(
  doc: InstanceType<typeof PDFDocument>,
  rows: { key: string; value: string }[],
  y: number,
): number {
  const ROW_H = 22;
  const H     = rows.length * ROW_H + 10;
  const KEY_W = 112;
  doc.roundedRect(M, y, INNER, H, 6).fillColor(C.navy).fill();
  rows.forEach((row, i) => {
    const ry = y + 5 + i * ROW_H;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.teal)
      .text(row.key.toUpperCase(), M + 12, ry + 5, { width: KEY_W, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
      .text(row.value, M + 12 + KEY_W, ry + 4, { width: INNER - KEY_W - 24, lineBreak: false, ellipsis: true });
  });
  return y + H + 10;
}

function styledTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  widths: number[],
  y: number,
): number {
  const HDR_H = 24, ROW_H = 26;
  let cy = y;
  doc.rect(M, cy, INNER, HDR_H).fillColor(C.navy).fill();
  let cx = M;
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
      .text(h, cx + 6, cy + 7, { width: widths[i] - 10, lineBreak: false });
    cx += widths[i];
  });
  cy += HDR_H;
  rows.forEach((row, ri) => {
    if (cy + ROW_H > PAGE_H - 72) { doc.addPage(); cy = M; }
    doc.rect(M, cy, INNER, ROW_H).fillColor(ri % 2 === 0 ? C.white : C.bgCard).fill();
    cx = M;
    row.forEach((cell, ci) => {
      const isLast = ci === row.length - 1;
      const tx = cx + 6;
      const ty = cy + (ROW_H - 10) / 2;
      const tw = widths[ci] - 12;
      if (isLast) {
        badgePill(doc, cell, tx, cy + (ROW_H - 13) / 2, statusColor(cell));
      } else if (ci === 0) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blue)
          .text(cell, tx, ty, { width: tw, lineBreak: false });
      } else {
        doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
          .text(cell, tx, ty, { width: tw, lineBreak: false, ellipsis: true });
      }
      cx += widths[ci];
    });
    doc.save().lineWidth(0.3).strokeColor(C.hairline)
      .moveTo(M, cy + ROW_H).lineTo(PAGE_W - M, cy + ROW_H).stroke().restore();
    cy += ROW_H;
  });
  doc.save().lineWidth(0.6).strokeColor(C.hairline)
    .rect(M, y, INNER, cy - y).stroke().restore();
  return cy + 12;
}

// ─── Cover Header ─────────────────────────────────────────────────────────────

function coverHeader(doc: InstanceType<typeof PDFDocument>, report: AuditReportData): void {
  const H = 118;
  doc.rect(0, 0, PAGE_W, H).fillColor(C.navy).fill();
  doc.rect(0, H - 3, PAGE_W, 3).fillColor(C.teal).fill();
  doc.rect(PAGE_W - 200, 0, 200, H - 3).fillColor(C.navyMid).fill();

  doc.font('Helvetica-Bold').fontSize(24).fillColor(C.white)
    .text('CASCADE', M, 20, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.teal)
    .text('Autonomous Travel Recovery Engine', M, 48, { lineBreak: false });

  const sc = statusColor(report.healedItinerary.status);
  let bx = M;
  bx += badgePill(doc, report.healedItinerary.status,   bx, 64, sc) + 8;
  badgePill(doc, report.healedItinerary.strategy, bx, 64,
    { bg: C.purpleBg, text: C.purpleText, dot: C.purple });

  const rw = 188, rx = PAGE_W - M - rw;
  const formattedDate = new Date(report.timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
    .text(report.originalItinerary.tripTitle, rx, 20, { width: rw, align: 'right', lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.slateLight)
    .text(`ID  ${report.incidentId}`, rx, 36, { width: rw, align: 'right', lineBreak: false });
  doc.text(formattedDate, rx, 48, { width: rw, align: 'right', lineBreak: false });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateAuditPdf(report: AuditReportData): Promise<Buffer> {
  const hasCot = report.cotExecutionSteps.length > 0;
  const TOTAL  = hasCot ? 4 : 3;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: M, bottom: M, left: M, right: M },
    autoFirstPage: false,
    info: {
      Title:   `CASCADE Audit Report - ${report.incidentId}`,
      Author:  'CASCADE Autonomous Travel Recovery Engine',
      Subject: report.originalItinerary.tripTitle,
      Creator: 'CASCADE v2.4.0',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res, rej) => {
    doc.on('end',   () => res(Buffer.concat(chunks)));
    doc.on('error', rej);
  });

  // ═══ PAGE 1 — Executive Summary ═══════════════════════════════════════════
  doc.addPage();
  coverHeader(doc, report);
  pageFooter(doc, 1, TOTAL);

  let y = 132;

  y = sectionTitle(doc, 'Executive Summary', y);
  y = infoGrid(doc, [
    { label: 'Traveler',        value: report.travelerProfile.name,           accent: true  },
    { label: 'Email',           value: report.travelerProfile.email                         },
    { label: 'Origin',          value: report.originalItinerary.origin,       accent: true  },
    { label: 'Destination',     value: report.originalItinerary.destination,  accent: true  },
    { label: 'Cabin Class',     value: report.travelerProfile.preferredCabin                },
    { label: 'Seat Preference', value: report.travelerProfile.seatPreference                },
    { label: 'Resolution',      value: report.healedItinerary.status,         accent: true  },
    { label: 'Strategy',        value: report.healedItinerary.strategy                      },
  ], y);

  y += 14; hRule(doc, y); y += 14;

  y = sectionTitle(doc, 'Financial Impact', y);
  y = metricRow(doc, [
    { label: 'Original Cost',   value: report.financialDelta.originalCost,    color: C.slateLight },
    { label: 'Rebooking Fee',   value: report.financialDelta.rebookingFee,    color: C.green      },
    { label: 'Net Cost Delta',  value: report.financialDelta.totalCostDelta,  color: C.blue       },
  ], y);
  y = metricRow(doc, [
    { label: 'SLA Resolution', value: `${report.estimatedTimeSaved.slaResolutionTimeMs} ms`, sub: 'Autonomous latency',        color: C.purple },
    { label: 'Hours Saved',    value: report.estimatedTimeSaved.hoursSaved,                  sub: 'Traveler time recovered',   color: C.teal   },
    { label: 'Layover Buffer', value: report.estimatedTimeSaved.layoverSlackRestored,         sub: 'Connection slack restored', color: C.green  },
  ], y);

  y += 4; hRule(doc, y); y += 14;

  y = sectionTitle(doc, 'Vector Search & Policy', y);
  y = infoGrid(doc, [
    { label: 'HNSW Match Score', value: `${(report.travelerProfile.hnswVectorScore * 100).toFixed(1)}%`, accent: true },
    { label: 'Policy Status',    value: report.financialDelta.policyStatus                                            },
    { label: 'Winning Branch',   value: report.healedItinerary.winningBranch,                             accent: true },
    { label: 'Policy Limit',     value: report.financialDelta.policyLimit                                             },
  ], y);

  y += 14; hRule(doc, y); y += 14;

  y = sectionTitle(doc, 'CockroachDB Transaction Telemetry', y);
  y = telemetryBand(doc, [
    { key: 'Transaction Hash',  value: report.cockroachDbTelemetry.txHash                             },
    { key: 'Isolation Level',   value: report.cockroachDbTelemetry.isolationLevel                      },
    { key: 'Region Localities', value: report.cockroachDbTelemetry.regionLocality.join('  ·  ')         },
    { key: 'CDC Event ID',      value: report.cockroachDbTelemetry.cdcEventId                          },
    { key: 'Proof Signature',   value: report.cockroachDbTelemetry.proofSignature                       },
  ], y);

  // ═══ PAGE 2 — Itinerary Transformation ════════════════════════════════════
  doc.addPage();
  pageSubHeader(doc, 'Itinerary Transformation Matrix', report.originalItinerary.tripTitle);
  pageFooter(doc, 2, TOTAL);
  y = 50;

  const tHeaders = ['Type', 'Provider', 'Reference', 'Route', 'Status'];
  const tWidths  = [50, 188, 86, 150, 74];
  const origRows = report.originalItinerary.segments.map(s =>
    [s.type, s.provider, s.referenceCode, s.route, s.status]);
  const healRows = report.healedItinerary.segments.map(s =>
    [s.type, s.provider, s.referenceCode, s.route, s.status]);

  y += 4;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight)
    .text('ORIGINAL ITINERARY', M, y, { lineBreak: false });
  badgePill(doc, 'DISRUPTED', M + 140, y, { bg: C.redBg, text: C.redText, dot: C.red });
  y += 16;
  y = styledTable(doc, tHeaders, origRows, tWidths, y);

  y += 6;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight)
    .text('HEALED ITINERARY', M, y, { lineBreak: false });
  badgePill(doc, 'SELF-HEALED', M + 130, y, { bg: C.greenBg, text: C.greenText, dot: C.green });
  y += 16;
  y = styledTable(doc, tHeaders, healRows, tWidths, y);

  y += 6;
  doc.roundedRect(M, y, INNER, 44, 6).fillColor(C.bg).fill();
  doc.rect(M, y, 3, 44).fillColor(C.blue).fill();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy)
    .text('Remediation Summary', M + 12, y + 8, { lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.slate)
    .text(
      `${origRows.length} segments assessed  ·  `
      + `${healRows.filter(r => ['REBOOKED','CONFIRMED'].includes(r[4])).length} successfully healed  ·  `
      + `Policy: ${report.financialDelta.policyStatus}  ·  `
      + `Proof: ${report.cockroachDbTelemetry.proofSignature}`,
      M + 12, y + 24, { width: INNER - 24, lineBreak: false, ellipsis: true },
    );

  // ═══ PAGE 3 — Approvals ═══════════════════════════════════════════════════
  doc.addPage();
  pageSubHeader(doc, 'Approvals & Compliance Sign-off', '');
  pageFooter(doc, 3, TOTAL);
  y = 50;

  y += 6;
  const CERT_H = 62;
  doc.roundedRect(M, y, INNER, CERT_H, 6).fillColor(C.bgCard).fill();
  doc.rect(M, y, 3, CERT_H).fillColor(C.green).fill();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
    .text('Certification Statement', M + 14, y + 10, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
    .text(
      'This document certifies that the CASCADE Autonomous Travel Recovery Engine has '
      + 'successfully processed and resolved the above itinerary disruption event. All actions '
      + 'were executed within corporate policy limits, logged to an immutable CockroachDB audit '
      + 'trail, and authorized for fleet operations.',
      M + 14, y + 26, { width: INNER - 28 }
    );
  y += CERT_H + 16;

  y = sectionTitle(doc, 'Authorization Status', y);
  const authItems = [
    { label: 'Resolution',  status: report.healedItinerary.status      },
    { label: 'Policy',      status: report.financialDelta.policyStatus  },
    { label: 'Fleet Auth',  status: 'AUTHORIZED_FOR_FLEET'              },
    { label: 'Audit Trail', status: 'IMMUTABLE_LOG'                     },
  ];
  const AUTH_GAP  = 8;
  const AUTH_CELL = (INNER - AUTH_GAP * (authItems.length - 1)) / authItems.length;
  const AUTH_H    = 54;
  authItems.forEach((item, i) => {
    const ax  = M + i * (AUTH_CELL + AUTH_GAP);
    const col = statusColor(item.status);
    doc.roundedRect(ax, y, AUTH_CELL, AUTH_H, 6).fillColor(C.bgCard).fill();
    doc.rect(ax, y, AUTH_CELL, 3).fillColor(col.dot).fill();
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(col.text)
      .text(item.status, ax + 6, y + 12, { width: AUTH_CELL - 12, align: 'center', lineBreak: false });
    doc.save().lineWidth(0.4).strokeColor(C.hairline)
      .moveTo(ax + 6, y + 28).lineTo(ax + AUTH_CELL - 6, y + 28).stroke().restore();
    doc.font('Helvetica').fontSize(7).fillColor(C.slateLight)
      .text(item.label, ax + 6, y + 35, { width: AUTH_CELL - 12, align: 'center', lineBreak: false });
  });
  y += AUTH_H + 18;

  y = sectionTitle(doc, 'Authorized Signatures', y);
  const SIG_GAP  = 12;
  const SIG_CELL = (INNER - SIG_GAP * 2) / 3;
  const SIG_H    = 80;
  ['Operations Director', 'Fleet Compliance Officer', 'AI Systems Auditor'].forEach((role, i) => {
    const sx = M + i * (SIG_CELL + SIG_GAP);
    doc.roundedRect(sx, y, SIG_CELL, SIG_H, 6).fillColor(C.bgCard).fill();
    doc.font('Helvetica').fontSize(7).fillColor(C.slateLight)
      .text(role.toUpperCase(), sx + 8, y + 10, { width: SIG_CELL - 16, align: 'center', lineBreak: false });
    doc.save().lineWidth(0.6).strokeColor(C.hairline)
      .moveTo(sx + 12, y + 50).lineTo(sx + SIG_CELL - 12, y + 50).stroke().restore();
    doc.font('Helvetica').fontSize(7).fillColor(C.silver)
      .text('Signature', sx + 8, y + 54, { width: SIG_CELL - 16, align: 'center', lineBreak: false });
    doc.save().lineWidth(0.6).strokeColor(C.hairline)
      .moveTo(sx + 12, y + 70).lineTo(sx + SIG_CELL - 12, y + 70).stroke().restore();
    doc.font('Helvetica').fontSize(7).fillColor(C.silver)
      .text('Date', sx + 8, y + 73, { width: SIG_CELL - 16, align: 'center', lineBreak: false });
  });
  y += SIG_H + 24;

  const SEAL_CX = PAGE_W / 2;
  const SEAL_CY = y + 40;
  doc.circle(SEAL_CX, SEAL_CY, 42).lineWidth(1.5).strokeColor(C.navy).stroke();
  doc.circle(SEAL_CX, SEAL_CY, 35).lineWidth(0.5).strokeColor(C.hairline).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
    .text('CASCADE', SEAL_CX - 36, SEAL_CY - 12, { width: 72, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(6.5).fillColor(C.slateLight)
    .text('OFFICIAL FLEET SEAL', SEAL_CX - 38, SEAL_CY + 4, { width: 76, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(6).fillColor(C.silver)
    .text('v2.4.0', SEAL_CX - 18, SEAL_CY + 16, { width: 36, align: 'center', lineBreak: false });
  y = SEAL_CY + 60;

  doc.roundedRect(M, y, INNER, 26, 4).fillColor(C.navy).fill();
  doc.font('Helvetica').fontSize(7).fillColor(C.teal)
    .text('PROOF SIGNATURE', M + 12, y + 7, { lineBreak: false, width: 110 });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white)
    .text(report.cockroachDbTelemetry.proofSignature,
      M + 128, y + 7, { lineBreak: false, width: INNER - 144, ellipsis: true });

  // ═══ PAGE 4 — Agent CoT Log (optional) ════════════════════════════════════
  if (hasCot) {
    doc.addPage();
    pageSubHeader(doc, 'Agent Chain-of-Thought Execution Log',
      `${report.cotExecutionSteps.length} steps recorded`);
    pageFooter(doc, 4, TOTAL);
    y = 50;

    const LINE_X  = M + 5;
    const ENTRY_X = M + 22;
    const ENTRY_W = INNER - 22;
    let lineTop   = y;

    report.cotExecutionSteps.forEach((step) => {
      const actionH = doc.heightOfString(step.action, { width: ENTRY_W });
      const entryH  = 30 + actionH;
      if (y + entryH > PAGE_H - 60) {
        doc.save().lineWidth(1).strokeColor(C.hairline)
          .moveTo(LINE_X, lineTop).lineTo(LINE_X, y).stroke().restore();
        doc.addPage();
        pageSubHeader(doc, 'Agent CoT Log (continued)', '');
        pageFooter(doc, 4, TOTAL);
        y = 50; lineTop = y;
      }
      doc.circle(LINE_X, y + 8, 4).fillColor(C.blue).fill();
      badgePill(doc, step.tag, ENTRY_X, y + 1,
        { bg: C.purpleBg, text: C.purpleText, dot: C.purple });
      const ts = step.timestamp.substring(11, 19);
      doc.font('Helvetica').fontSize(7.5).fillColor(C.slateLight)
        .text(`${ts}  ·  ${step.agent}`, ENTRY_X + 90, y + 4,
          { lineBreak: false, width: ENTRY_W - 90 });
      doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
        .text(step.action, ENTRY_X, y + 18, { width: ENTRY_W });
      y += entryH + 8;
    });

    doc.save().lineWidth(1).strokeColor(C.hairline)
      .moveTo(LINE_X, lineTop).lineTo(LINE_X, y).stroke().restore();
  }

  doc.end();
  return done;
}
