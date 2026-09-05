import { formatRelative } from "../lib/dates";
import type { IncidentView } from "../status/derive";
import { Badge } from "./Badge";
import { MUTED, SURFACE } from "./classes";

export function IncidentCard({ incident, now }: { incident: IncidentView; now: Date }) {
  return (
    <article className={`${SURFACE} p-6`}>
      <h3 className="text-base font-semibold">{incident.title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge tone={incident.statusTone}>{incident.statusLabel}</Badge>
        <Badge tone={incident.impactTone}>{incident.impactLabel}</Badge>
        {incident.serviceNames.map((name) => (
          <Badge key={name} tone="gray">
            {name}
          </Badge>
        ))}
      </div>
      <ol className="mt-4 space-y-4 border-l border-ink/10 pl-4 dark:border-paper/10">
        {incident.updates.map((update) => (
          <li key={update.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              {update.statusLabel ? (
                <span className="font-semibold">{update.statusLabel}</span>
              ) : null}
              <time dateTime={update.postedAt} className={`text-xs tabular-nums ${MUTED}`}>
                {formatRelative(update.postedAt, now)}
              </time>
            </div>
            <div className="mt-1 space-y-1 text-ink/80 dark:text-paper/80">
              {update.paragraphs.map((paragraph) => (
                <p key={`${update.id}-${paragraph}`}>{paragraph}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
