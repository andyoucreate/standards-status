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
    badge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    banner: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  },
  yellow: {
    dot: "bg-yellow-500",
    bar: "bg-yellow-400",
    badge: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200",
    banner: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100",
  },
  orange: {
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
    banner: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
  },
  red: {
    dot: "bg-red-500",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
    banner: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  },
  blue: {
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
    banner: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  },
  gray: {
    dot: "bg-neutral-400",
    bar: "bg-neutral-200 dark:bg-neutral-800",
    badge: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
    banner: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100",
  },
};

/** The only place a Tone becomes a color class. */
export function toneClasses(tone: Tone): ToneClasses {
  return CLASSES[tone];
}
