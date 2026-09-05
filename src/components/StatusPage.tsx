import type { StatusConfig } from "../../status.config";
import type { StatusView } from "../status/derive";
import { AvailabilityNotice } from "./AvailabilityNotice";
import { IncidentCard } from "./IncidentCard";
import { PastIncidents } from "./PastIncidents";
import { ServiceRow } from "./ServiceRow";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { StatusBanner } from "./StatusBanner";

export function StatusPage({
  view,
  config,
  now,
}: {
  view: StatusView;
  config: StatusConfig;
  now: Date;
}) {
  const unavailable = view.availability === "unavailable";
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8">
      <SiteHeader config={config} />
      <AvailabilityNotice view={view} />
      {unavailable ? null : (
        <>
          <StatusBanner banner={view.banner} />
          {view.activeIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} now={now} />
          ))}
          {view.services.length > 0 ? (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {view.services.map((service) => (
                <ServiceRow key={service.id} service={service} />
              ))}
            </ul>
          ) : null}
          <PastIncidents days={view.pastIncidents} />
        </>
      )}
      <SiteFooter config={config} fetchedAt={view.fetchedAt} now={now} />
    </main>
  );
}
