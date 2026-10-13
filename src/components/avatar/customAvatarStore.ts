"use client";

// Keeps selfie avatars (GLB files exported by Avaturn) in this browser's IndexedDB,
// since they are several megabytes — far too big for localStorage.

import { useEffect, useState } from "react";

const DB = "dubai-avatars";
const STORE = "glb";
export const IDB_PREFIX = "idb:";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAvatarBlob(id: string, blob: Blob) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadAvatarBlob(id: string): Promise<Blob | null> {
  const db = await open();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

/** Turns a stored avatar reference into something the GLTF loader can fetch. */
export function useAvatarUrl(url: string | undefined): string | null {
  const [resolved, setResolved] = useState<{ key: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!url || !url.startsWith(IDB_PREFIX)) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    loadAvatarBlob(url.slice(IDB_PREFIX.length))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = blob ? URL.createObjectURL(blob) : null;
        setResolved({ key: url, url: objectUrl });
      })
      .catch(() => !cancelled && setResolved({ key: url, url: null }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  if (!url) return null;
  if (!url.startsWith(IDB_PREFIX)) return url;
  return resolved?.key === url ? resolved.url : null;
}
