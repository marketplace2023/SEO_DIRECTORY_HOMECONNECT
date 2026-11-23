import type { BudgetLine, Invoice } from "@/domain/contractor-estimates";
import { money, type Language } from "@/domain/types";

export function downloadDocument(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function pdf(name: string, title: string, paragraphs: string[]) {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const heading = await document.embedFont(StandardFonts.HelveticaBold);
  const font = await document.embedFont(StandardFonts.Helvetica);
  // Standard PDF fonts only support WinAnsi. Keep supported accents.
  function supported(value: string) {
    return Array.from(value, (character) => {
      try {
        font.encodeText(character);
        return character;
      } catch {
        return character === "\n" ? " " : "?";
      }
    }).join("");
  }
  let page = document.addPage([612, 792]);
  let y = 740;
  for (const [index, paragraph] of [title, ...paragraphs].entries()) {
    const face = index ? font : heading;
    const size = index ? 11 : 19;
    let line = "";
    for (const character of supported(paragraph)) {
      if (face.widthOfTextAtSize(line + character, size) > 510) {
        if (y < 55) {
          page = document.addPage([612, 792]);
          y = 740;
        }
        page.drawText(line, { x: 50, y, size, font: face });
        y -= size + 4;
        line = "";
      }
      line += character;
    }
    if (y < 55) {
      page = document.addPage([612, 792]);
      y = 740;
    }
    page.drawText(line, { x: 50, y, size, font: face });
    y -= size + 12;
  }
  downloadDocument(
    new Blob([new Uint8Array(await document.save())], {
      type: "application/pdf",
    }),
    `${name}.pdf`,
  );
}

export async function exportBudget(
  id: string,
  title: string,
  lines: BudgetLine[],
  format: "pdf" | "xlsx",
  language: Language,
  revision: string,
) {
  const es = language === "es";
  const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const name = `home-connect-${es ? "presupuesto" : "estimate"}-${id.slice(0, 8)}`;
  if (format === "pdf") {
    await pdf(name, `${es ? "Presupuesto" : "Estimate"} · ${title}`, [
      revision,
      ...lines.map(
        (line) =>
          `${line.code} · ${line.description} | ${line.quantity / 1000} ${line.unit} × ${money(line.unitPriceCents / 100, language)} = ${money(line.amountCents / 100, language)}`,
      ),
      `Total USD · ${money(total / 100, language)}`,
    ]);
    return;
  }
  const {
    default: { Workbook },
  } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(es ? "Presupuesto" : "Estimate");
  sheet.addRows([
    [title],
    [revision],
    es
      ? [
          "Código",
          "Descripción",
          "Cantidad",
          "Unidad",
          "Precio USD",
          "Importe USD",
        ]
      : [
          "Code",
          "Description",
          "Quantity",
          "Unit",
          "Unit price USD",
          "Amount USD",
        ],
    ...lines.map((line) => [
      line.code,
      line.description,
      line.quantity / 1000,
      line.unit,
      line.unitPriceCents / 100,
      line.amountCents / 100,
    ]),
    ["Total USD", null, null, null, null, total / 100],
  ]);
  [18, 52, 14, 12, 18, 18].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getRow(3).font = { bold: true };
  sheet.getColumn(5).numFmt = '"$"#,##0.00';
  sheet.getColumn(6).numFmt = '"$"#,##0.00';
  downloadDocument(
    new Blob([new Uint8Array(await workbook.xlsx.writeBuffer())], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${name}.xlsx`,
  );
}

export function exportInvoice(
  title: string,
  invoice: Pick<
    Invoice,
    "number" | "issuedAt" | "grossCents" | "retainedCents" | "dueCents"
  >,
  paid: number,
  language: Language,
) {
  const es = language === "es";
  return pdf(
    invoice.number,
    `${es ? "Factura de obra" : "Project invoice"} · ${invoice.number}`,
    [
      title,
      `${es ? "Fecha de emisión" : "Issue date"} · ${invoice.issuedAt.slice(0, 10)}`,
      `${es ? "Importe bruto" : "Gross amount"} · ${money(invoice.grossCents / 100, language)}`,
      `${es ? "Retención" : "Retainage"} · ${money(invoice.retainedCents / 100, language)}`,
      `${es ? "Importe facturado" : "Invoice amount"} · ${money(invoice.dueCents / 100, language)}`,
      `${es ? "Pagado" : "Paid"} · ${money(paid / 100, language)}`,
      `${es ? "Saldo USD" : "Balance USD"} · ${money((invoice.dueCents - paid) / 100, language)}`,
    ],
  );
}
