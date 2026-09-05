import type { ServiceRowView } from "../status/derive";
import { toneClasses } from "./tone-classes";
import { UptimeBar } from "./UptimeBar";

export function ServiceRow({ service }: { service: ServiceRowView }) {
  return (
    <li className="flex items-center gap-4 py-3">
      <span className="flex w-40 shrink-0 items-center gap-2 font-medium">
        <span
          className={`inline-block h-2 w-2 rounded-full ${toneClasses(service.tone).dot}`}
          aria-hidden
        />
        <span className="truncate">{service.name}</span>
      </span>
      <UptimeBar days={service.days} />
      <span className="w-16 shrink-0 text-right text-xs text-neutral-500">
        {service.latencyMs === null ? "—" : `${service.latencyMs} ms`}
      </span>
      <span className="w-16 shrink-0 text-right text-sm tabular-nums">
        {service.uptimePercent === "—" ? "—" : `${service.uptimePercent}%`}
      </span>
    </li>
  );
}
