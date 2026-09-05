import { StandardsMark } from "./StandardsMark";

export function RunningWithStandardsBadge() {
  return (
    <a
      href="https://standards.new"
      className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-1.5 text-xs text-paper dark:bg-paper dark:text-ink"
    >
      <StandardsMark className="h-3.5 w-3.5" />
      <span className="sr-only">Running with Standards</span>
      <span aria-hidden>
        Running with{" "}
        <span className="font-display text-sm font-bold lowercase tracking-tight">standards</span>
      </span>
    </a>
  );
}
