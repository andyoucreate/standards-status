import { StatusPage } from "@/components/StatusPage";
import { loadStatusView } from "@/status/load-status";
import { statusConfig } from "../../status.config";

/**
 * `now` is the snapshot's own `fetchedAt`: relative times are computed against
 * the moment the cache entry was built, so the page stays fully static and
 * consistent with the "Updated …" footer.
 */
export default async function Page() {
  const view = await loadStatusView();
  return <StatusPage view={view} config={statusConfig} now={new Date(view.fetchedAt)} />;
}
