export interface ExportColumn {
  header: string;
  key: string;
  format?: (val: unknown) => string;
}

export interface ExportKPI {
  label: string;
  value: string;
}

/** A titled table with its own total, laid out two per row (e.g. Drinks | Food). */
export interface ExportSection {
  title: string;
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  totalLabel: string;
  totalValue: string;
}

export async function exportToPDF(
  title: string,
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  businessName?: string,
  subtitle?: string,
  kpis?: ExportKPI[],
  /** When given, these are drawn side by side instead of the single table. */
  sections?: ExportSection[],
  /** Line under the sections, e.g. the grand total. */
  grandTotal?: { label: string; value: string }
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  const PW = doc.internal.pageSize.width;  // 297
  const PH = doc.internal.pageSize.height; // 210
  const M = 14;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-RW", {
    year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-RW", {
    hour: "2-digit", minute: "2-digit",
  });

  // ── 1. HEADER BAND ───────────────────────────────────────────────────────────
  const HDR_H = 36;
  doc.setFillColor(30, 41, 59); // navy
  doc.rect(0, 0, PW, HDR_H, "F");

  // Logo placeholder — blue rounded rect with DELRON / AI POS text
  doc.setFillColor(59, 130, 246); // blue
  doc.roundedRect(M, 6, 26, 20, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("DELRON", M + 13, 14, { align: "center" });
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text("AI POS", M + 13, 20, { align: "center" });

  // Brand name — large white bold
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("DELRON AI POS", M + 30, 16);

  // Tagline — smaller, slate-300
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("Smart Business Intelligence Platform", M + 30, 24);

  // Right column: date (bold white) / time and business (slate-300)
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(dateStr, PW - M, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(timeStr, PW - M, 20, { align: "right" });
  if (businessName) {
    doc.text(businessName, PW - M, 28, { align: "right" });
  }

  // Blue accent line under header band
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(M, HDR_H + 0.5, PW - M, HDR_H + 0.5);

  // ── 2. REPORT TITLE ──────────────────────────────────────────────────────────
  let cursorY = HDR_H + 9;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(title, M, cursorY);

  if (subtitle) {
    cursorY += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, M, cursorY);
  }

  cursorY += 6;

  // ── 3. KPI SUMMARY BOXES ─────────────────────────────────────────────────────
  if (kpis && kpis.length > 0) {
    cursorY += 3;
    const count = Math.min(kpis.length, 5);
    const gap = 4;
    const boxW = (PW - M * 2 - gap * (count - 1)) / count;
    const boxH = 20;

    kpis.slice(0, count).forEach((kpi, i) => {
      const bx = M + i * (boxW + gap);
      const by = cursorY;

      // Box background + border
      doc.setFillColor(239, 246, 255); // light blue bg
      doc.setDrawColor(191, 219, 254); // light blue border
      doc.setLineWidth(0.4);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, "FD");

      // Left accent bar (solid blue)
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(bx, by, 3, boxH, 1, 1, "F");

      // Label — small uppercase slate
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label.toUpperCase(), bx + 6, by + 7.5);

      // Value — bold dark, shrink if too wide for the box
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const fs = doc.getTextWidth(kpi.value) > boxW - 9 ? 8 : 10;
      doc.setFontSize(fs);
      doc.text(kpi.value, bx + 6, by + 16);
    });

    cursorY += boxH + 6;
  }

  // ── 4. DATA TABLE(S) ─────────────────────────────────────────────────────────
  // Mini-header drawn on pages 2+ inside didDrawPage
  const drawMiniHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, PW, 13, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("DELRON AI POS", M, 9);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(`  ·  ${title}`, M + 34, 9);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(M, 13.5, PW - M, 13.5);
  };
  const currentPage = () =>
    (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } })
      .internal.getCurrentPageInfo().pageNumber;
  const onPage = () => { if (currentPage() > 1) drawMiniHeader(); };

  const tableStyles = {
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.2,
      textColor: [15, 23, 42] as [number, number, number],
      font: "helvetica",
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number], // navy header row
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 8.5,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    },
    alternateRowStyles: {
      fillColor: [240, 249, 255] as [number, number, number], // very light blue alternate rows
    },
  };
  const toRows = (rowsData: Record<string, unknown>[], cols: ExportColumn[]) =>
    rowsData.map((row) =>
      cols.map((c) => {
        const val = row[c.key];
        return c.format ? c.format(val) : val != null ? String(val) : "";
      })
    );
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  if (sections && sections.length > 0) {
    // Two tables per row band, each with its own title and total.
    const gap = 6;
    const colW = (PW - M * 2 - gap) / 2;
    for (let b = 0; b < sections.length; b += 2) {
      const band = sections.slice(b, b + 2);
      const bandPage = currentPage();
      const bandY = cursorY + 2;
      let endPage = bandPage;
      let endY = bandY;
      band.forEach((sec, k) => {
        doc.setPage(bandPage);
        const left = M + k * (colW + gap);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(sec.title, left, bandY + 4);
        doc.setFontSize(9);
        doc.setTextColor(37, 99, 235);
        doc.text(sec.totalValue, left + colW, bandY + 4, { align: "right" });

        const body = toRows(sec.data, sec.columns);
        autoTable(doc, {
          head: [sec.columns.map((c) => c.header)],
          body: body.length > 0 ? body : [[{ content: "No sales", colSpan: sec.columns.length, styles: { halign: "center", textColor: [148, 163, 184] } }]],
          foot: [[
            { content: sec.totalLabel, colSpan: sec.columns.length - 1, styles: { halign: "right" } },
            { content: sec.totalValue, styles: { halign: "right" } },
          ]],
          showFoot: "lastPage",
          startY: bandY + 7,
          margin: { left, right: PW - left - colW, top: 17, bottom: 16 },
          ...tableStyles,
          styles: { ...tableStyles.styles, fontSize: 7.5, cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 } },
          footStyles: { fillColor: [219, 234, 254], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8.5 },
          didDrawPage: onPage,
        });
        const p = currentPage();
        const y = lastY();
        if (p > endPage || (p === endPage && y > endY)) { endPage = p; endY = y; }
      });
      doc.setPage(endPage);
      cursorY = endY + 6;
    }

    if (grandTotal) {
      if (cursorY + 14 > PH - 16) { doc.addPage(); drawMiniHeader(); cursorY = 20; }
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(M, cursorY, PW - M * 2, 12, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(grandTotal.label, M + 5, cursorY + 8);
      doc.text(grandTotal.value, PW - M - 5, cursorY + 8, { align: "right" });
      cursorY += 18;
    }
  } else {
    autoTable(doc, {
      head: [columns.map((c) => c.header)],
      body: toRows(data, columns),
      startY: cursorY + 2,
      // top: subsequent-page top margin (below mini-header); bottom: leave room for footer
      margin: { left: M, right: M, top: 17, bottom: 16 },
      ...tableStyles,
      didDrawPage: onPage,
    });
  }

  // ── 5. FOOTER — drawn on every page after table is complete ─────────────────
  const pageCount = (
    doc as unknown as { internal: { getNumberOfPages: () => number } }
  ).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Separator line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 11, PW - M, PH - 11);
    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by DELRON AI POS  |  Page ${i} of ${pageCount}  |  Confidential`,
      PW / 2,
      PH - 6,
      { align: "center" }
    );
  }

  const fileName = `${title.toLowerCase().replace(/\s+/g, "-")}-${now.toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

export async function exportToExcel(
  title: string,
  sheets: { name: string; data: Record<string, unknown>[]; columns: ExportColumn[] }[]
): Promise<void> {
  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const rows = sheet.data.map((row) => {
      const obj: Record<string, unknown> = {};
      sheet.columns.forEach((c) => {
        const val = row[c.key];
        obj[c.header] = c.format ? c.format(val) : (val ?? "");
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = sheet.columns.map((c) => ({
      wch: Math.max(c.header.length + 2, 14),
    }));

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
  }

  const fileName = `${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
