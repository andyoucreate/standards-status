import type { PastIncidentDayView } from "../status/derive";

export function PastIncidents({ days }: { days: PastIncidentDayView[] }) {
  if (days.length === 0) return null;
  return (
    <details className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <summary className="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Past incidents · 14 days
      </summary>
      <ul className="divide-y divide-neutral-100 px-5 dark:divide-neutral-800">
        {days.map((day) => (
          <li key={day.day} className="py-3">
            <p className="text-xs text-neutral-500">{day.day}</p>
            <ul className="mt-1 space-y-1">
              {day.incidents.map((incident) => (
                <li key={incident.id} className="flex justify-between text-sm">
                  <span>{incident.title}</span>
                  <span className="text-neutral-500">{incident.durationMinutes} min</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
