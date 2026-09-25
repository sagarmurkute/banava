import type { SceneObject, Page, DocumentModel } from '../types/document';
import type { ExportSetting } from '../documents/types';
import { BANAVA_FILE_EXTENSION } from '../documents/types';
import { SvgExporter } from './svgExporter';
import { ImageExporter } from './imageExporter';
import { PdfExporter } from './pdfExporter';

export class ExportEngine {
  /**
   * Export an individual object according to an export configuration
   */
  public static async exportObject(
    obj: SceneObject,
    pageObjects: SceneObject[],
    setting: ExportSetting
  ): Promise<void> {
    const filename = `${this.sanitizeFilename(obj.name)}${setting.suffix || ''}`;

    switch (setting.format) {
      case 'SVG': {
        const svgContent = SvgExporter.exportObjectToSvg(obj, pageObjects);
        this.downloadFile(svgContent, `${filename}.svg`, 'image/svg+xml;charset=utf-8');
        break;
      }

      case 'PNG':
      case 'JPG': {
        const dataUrl = await ImageExporter.exportObjectToDataUrl(obj, pageObjects, {
          format: setting.format,
          scale: setting.scale,
          quality: setting.quality,
          transparent: setting.transparent,
          backgroundColor: setting.backgroundColor,
        });
        this.downloadDataUrl(dataUrl, `${filename}.${setting.format.toLowerCase()}`);
        break;
      }

      case 'PDF': {
        // Wrap object in single-page export
        const tempPage: Page = {
          id: 'temp_pdf_page',
          name: obj.name,
          objects: [obj, ...pageObjects.filter((o) => o.parentId === obj.id)],
        };
        PdfExporter.printDocumentAsPdf([tempPage]);
        break;
      }

      default:
        console.warn(`Unsupported object export format: ${setting.format}`);
    }
  }

  /**
   * Export an entire page according to an export configuration
   */
  public static async exportPage(page: Page, setting: ExportSetting): Promise<void> {
    const filename = `${this.sanitizeFilename(page.name)}${setting.suffix || ''}`;

    switch (setting.format) {
      case 'SVG': {
        const svgContent = SvgExporter.exportPageToSvg(page);
        this.downloadFile(svgContent, `${filename}.svg`, 'image/svg+xml;charset=utf-8');
        break;
      }

      case 'PNG':
      case 'JPG': {
        const dataUrl = await ImageExporter.exportPageToDataUrl(page, {
          format: setting.format,
          scale: setting.scale,
          quality: setting.quality,
          transparent: setting.transparent,
          backgroundColor: setting.backgroundColor,
        });
        this.downloadDataUrl(dataUrl, `${filename}.${setting.format.toLowerCase()}`);
        break;
      }

      case 'PDF': {
        PdfExporter.printDocumentAsPdf([page]);
        break;
      }

      default:
        console.warn(`Unsupported page export format: ${setting.format}`);
    }
  }

  /**
   * Export the entire document as an official .banava file
   */
  public static exportDocumentBanava(doc: DocumentModel): void {
    const filename = `${this.sanitizeFilename(doc.name || 'Untitled')}${BANAVA_FILE_EXTENSION}`;
    const serialized = JSON.stringify(doc, null, 2);
    this.downloadFile(serialized, filename, 'application/json');
  }

  /**
   * Export entire document as multi-page PDF
   */
  public static exportDocumentPdf(doc: DocumentModel): void {
    PdfExporter.printDocumentAsPdf(doc.pages);
  }

  private static sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'export';
  }

  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.downloadDataUrl(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private static downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
