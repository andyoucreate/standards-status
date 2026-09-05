import { formatRelative } from "../lib/dates";
import type { IncidentView } from "../status/derive";
import { toneClasses } from "./tone-classes";

export function IncidentCard({ incident, now }: { incident: IncidentView; now: Date }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-base font-semibold">{incident.title}</h3>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
        <span className={`rounded-full px-2 py-0.5 ${toneClasses(incident.statusTone).badge}`}>
          {incident.statusLabel}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${toneClasses(incident.impactTone).badge}`}>
          {incident.impactLabel}
        </span>
        {incident.serviceNames.map((name) => (
          <span key={name} className={`rounded-full px-2 py-0.5 ${toneClasses("gray").badge}`}>
            {name}
          </span>
        ))}
      </div>
      <ol className="mt-4 space-y-3 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
        {incident.updates.map((update) => (
          <li key={update.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              {update.statusLabel ? (
                <span className="font-semibold">{update.statusLabel}</span>
              ) : null}
              <time dateTime={update.postedAt} className="text-xs text-neutral-500">
                {formatRelative(update.postedAt, now)}
              </time>
            </div>
            <div className="mt-1 space-y-1 text-neutral-700 dark:text-neutral-300">
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
