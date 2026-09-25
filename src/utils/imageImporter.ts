import { generateId } from './id';
import { saveAssetBlob } from '../storage/indexedDb';
import type { Asset, ImageObject } from '../types/document';

export async function processImageFile(
  file: File,
  canvasX: number = 200,
  canvasY: number = 200
): Promise<{ asset: Asset; imageObject: ImageObject }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onload = async () => {
        const assetId = generateId('asset');
        const asset: Asset = {
          id: assetId,
          type: file.type as Asset['type'],
          name: file.name,
          width: img.width,
          height: img.height,
          dataUrl,
          createdAt: Date.now(),
        };

        // Persist binary to IndexedDB
        await saveAssetBlob(assetId, file);

        // Compute sensible initial canvas dimensions (max 400px wide)
        let w = img.width;
        let h = img.height;
        const maxInitialDim = 380;

        if (w > maxInitialDim || h > maxInitialDim) {
          const ratio = w / h;
          if (w > h) {
            w = maxInitialDim;
            h = Math.round(maxInitialDim / ratio);
          } else {
            h = maxInitialDim;
            w = Math.round(maxInitialDim * ratio);
          }
        }

        const imageObject: ImageObject = {
          id: generateId('img'),
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          assetId,
          src: dataUrl,
          x: Math.round(canvasX - w / 2),
          y: Math.round(canvasY - h / 2),
          width: Math.max(w, 40),
          height: Math.max(h, 40),
          rotation: 0,
          opacity: 100,
          visible: true,
          locked: false,
          parentId: null,
          cornerRadius: 0,
          aspectRatio: img.width / img.height,
          fit: 'cover',
        };

        resolve({ asset, imageObject });
      };

      img.onerror = () => reject(new Error('Failed to parse image file.'));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
