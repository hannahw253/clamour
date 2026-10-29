import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clamour prototype",
  description: "You've been invited to try a repair group prototype.",
  robots: { index: false, follow: false },
};

/** The prototype has two layouts: the phone column, (phone), and the desktop dashboard, /prototype/desk. */
export default function PrototypeRoot({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
