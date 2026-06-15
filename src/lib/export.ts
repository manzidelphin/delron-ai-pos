export interface ExportColumn {
  header: string;
  key: string;
  format?: (val: unknown) => string;
}

export async function exportToPDF(
  title: string,
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  businessName?: string,
  subtitle?: string
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });

  // Header bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 297, 28, "F");

  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246); // blue-500
  doc.setFont("helvetica", "bold");
  doc.text("DELRON AI POS", 14, 12);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont("helvetica", "normal");
  doc.text(businessName ?? "Business Report", 14, 20);

  // Title section
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-950 on white
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 40);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 48);
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-RW")}`,
    doc.internal.pageSize.width - 14,
    40,
    { align: "right" }
  );

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      return c.format ? c.format(val) : val != null ? String(val) : "";
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: subtitle ? 54 : 48,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: "center" }
    );
  }

  const fileName = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
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

    // Auto-size columns
    worksheet["!cols"] = sheet.columns.map((c) => ({
      wch: Math.max(c.header.length + 2, 14),
    }));

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
  }

  const fileName = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
