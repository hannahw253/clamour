import { SpannerC } from "./SpannerC";

type LockupProps = {
  /** Wordmark cap size in pixels; the mark matches it. */
  size?: number;
  /** Show "for habitable homes" under the wordmark. Drop it below 160px wide. */
  tagline?: boolean;
  /** Ground the lockup sits on, which sets the inks (see the brand kit's colourways). */
  ground?: "ink" | "signal" | "paper";
};

const INKS = {
  ink: { mark: "var(--signal)", word: "var(--signal)", tag: "var(--brand-paper)" },
  signal: { mark: "var(--brand-ink)", word: "var(--brand-ink)", tag: "var(--brand-ink)" },
  paper: { mark: "var(--ink)", word: "var(--ink)", tag: "var(--ink)" },
} as const;

/** Horizontal lockup: the spanner C, centred on the wordmark's cap height, then CLAMOUR. */
export function Lockup({ size = 64, tagline = true, ground = "ink" }: LockupProps) {
  const inks = INKS[ground];
  return (
    <div className="inline-flex items-center" style={{ gap: size * 0.16 }}>
      <SpannerC size={size} color={inks.mark} />
      <div className="relative flex">
        <span
          className="font-display uppercase"
          style={{
            fontSize: size,
            lineHeight: 1,
            letterSpacing: "0.01em",
            color: inks.word,
            textBoxTrim: "trim-both",
            textBoxEdge: "cap alphabetic",
          }}
        >
          Clamour
        </span>
        {tagline ? (
          <span
            className="absolute left-0 whitespace-nowrap font-semibold"
            style={{ top: `calc(100% + ${size * 0.14}px)`, fontSize: Math.max(13, size * 0.17), color: inks.tag }}
          >
            for habitable homes
          </span>
        ) : null}
      </div>
    </div>
  );
}
