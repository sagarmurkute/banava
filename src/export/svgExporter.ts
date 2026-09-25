import type { SceneObject, Page } from '../types/document';

export class SvgExporter {
  public static exportObjectToSvg(obj: SceneObject, pageObjects: SceneObject[]): string {
    const width = Math.max(1, obj.width);
    const height = Math.max(1, obj.height);

    const innerContent = this.renderObjectSvg(obj, 0, 0, pageObjects);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${innerContent}
</svg>`;
  }

  public static exportPageToSvg(page: Page): string {
    if (page.objects.length === 0) {
      return `<svg width="800" height="600" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>`;
    }

    // Compute bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of page.objects) {
      if (obj.parentId) continue; // Root objects only for overall bounds
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

    const rootObjects = page.objects.filter((o) => !o.parentId);
    const renderedNodes = rootObjects
      .map((o) => this.renderObjectSvg(o, minX, minY, page.objects))
      .join('\n  ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${renderedNodes}
</svg>`;
  }

  private static renderObjectSvg(
    obj: SceneObject,
    originX: number,
    originY: number,
    allObjects: SceneObject[]
  ): string {
    if (!obj.visible) return '';

    const relX = obj.x - originX;
    const relY = obj.y - originY;
    const opacity = obj.opacity !== undefined ? obj.opacity / 100 : 1;
    const rot = obj.rotation ? `transform="rotate(${obj.rotation} ${relX + obj.width / 2} ${relY + obj.height / 2})"` : '';
    const opacityAttr = opacity < 1 ? `opacity="${opacity}"` : '';

    switch (obj.type) {
      case 'rectangle': {
        const fill = (obj as any).fill || '#000000';
        const stroke = (obj as any).stroke;
        const strokeWidth = (obj as any).strokeWidth || 1;
        const rx = (obj as any).cornerRadius || 0;
        const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
        return `<rect x="${relX}" y="${relY}" width="${obj.width}" height="${obj.height}" rx="${rx}" fill="${fill}" ${strokeAttr} ${opacityAttr} ${rot} />`;
      }

      case 'ellipse': {
        const fill = (obj as any).fill || '#000000';
        const stroke = (obj as any).stroke;
        const strokeWidth = (obj as any).strokeWidth || 1;
        const cx = relX + obj.width / 2;
        const cy = relY + obj.height / 2;
        const rx = obj.width / 2;
        const ry = obj.height / 2;
        const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
        return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${strokeAttr} ${opacityAttr} ${rot} />`;
      }

      case 'line': {
        const stroke = (obj as any).stroke || '#ffffff';
        const strokeWidth = (obj as any).strokeWidth || 1;
        return `<line x1="${relX}" y1="${relY}" x2="${relX + obj.width}" y2="${relY + obj.height}" stroke="${stroke}" stroke-width="${strokeWidth}" ${opacityAttr} ${rot} />`;
      }

      case 'text': {
        const textObj = obj as any;
        const fill = textObj.fill || '#ffffff';
        const fontSize = textObj.fontSize || 14;
        const fontFamily = textObj.fontFamily || 'Inter, sans-serif';
        const fontWeight = textObj.fontWeight || 'normal';
        const content = (textObj.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<text x="${relX}" y="${relY + fontSize}" fill="${fill}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" ${opacityAttr} ${rot}>${content}</text>`;
      }

      case 'image': {
        const imgObj = obj as any;
        const href = imgObj.src || imgObj.dataUrl || '';
        return `<image x="${relX}" y="${relY}" width="${obj.width}" height="${obj.height}" href="${href}" preserveAspectRatio="none" ${opacityAttr} ${rot} />`;
      }

      case 'frame':
      case 'group':
      case 'instance': {
        const frameObj = obj as any;
        const fill = frameObj.fill || 'transparent';
        const stroke = frameObj.stroke;
        const strokeWidth = frameObj.strokeWidth || 1;
        const rx = frameObj.cornerRadius || 0;
        const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : '';

        const children = allObjects.filter((o) => o.parentId === obj.id);
        const childrenSvg = children
          .map((c) => this.renderObjectSvg(c, obj.x, obj.y, allObjects))
          .join('\n    ');

        return `<g ${rot} ${opacityAttr}>
    <rect x="${relX}" y="${relY}" width="${obj.width}" height="${obj.height}" rx="${rx}" fill="${fill}" ${strokeAttr} />
    <g transform="translate(${relX}, ${relY})">
      ${childrenSvg}
    </g>
  </g>`;
      }

      default:
        return '';
    }
  }
}
