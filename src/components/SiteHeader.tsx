import type { StatusConfig } from "../../status.config";

export function SiteHeader({ config }: { config: StatusConfig }) {
  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-3">
        {config.logoUrl ? <img src={config.logoUrl} alt="" className="h-7 w-7" /> : null}
        <h1 className="text-lg font-semibold tracking-tight">{config.name}</h1>
      </div>
      <a
        href={config.productUrl}
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        {new URL(config.productUrl).host} ↗
      </a>
    </header>
  );
}
