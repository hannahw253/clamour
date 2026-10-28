"use client";

import { useId, useState } from "react";
import { preparePhoto, shortHash } from "./photos";
import type { Photo } from "./types";
import { Icon, buttonClass, inputClass } from "./ui";

/** Camera first, with the gallery alongside, because many photos already exist (document 8). */
export function PhotoPicker({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await Promise.all(Array.from(files).map(preparePhoto));
      onChange([...photos, ...prepared]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo couldn't be added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label htmlFor={`${id}-camera`} className={buttonClass("secondary", "cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus")}>
          <Icon name="camera" />
          Take photo
          <input
            id={`${id}-camera`}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label htmlFor={`${id}-gallery`} className={buttonClass("secondary", "cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus")}>
          <Icon name="image" />
          From gallery
          <input
            id={`${id}-gallery`}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {busy ? <p className="text-[15px] text-ink-muted">Adding photo…</p> : null}
      {error ? <p className="text-[15px] font-bold text-alarm">{error}</p> : null}
      {photos.length ? (
        <ul className="flex flex-col gap-3">
          {photos.map((p, i) => (
            <li key={p.sha256 + i} className="flex gap-3 rounded-lg bg-concrete p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, not an optimisable asset */}
              <img src={p.src} alt="" className="size-20 flex-none rounded-md object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label className="sr-only" htmlFor={`${id}-alt-${i}`}>
                  Describe photo {i + 1}
                </label>
                <input
                  id={`${id}-alt-${i}`}
                  className={`${inputClass} min-h-11 text-[15px]`}
                  placeholder="What it shows (optional)"
                  value={p.alt}
                  onChange={(e) => onChange(photos.map((q, j) => (j === i ? { ...q, alt: e.target.value } : q)))}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[13px] leading-[18px] text-ink-muted">
                    SHA-256 {shortHash(p.sha256)}
                  </span>
                  <button
                    type="button"
                    className={buttonClass("ghost", "min-h-11 text-[15px]")}
                    onClick={() => onChange(photos.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
