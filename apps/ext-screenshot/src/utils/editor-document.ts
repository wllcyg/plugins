import { FabricImage, StaticCanvas, util, type FabricObject } from 'fabric';

export interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditorDocument {
  objects: ReturnType<FabricObject['toObject']>[];
  crop?: CropBounds;
}

export function restoreObjects(document: EditorDocument) {
  return util.enlivenObjects<FabricObject>(document.objects);
}

export async function renderEditedImage(
  source: HTMLImageElement,
  document: EditorDocument
): Promise<Blob> {
  const crop = document.crop ?? { x: 0, y: 0, width: source.naturalWidth, height: source.naturalHeight };
  const output = new StaticCanvas(undefined, {
    width: crop.width,
    height: crop.height,
    enableRetinaScaling: false,
    renderOnAddRemove: false
  });
  try {
    output.setViewportTransform([1, 0, 0, 1, -crop.x, -crop.y]);
    output.add(new FabricImage(source), ...await restoreObjects(document));
    output.renderAll();
    const png = await new Promise<Blob | null>((resolve) => output.lowerCanvasEl.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('Could not export the edited PNG');
    return png;
  } finally {
    await output.dispose();
  }
}
