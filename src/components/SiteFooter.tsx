import type { StatusConfig } from "../../status.config";
import { formatRelative } from "../lib/dates";
import { RunningWithStandardsBadge } from "./RunningWithStandardsBadge";

export function SiteFooter({
  config,
  fetchedAt,
  now,
}: {
  config: StatusConfig;
  fetchedAt: string;
  now: Date;
}) {
  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-6 text-xs text-neutral-500 dark:border-neutral-800">
      <span>
        Updated {formatRelative(fetchedAt, now)} · checks every 5 min ·{" "}
        <a href={config.repositoryUrl} className="underline-offset-2 hover:underline">
          Source
        </a>
      </span>
      <RunningWithStandardsBadge />
    </footer>
  );
}
