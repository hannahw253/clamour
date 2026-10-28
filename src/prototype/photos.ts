import type { Photo } from "./types";

/** Hex SHA-256 of the original file, so the record can show it hasn't changed since. */
async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This file couldn't be opened as a photo."));
    img.src = url;
  });
}

/**
 * Fingerprint the original, then make a small display copy (longest side 1200px).
 * The full app uploads the original in the background; the prototype keeps only the copy.
 */
export async function preparePhoto(file: File): Promise<Photo> {
  const buffer = await file.arrayBuffer();
  const hash = await sha256(buffer);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { src: canvas.toDataURL("image/jpeg", 0.78), sha256: hash, alt: "", bytes: file.size };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function shortHash(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-8)}`;
}
