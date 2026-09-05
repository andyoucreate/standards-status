import type { StatusConfig } from "../../status.config";
import { MUTED } from "./classes";
import { StandardsMark } from "./StandardsMark";

export function SiteHeader({ config }: { config: StatusConfig }) {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <div className="flex items-center gap-3">
        {config.logoUrl ? (
          <img src={config.logoUrl} alt="" className="h-6 w-6" />
        ) : (
          <StandardsMark className="h-6 w-6" />
        )}
        <h1 className="font-display text-2xl font-bold leading-none tracking-tight">
          {config.name}
        </h1>
      </div>
      <a
        href={config.productUrl}
        className={`text-sm hover:text-ink dark:hover:text-paper ${MUTED}`}
      >
        {new URL(config.productUrl).host} ↗
      </a>
    </header>
  );
}
