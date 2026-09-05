import type { ServiceRowView } from "../status/derive";
import { MUTED, toneClasses } from "./classes";
import { UptimeBar } from "./UptimeBar";

export function ServiceRow({ service }: { service: ServiceRowView }) {
  return (
    <li className="flex items-center gap-4 py-4">
      <span className="flex w-40 shrink-0 items-center gap-2 text-sm font-medium">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${toneClasses(service.tone).dot}`}
          aria-hidden
        />
        <span className="truncate">{service.name}</span>
      </span>
      <UptimeBar days={service.days} />
      <span className={`w-16 shrink-0 text-right text-xs tabular-nums ${MUTED}`}>
        {service.latencyMs === null ? "—" : `${service.latencyMs} ms`}
      </span>
      <span className="w-16 shrink-0 text-right text-sm tabular-nums">
        {service.uptimePercent === "—" ? "—" : `${service.uptimePercent}%`}
      </span>
    </li>
  );
}
