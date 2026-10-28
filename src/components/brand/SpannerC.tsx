/**
 * The Clamour brandmark: a spanner head on its side, its jaw opening right to
 * form the C, the 120° throat making a house in the negative space.
 * Master artwork: the Logos group in the Clamour design system.
 */
export const SPANNER_C_PATH =
  "M88.2 28.2 A44 44 0 1 0 88.2 71.8 L53.9 71.8 L41.1 50 L53.9 28.2 Z";

type SpannerCProps = {
  /** Width and height in pixels. Minimum 16. */
  size?: number;
  /** Any CSS colour; defaults to the signal yellow. */
  color?: string;
  /** Accessible name. Leave empty when a visible wordmark sits beside it. */
  title?: string;
  className?: string;
};

export function SpannerC({ size = 48, color = "var(--signal)", title, className }: SpannerCProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={SPANNER_C_PATH} fill={color} />
    </svg>
  );
}
