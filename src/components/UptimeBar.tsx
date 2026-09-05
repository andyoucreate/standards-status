import type { DayView } from "../status/derive";
import { toneClasses } from "./tone-classes";

function title(day: DayView): string {
  if (day.failureRatio === null) return `${day.day} — no data`;
  return `${day.day} — ${(100 - day.failureRatio * 100).toFixed(2)}% uptime`;
}

export function UptimeBar({ days }: { days: DayView[] }) {
  return (
    <div
      className="flex h-6 flex-1 items-stretch gap-px"
      role="img"
      aria-label="Uptime over the last 90 days"
    >
      {days.map((day) => (
        <span
          key={day.day}
          title={title(day)}
          className={`flex-1 rounded-[1px] ${toneClasses(day.tone).bar}`}
        />
      ))}
    </div>
  );
}
