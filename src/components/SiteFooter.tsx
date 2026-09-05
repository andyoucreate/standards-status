import type { StatusConfig } from "../../status.config";
import { formatUtc } from "../lib/dates";
import { MUTED } from "./classes";
import { RunningWithStandardsBadge } from "./RunningWithStandardsBadge";

export function SiteFooter({ config, fetchedAt }: { config: StatusConfig; fetchedAt: string }) {
  return (
    <footer
      className={`mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 py-6 text-xs dark:border-paper/10 ${MUTED}`}
    >
      <span className="tabular-nums">
        Updated {formatUtc(fetchedAt)} · checks every 5 min ·{" "}
        <a
          href={config.repositoryUrl}
          className="underline-offset-2 hover:text-ink hover:underline dark:hover:text-paper"
        >
          Source
        </a>
      </span>
      <RunningWithStandardsBadge />
    </footer>
  );
}
