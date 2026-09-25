import type { DocumentModel, SceneObject, ImageObject, Asset } from '../types/document';
import { DocumentValidator, type FileValidationResult } from '../documents/validation';
import { generateId } from '../utils/id';

export interface ImageImportResult {
  asset: Asset;
  imageObject: ImageObject;
}

export class ImportEngine {
  /**
   * Import a .banava file from File / Blob input
   */
  public static async importBanavaFile(file: File): Promise<FileValidationResult> {
    try {
      const text = await file.text();
      return DocumentValidator.validate(text);
    } catch (err: any) {
      return {
        valid: false,
        canRecover: false,
        errors: [`Failed to read file: ${err.message || 'Unknown read error'}`],
        warnings: [],
      };
    }
  }

  /**
   * Import an image file (PNG, JPG, WEBP, GIF, SVG), register as an asset, and create a SceneObject
   */
  public static async importImageFile(
    file: File,
    targetX = 100,
    targetY = 100
  ): Promise<ImageImportResult> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const { width, height } = await this.getImageDimensions(dataUrl);

    const assetId = generateId('asset');
    const asset: Asset = {
      id: assetId,
      name: file.name,
      type: (file.type as any) || 'image/png',
      width,
      height,
      dataUrl,
      createdAt: Date.now(),
    };

    // Cap default placement size nicely if image is massive
    let displayWidth = width;
    let displayHeight = height;
    if (displayWidth > 800) {
      const ratio = 800 / displayWidth;
      displayWidth = 800;
      displayHeight = Math.round(height * ratio);
    }

    const imageObject: ImageObject = {
      id: generateId('img'),
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: 'image',
      x: targetX,
      y: targetY,
      width: displayWidth,
      height: displayHeight,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      src: dataUrl,
      assetId,
      aspectRatio: width / Math.max(1, height),
      fit: 'cover',
      cornerRadius: 0,
    };

    return { asset, imageObject };
  }

  /**
   * Resolve and merge pasted objects from clipboard across documents without broken component references
   */
  public static mergeClipboardObjects(
    targetDoc: DocumentModel,
    pastedPayload: {
      objects: SceneObject[];
      components?: Record<string, any>;
      styles?: any;
      variables?: any;
    },
    targetPageId: string,
    offset = { x: 20, y: 20 }
  ): DocumentModel {
    const idMap = new Map<string, string>();
    const clonedObjects: SceneObject[] = [];

    // 1. Generate new IDs for all pasted objects to prevent collisions
    for (const obj of pastedPayload.objects) {
      const newId = generateId(obj.type || 'obj');
      idMap.set(obj.id, newId);
    }

    // 2. Clone and re-map parentIds and coordinates
    for (const obj of pastedPayload.objects) {
      const cloned: SceneObject = JSON.parse(JSON.stringify(obj));
      cloned.id = idMap.get(obj.id) || cloned.id;
      if (cloned.parentId && idMap.has(cloned.parentId)) {
        cloned.parentId = idMap.get(cloned.parentId)!;
      } else {
        cloned.parentId = null; // Detached from non-existent foreign parent
      }

      // Offset root objects
      if (!cloned.parentId) {
        cloned.x += offset.x;
        cloned.y += offset.y;
      }

      clonedObjects.push(cloned);
    }

    // 3. Merge components safely
    const nextComponents = { ...targetDoc.components, ...(pastedPayload.components || {}) };

    // 4. Update target page
    const nextPages = targetDoc.pages.map((p) => {
      if (p.id === targetPageId) {
        return {
          ...p,
          objects: [...p.objects, ...clonedObjects],
        };
      }
      return p;
    });

    return {
      ...targetDoc,
      pages: nextPages,
      components: nextComponents,
      updatedAt: Date.now(),
    };
  }

  private static readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private static getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth || 400,
          height: img.naturalHeight || 300,
        });
      };
      img.onerror = () => {
        resolve({ width: 400, height: 300 });
      };
      img.src = dataUrl;
    });
  }
}
