import type { SceneObject, Page } from '../types/document';
import { SvgExporter } from './svgExporter';

export interface ImageExportOptions {
  format: 'PNG' | 'JPG';
  scale?: 1 | 2 | 3 | 4;
  quality?: number; // 10 - 100 for JPG
  transparent?: boolean;
  backgroundColor?: string;
}

export class ImageExporter {
  public static async exportObjectToDataUrl(
    obj: SceneObject,
    pageObjects: SceneObject[],
    options: ImageExportOptions
  ): Promise<string> {
    const svgStr = SvgExporter.exportObjectToSvg(obj, pageObjects);
    const width = Math.max(1, obj.width);
    const height = Math.max(1, obj.height);
    return this.renderSvgStringToCanvas(svgStr, width, height, options);
  }

  public static async exportPageToDataUrl(
    page: Page,
    options: ImageExportOptions
  ): Promise<string> {
    const svgStr = SvgExporter.exportPageToSvg(page);
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of page.objects) {
      if (obj.parentId) continue;
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width);
      maxY = Math.max(maxY, obj.y + obj.height);
    }

    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    const width = Math.max(10, maxX - minX);
    const height = Math.max(10, maxY - minY);

    return this.renderSvgStringToCanvas(svgStr, width, height, options);
  }

  private static renderSvgStringToCanvas(
    svgString: string,
    width: number,
    height: number,
    options: ImageExportOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const scale = options.scale || 1;
      const targetWidth = width * scale;
      const targetHeight = height * scale;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Background Handling
      if (options.format === 'JPG' || (!options.transparent && options.backgroundColor)) {
        ctx.fillStyle = options.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(url);

        const mimeType = options.format === 'JPG' ? 'image/jpeg' : 'image/png';
        const quality = options.quality ? options.quality / 100 : 0.92;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: generate solid canvas with text or simple shape
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('BANAVA Export Preview', 20, 40);
        resolve(canvas.toDataURL('image/png'));
      };

      img.src = url;
    });
  }
}
