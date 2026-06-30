import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";

const STICKER_W = 30; // mm
const STICKER_H = 20; // mm
const MARGIN = 5; // mm
const COLS = Math.floor((210 - MARGIN * 2) / STICKER_W); // 6
const ROWS = Math.floor((297 - MARGIN * 2) / STICKER_H); // 14
const PER_PAGE = COLS * ROWS; // 84

function renderToCanvas(barcodeValue: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, barcodeValue, {
    format: "CODE128",
    displayValue: false,
    width: 2,
    height: 60,
    margin: 0,
  });
  return canvas;
}

export function generateBarcodeSheetPdf(itemName: string, barcodeValue: string, count: number): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const canvas = renderToCanvas(barcodeValue);
  const barcodeDataUrl = canvas.toDataURL("image/png");

  const padX = 2;
  const padTop = 5;
  const barcodeW = STICKER_W - padX * 2;
  const barcodeH = STICKER_H - padTop - 1;

  for (let i = 0; i < count; i++) {
    const posOnPage = i % PER_PAGE;
    if (posOnPage === 0 && i > 0) doc.addPage();

    const col = posOnPage % COLS;
    const row = Math.floor(posOnPage / COLS);
    const x = MARGIN + col * STICKER_W;
    const y = MARGIN + row * STICKER_H;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.rect(x, y, STICKER_W, STICKER_H);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(itemName.toUpperCase(), x + STICKER_W / 2, y + 3.5, {
      align: "center",
      maxWidth: STICKER_W - 2,
    });

    doc.addImage(barcodeDataUrl, "PNG", x + padX, y + padTop, barcodeW, barcodeH);
  }

  return doc;
}

export function printBarcodeStickers(itemName: string, barcodeValue: string, count: number): void {
  const canvas = renderToCanvas(barcodeValue);
  const dataUrl = canvas.toDataURL("image/png");

  const safe = itemName.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

  const stickerStyle = [
    "width:3cm", "height:2cm", "border:1px solid #ccc",
    "display:inline-block", "margin:1px", "padding:2px",
    "font-family:monospace", "vertical-align:top",
    "text-align:center", "box-sizing:border-box", "overflow:hidden",
  ].join(";");
  const nameStyle = "font-size:7pt;font-weight:bold;margin:0 0 1px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block";
  const imgStyle = "width:2.6cm;height:1cm;object-fit:contain;display:block;margin:0 auto";

  const sticker = `<div style="${stickerStyle}"><span style="${nameStyle}">${safe.toUpperCase()}</span><img src="${dataUrl}" style="${imgStyle}" /></div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body{margin:0;padding:5mm}
  @page{size:A4;margin:5mm}
  @media print{body{padding:0}}
</style>
</head>
<body>
${Array.from({ length: count }, () => sticker).join("")}
<script>window.onload=function(){window.print()};<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=800,height=600");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
