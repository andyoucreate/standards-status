import type { BannerView } from "../status/derive";
import { toneClasses } from "./tone-classes";

export function StatusBanner({ banner }: { banner: BannerView }) {
  const classes = toneClasses(banner.tone);
  return (
    <div className={`flex items-center gap-3 rounded-lg px-5 py-4 font-medium ${classes.banner}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${classes.dot}`} aria-hidden />
      <span>{banner.message}</span>
    </div>
  );
}
