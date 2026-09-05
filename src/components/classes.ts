import type { Tone } from "../standards/options";

interface ToneClasses {
  dot: string;
  bar: string;
  badge: string;
  banner: string;
}

const CLASSES: Record<Tone, ToneClasses> = {
  green: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    banner: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  },
  yellow: {
    dot: "bg-yellow-500",
    bar: "bg-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300",
    banner: "bg-yellow-500/10 text-yellow-900 dark:text-yellow-200",
  },
  orange: {
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    badge: "bg-orange-500/10 text-orange-800 dark:text-orange-300",
    banner: "bg-orange-500/10 text-orange-900 dark:text-orange-200",
  },
  red: {
    dot: "bg-red-500",
    bar: "bg-red-500",
    badge: "bg-red-500/10 text-red-800 dark:text-red-300",
    banner: "bg-red-500/10 text-red-900 dark:text-red-200",
  },
  blue: {
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-800 dark:text-blue-300",
    banner: "bg-blue-500/10 text-blue-900 dark:text-blue-200",
  },
  gray: {
    dot: "bg-ink/30 dark:bg-paper/30",
    bar: "bg-ink/10 dark:bg-paper/10",
    badge: "bg-ink/5 text-ink/70 dark:bg-paper/5 dark:text-paper/70",
    banner: "bg-ink/5 text-ink/80 dark:bg-paper/5 dark:text-paper/80",
  },
};

/** The only place a Tone becomes a color class. */
export function toneClasses(tone: Tone): ToneClasses {
  return CLASSES[tone];
}

/** The one card surface: flat, bordered, no shadow. */
export const SURFACE =
  "rounded-lg border border-ink/10 bg-white dark:border-paper/10 dark:bg-white/[0.04]";

/** Secondary copy. */
export const MUTED = "text-ink/60 dark:text-paper/60";

/** Hairline between stacked rows. */
export const DIVIDE = "divide-y divide-ink/8 dark:divide-paper/8";
