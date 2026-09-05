import type { PastIncidentDayView } from "../status/derive";
import { DIVIDE, MUTED, SURFACE } from "./classes";

export function PastIncidents({ days }: { days: PastIncidentDayView[] }) {
  if (days.length === 0) return null;
  return (
    <details className={SURFACE}>
      <summary
        className={`cursor-pointer px-6 py-4 text-xs font-semibold uppercase tracking-wide ${MUTED}`}
      >
        Past incidents · 14 days
      </summary>
      <ul className={`${DIVIDE} px-6`}>
        {days.map((day) => (
          <li key={day.day} className="py-4">
            <p className={`text-xs tabular-nums ${MUTED}`}>{day.day}</p>
            <ul className="mt-1 space-y-1">
              {day.incidents.map((incident) => (
                <li key={incident.id} className="flex justify-between gap-4 text-sm">
                  <span>{incident.title}</span>
                  <span className={`shrink-0 tabular-nums ${MUTED}`}>
                    {incident.durationMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
