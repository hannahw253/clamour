"use client";

import { isStorageFull, useStore } from "./store";
import { label } from "./ui";

/** A strip on every prototype screen, so nobody mistakes it for the real app. */
export function PrototypeBar() {
  const s = useStore();
  return (
    <div className="flex flex-col gap-1 border-b-2 border-line bg-concrete px-4 py-2">
      <p className={label}>Prototype · saved on this device only</p>
      {s && isStorageFull() ? (
        <p className="text-[15px] leading-[22px] font-bold">
          This device&rsquo;s storage is full, so new photos will be lost when you close the page.
        </p>
      ) : null}
    </div>
  );
}
