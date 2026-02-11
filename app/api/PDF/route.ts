import { NextResponse } from "next/server";
import { z } from "zod";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

const PdfSchema = z.object({
  company_name: z.string().min(1),
  industry: z.string().min(1),
  url: z.string().min(1),

  position_statement: z.string().min(10),
  scores: z.object({
    E: z.number(),
    C: z.number(),
    H: z.number(),
    O: z.number(),
  }),
  echo_factor: z.number(),
  maturity: z.string().min(2),
  industry_positioning: z.string().min(2),
  tensions: z.array(z.string()).min(3).max(3),
  executive_implication: z.string().min(10),

  // optional
  meta: z
    .object({
      pages_analyzed: z.array(z.string()).optional(),
    })
    .optional(),
});

function safeFilename(s: string) {
  return s
    .replace(/[^\wäöüÄÖÜß\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function POST(req: Request) {
  try {
    const data = PdfSchema.parse(await req.json());

    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      info: {
        Title: `ECHO Snapshot – ${data.company_name}`,
        Author: "Mosaik & Partners",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));

    // Typo (minimalistisch)
    const H1 = 22;
    const H2 = 12;
    const BODY = 10.5;

    doc.font("Helvetica");

    // Titel
    doc.fontSize(H1).text(`ECHO Snapshot`, { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(14).text(`für ${data.company_name}`, { align: "left" });
    doc.moveDown(0.6);

    doc.fontSize(9).fillColor("#444").text(`Branche: ${data.industry}`, { continued: true });
    doc.text(`   ·   Quelle: ${data.url}`);
    doc.fillColor("#000");
    doc.moveDown(1.1);

    // Position
    doc.fontSize(H2).text("Position", { underline: false });
    doc.moveDown(0.3);
    doc.fontSize(13).text(data.position_statement);
    doc.moveDown(1.2);

    // Profil
    doc.fontSize(H2).text("ECHO-Profil");
    doc.moveDown(0.4);
    doc.fontSize(BODY);

    doc.text(`Erlebnis (E): ${Math.round(data.scores.E)}`);
    doc.text(`Charakter (C): ${Math.round(data.scores.C)}`);
    doc.text(`Homogenität (H): ${Math.round(data.scores.H)}`);
    doc.text(`Originalität (O): ${Math.round(data.scores.O)}`);
    doc.moveDown(0.6);

    doc.fontSize(11).text(`ECHO-Faktor: ${Math.round(data.echo_factor)}`, { continued: true });
    doc.text(`   ·   Reifegrad: ${data.maturity}`, { continued: true });
    doc.text(`   ·   Branchenposition: ${data.industry_positioning}`);
    doc.moveDown(1.1);

    // Spannungsfelder
    doc.fontSize(H2).text("Spannungsfelder");
    doc.moveDown(0.4);
    doc.fontSize(BODY);
    for (const t of data.tensions) {
      doc.text(`– ${t}`);
      doc.moveDown(0.2);
    }
    doc.moveDown(0.9);

    // Executive-Implikation
    doc.fontSize(H2).text("Executive-Implikation");
    doc.moveDown(0.4);
    doc.fontSize(BODY).text(data.executive_implication);
    doc.moveDown(1.0);

    // Footer minimal
    doc.fontSize(8).fillColor("#666");
    doc.text(`Momentaufnahme · ECHO als Methode, Identität greifbar zu machen · Mosaik & Partners`, {
      align: "left",
    });
    doc.fillColor("#000");

    doc.end();

    const buffer = Buffer.concat(chunks);
    const filename = `ECHO-${safeFilename(data.company_name)}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "PDF Error" }, { status: 500 });
  }
}
