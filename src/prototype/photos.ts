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

/** Fingerprint any file without keeping it (videos and chat exports in the prototype). */
export async function fingerprintFile(file: File): Promise<{ name: string; sha256: string; bytes: number }> {
  return { name: file.name, sha256: await sha256(await file.arrayBuffer()), bytes: file.size };
}

/**
 * Read a WhatsApp "Export chat" text file. Handles the iPhone format
 * "[28/10/2026, 14:03:12] Name: message" and the Android format "28/10/2026, 14:03 - Name: message".
 */
export function parseChatExport(text: string) {
  const line =
    /^\u200e?\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),? (\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]?(?: -)? ([^:]{1,60}): (.*)$/;
  const messages: { date: string; time: string; who: string; text: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.replace(/\u202f/g, " ").match(line);
    if (m) messages.push({ date: m[1], time: m[2], who: m[3].replace(/\u200e/g, "").trim(), text: m[4] });
    else if (messages.length && raw.trim()) messages[messages.length - 1].text += ` ${raw.trim()}`;
  }
  if (!messages.length) return null;
  const first = messages[0];
  const last = messages[messages.length - 1];
  const fmt = (m: (typeof messages)[number]) => `${m.date} ${m.time} · ${m.who}: ${m.text.slice(0, 140)}`;
  return {
    count: messages.length,
    participants: [...new Set(messages.map((m) => m.who))].slice(0, 12),
    first: `${first.date} ${first.time}`,
    last: `${last.date} ${last.time}`,
    preview: [...messages.slice(0, 3), ...(messages.length > 6 ? messages.slice(-3) : messages.slice(3))].map(fmt),
  };
}

export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
