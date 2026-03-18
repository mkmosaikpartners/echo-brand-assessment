import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {});

    doc.font("Helvetica-Bold").fontSize(28).text(`ECHO Snapshot für ${data.company_name}`);
    doc.moveDown(0.4);

    doc.font("Helvetica").fontSize(12).text(
      `Branche: ${data.industry} · Branchenposition: ${data.industry_positioning} · Reifegrad: ${data.maturity}`
    );

    doc.moveDown(1.2);

    sectionTitle(doc, "Position");
    bodyText(doc, data.position_statement);

    sectionTitle(doc, "Einschätzung");
    bodyText(doc, data.assessment);

    sectionTitle(doc, "Woran man das sieht");
    for (const item of data.wording_signals || []) {
      bodyBullet(doc, item);
    }

    doc.moveDown(0.8);

    sectionTitle(doc, "ECHO-Profil");
    bodyText(doc, `Erlebnis (E): ${data.scores.E}`);
    bodyText(doc, `Charakter (C): ${data.scores.C}`);
    bodyText(doc, `Homogenität (H): ${data.scores.H}`);
    bodyText(doc, `Originalität (O): ${data.scores.O}`);
    bodyText(doc, `ECHO-Faktor: ${data.echo_factor}`);

    sectionTitle(doc, "ECHO-Impulse");
    bodyText(doc, `E – Erlebnis: ${data.echo_impulses.E}`);
    bodyText(doc, `C – Charakter: ${data.echo_impulses.C}`);
    bodyText(doc, `H – Homogenität: ${data.echo_impulses.H}`);
    bodyText(doc, `O – Originalität: ${data.echo_impulses.O}`);

    sectionTitle(doc, "Spannungsfelder");
    for (const item of data.tensions || []) {
      bodyBullet(doc, item);
    }

    doc.moveDown(0.8);

    sectionTitle(doc, "Executive-Implikation");
    bodyText(doc, data.executive_implication);

    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(10).fillColor("#666").text(
      `Analysierte Seiten: ${(data.pages_analyzed || []).join(" · ")}`
    );

    doc.end();

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ECHO-Snapshot-${data.company_name}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "PDF konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#666").text(text.toUpperCase());
  doc.moveDown(0.3);
}

function bodyText(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica").fontSize(12.5).fillColor("#111").text(text, {
    lineGap: 4,
  });
  doc.moveDown(0.3);
}

function bodyBullet(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica").fontSize(12.5).fillColor("#111").text(`• ${text}`, {
    lineGap: 4,
  });
  doc.moveDown(0.2);
}
