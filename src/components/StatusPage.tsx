import type { StatusConfig } from "../../status.config";
import type { StatusView } from "../status/derive";
import { AvailabilityNotice } from "./AvailabilityNotice";
import { DIVIDE, SURFACE } from "./classes";
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
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-6">
      <SiteHeader config={config} />
      <AvailabilityNotice view={view} />
      {unavailable ? null : (
        <>
          <StatusBanner banner={view.banner} />
          {view.activeIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} now={now} />
          ))}
          {view.services.length > 0 ? (
            <ul className={`${SURFACE} ${DIVIDE} px-6`}>
              {view.services.map((service) => (
                <ServiceRow key={service.id} service={service} />
              ))}
            </ul>
          ) : null}
          <PastIncidents days={view.pastIncidents} />
        </>
      )}
      <SiteFooter config={config} fetchedAt={view.fetchedAt} />
    </main>
  );
}
