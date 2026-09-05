import type { BannerView } from "../status/derive";
import { toneClasses } from "./classes";

export function StatusBanner({ banner }: { banner: BannerView }) {
  const classes = toneClasses(banner.tone);
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${classes.banner}`}
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${classes.dot}`} aria-hidden />
      <span>{banner.message}</span>
    </div>
  );
}
