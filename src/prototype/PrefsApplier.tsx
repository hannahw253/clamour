"use client";

import { useEffect } from "react";
import { prefsOf, useStore } from "./store";

/** Applies the appearance settings (theme, larger text, reduced motion) to the whole page. */
export function PrefsApplier() {
  const s = useStore();
  const p = prefsOf(s);
  useEffect(() => {
    const root = document.documentElement;
    if (p.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = p.theme;
    if (p.largeText) root.dataset.text = "large";
    else delete root.dataset.text;
    if (p.reduceMotion) root.dataset.motion = "reduce";
    else delete root.dataset.motion;
    return () => {
      delete root.dataset.theme;
      delete root.dataset.text;
      delete root.dataset.motion;
    };
  }, [p.theme, p.largeText, p.reduceMotion]);
  return null;
}
