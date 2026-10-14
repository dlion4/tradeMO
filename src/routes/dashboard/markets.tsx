import { createFileRoute as routeFactory } from "@tanstack/react-router";
import MarketsPage from "../../components/dashboard/MarketsPage";

function MarketsRoute() {
  const { q } = Route.useSearch();
  return <MarketsPage q={q} />;
}

export const Route = routeFactory("/dashboard/markets")({
  component: MarketsRoute,
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  }),
});
