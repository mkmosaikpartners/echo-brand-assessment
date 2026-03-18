import { NextResponse } from "next/server";

export const runtime = "nodejs";

// pdfkit sicher laden
const PDFDocument = require("pdfkit");

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const buffer = await buildPdf(data);

    const safeName = String(data.company_name || "ECHO-Snapshot")
      .replace(/[^\wäöüÄÖÜß\- ]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ECHO-Snapshot-${safeName}.pdf"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "PDF konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}

function buildPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      // Titel
      doc.font("Helvetica-Bold").fontSize(28).fillColor("#111");
      doc.text(`ECHO Snapshot für ${data.company_name || ""}`);

      doc.moveDown(0.4);

      // Meta
      doc.font("Helvetica").fontSize(12).fillColor("#111");
      doc.text(
        `Branche: ${data.industry || ""} · Branchenposition: ${data.industry_positioning || ""} · Reifegrad: ${data.maturity || ""}`
      );

      doc.moveDown(1.2);

      sectionTitle(doc, "Position");
      bodyText(doc, data.position_statement || "");

      sectionTitle(doc, "Einschätzung");
      bodyText(doc, data.assessment || "");

      sectionTitle(doc, "Woran man das sieht");
      for (const item of data.wording_signals || []) {
        bodyBullet(doc, item);
      }

      sectionTitle(doc, "ECHO-Profil");
      bodyText(doc, `Erlebnis (E): ${data.scores?.E ?? ""}`);
      bodyText(doc, `Charakter (C): ${data.scores?.C ?? ""}`);
      bodyText(doc, `Homogenität (H): ${data.scores?.H ?? ""}`);
      bodyText(doc, `Originalität (O): ${data.scores?.O ?? ""}`);
      bodyText(doc, `ECHO-Faktor: ${data.echo_factor ?? ""}`);

      sectionTitle(doc, "ECHO-Impulse");
      bodyText(doc, `E – Erlebnis: ${data.echo_impulses?.E || ""}`);
      bodyText(doc, `C – Charakter: ${data.echo_impulses?.C || ""}`);
      bodyText(doc, `H – Homogenität: ${data.echo_impulses?.H || ""}`);
      bodyText(doc, `O – Originalität: ${data.echo_impulses?.O || ""}`);

      sectionTitle(doc, "Spannungsfelder");
      for (const item of data.tensions || []) {
        bodyBullet(doc, item);
      }

      sectionTitle(doc, "Executive-Implikation");
      bodyText(doc, data.executive_implication || "");

      if ((data.pages_analyzed || []).length) {
        doc.moveDown(1.2);
        doc.font("Helvetica").fontSize(10).fillColor("#666");
        doc.text(`Analysierte Seiten: ${(data.pages_analyzed || []).join(" · ")}`);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function sectionTitle(doc: any, text: string) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#666");
  doc.text(text.toUpperCase());
  doc.moveDown(0.3);
}

function bodyText(doc: any, text: string) {
  doc.font("Helvetica").fontSize(12.5).fillColor("#111");
  doc.text(text || "", { lineGap: 4 });
  doc.moveDown(0.3);
}

function bodyBullet(doc: any, text: string) {
  doc.font("Helvetica").fontSize(12.5).fillColor("#111");
  doc.text(`• ${text}`, { lineGap: 4 });
  doc.moveDown(0.2);
}
