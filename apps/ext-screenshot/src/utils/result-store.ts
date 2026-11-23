import type { EditorDocument } from './editor-document';

export interface CaptureResult {
  id: string;
  image: Blob;
  filename: string;
  createdAt: number;
  editedImage?: Blob;
  editorDocument?: EditorDocument;
}

function openResults(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('screenshot-results', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('results', { keyPath: 'id' }).createIndex('createdAt', 'createdAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveResult(result: CaptureResult): Promise<void> {
  const database = await openResults();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('results', 'readwrite');
      const results = transaction.objectStore('results');
      results.put(result);
      const expired = results.index('createdAt').openCursor(IDBKeyRange.upperBound(Date.now() - 86_400_000));
      expired.onsuccess = () => {
        const cursor = expired.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function readResult(id: string): Promise<CaptureResult | undefined> {
  const database = await openResults();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction('results').objectStore('results').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}
