import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import JSZip from 'jszip';
import { PageConfig, VectorObject } from '../types/document';
import { generateFullSvgString } from './svgRenderer';

/**
 * Parses SVG string into an SVGElement in the browser DOM
 */
function parseSvgElement(svgString: string): SVGElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error('Failed to parse SVG for PDF generation: ' + errorNode.textContent);
  }
  return doc.documentElement as unknown as SVGElement;
}

/**
 * Export single PDF document
 */
export async function exportToPdf(
  page: PageConfig,
  objects: VectorObject[],
  fileName = 'design.pdf',
  replacements?: Record<string, string>
): Promise<void> {
  const orientation = page.orientation === 'landscape' ? 'l' : 'p';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [page.width, page.height],
    compress: true,
  });

  const svgString = generateFullSvgString(page, objects, replacements);
  const svgEl = parseSvgElement(svgString);

  // svg2pdf.js adds .svg method to jsPDF instance
  // @ts-expect-error svg2pdf extends jsPDF
  await doc.svg(svgEl, {
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
  });

  doc.save(fileName);
}

/**
 * Export batch PDF documents
 * Either as a single multi-page PDF or a ZIP archive containing individual PDFs
 */
export async function exportBatchPdf(
  page: PageConfig,
  objects: VectorObject[],
  records: Record<string, string>[],
  baseFileName = 'template-output',
  format: 'merged' | 'zip' = 'merged',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error('No records provided for batch export.');
  }

  const orientation = page.orientation === 'landscape' ? 'l' : 'p';

  if (format === 'merged') {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: [page.width, page.height],
      compress: true,
    });

    for (let i = 0; i < records.length; i++) {
      if (i > 0) {
        doc.addPage([page.width, page.height], orientation);
      }

      const svgString = generateFullSvgString(page, objects, records[i]);
      const svgEl = parseSvgElement(svgString);

      // @ts-expect-error svg2pdf extends jsPDF
      await doc.svg(svgEl, {
        x: 0,
        y: 0,
        width: page.width,
        height: page.height,
      });

      if (onProgress) {
        onProgress(i + 1, records.length);
      }
    }

    doc.save(`${baseFileName}-all-${records.length}-pages.pdf`);
    return;
  }

  // Format == 'zip'
  const zip = new JSZip();

  for (let i = 0; i < records.length; i++) {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: [page.width, page.height],
      compress: true,
    });

    const svgString = generateFullSvgString(page, objects, records[i]);
    const svgEl = parseSvgElement(svgString);

    // @ts-expect-error svg2pdf extends jsPDF
    await doc.svg(svgEl, {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    });

    const pdfBlob = doc.output('blob');
    const indexStr = String(i + 1).padStart(3, '0');
    const fileName = `${baseFileName}-${indexStr}.pdf`;
    zip.file(fileName, pdfBlob);

    if (onProgress) {
      onProgress(i + 1, records.length);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(zipContent);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${baseFileName}-batch-pdfs.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
