# PDF Generator

This project now uses a native vector PDF generator powered by `pdfkit` instead of a screenshot-based browser approach. The output is crisp, selectable text and professionally-rendered vector layout.

Usage:

1. Install the new runtime dependencies:

```bash
npm install
```

2. Generate a PDF:

```bash
npm run generate-pdf
```

Or run directly with `tsx`:

```bash
npx tsx src/tools/generate-pdf.ts -- --output out/test-audit-report.pdf
```

API Endpoint:

- `GET /api/audit-report/:incidentId/pdf` returns the generated PDF with `Content-Type: application/pdf`.

Notes:
- The generator now creates real vector text, tables, clean margins, and a dedicated approvals section.
- The CLI wrapper writes a sample audit report PDF to disk.
