import type { Page } from '../types/document';
import { SvgExporter } from './svgExporter';

export class PdfExporter {
  /**
   * Generates a printable HTML/CSS or vector SVG printable packet for PDF export
   * which triggers browser Print-to-PDF or generates an encapsulated document stream
   */
  public static async exportPagesToPdfBlob(pages: Page[]): Promise<Blob> {
    const pagesSvg = pages.map((page) => {
      const svg = SvgExporter.exportPageToSvg(page);
      return `<div class="pdf-page" style="page-break-after: always; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #ffffff;">
        ${svg}
      </div>`;
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BANAVA Export PDF</title>
  <style>
    @page { size: auto; margin: 0; }
    body { margin: 0; padding: 0; background: #ffffff; font-family: Inter, sans-serif; }
    .pdf-page { page-break-after: always; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    svg { max-width: 100%; max-height: 100%; height: auto; }
  </style>
</head>
<body>
  ${pagesSvg.join('\n')}
</body>
</html>`;

    return new Blob([html], { type: 'text/html' });
  }

  public static printDocumentAsPdf(pages: Page[]) {
    const pagesSvg = pages.map((page) => {
      const svg = SvgExporter.exportPageToSvg(page);
      return `<div class="pdf-page" style="page-break-after: always; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #ffffff;">
        ${svg}
      </div>`;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BANAVA PDF Export</title>
  <style>
    @page { size: auto; margin: 0; }
    body { margin: 0; padding: 0; background: #ffffff; font-family: Inter, sans-serif; }
    .pdf-page { page-break-after: always; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    svg { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  ${pagesSvg.join('\n')}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  }
}
