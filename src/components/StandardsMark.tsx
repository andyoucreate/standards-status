import { LOGO_MARK_PATH, LOGO_MARK_STROKE_WIDTH, LOGO_MARK_VIEWBOX } from "../brand/mark";

/** The hand-drawn Standards star, in `currentColor`. Size it with `className`. */
export function StandardsMark({ className }: { className: string }) {
  return (
    <svg
      viewBox={LOGO_MARK_VIEWBOX}
      className={className}
      aria-hidden
      focusable="false"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={LOGO_MARK_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={LOGO_MARK_PATH} />
    </svg>
  );
}
