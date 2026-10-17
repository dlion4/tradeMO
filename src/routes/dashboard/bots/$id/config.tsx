import { createFileRoute as routeFactory } from "@tanstack/react-router";
import BotCreatorPage from "../../../../components/dashboard/BotCreatorPage";

function BotConfigRoute() {
  const { id } = Route.useParams();
  return <BotCreatorPage botId={id} />;
}

export const Route = routeFactory("/dashboard/bots/$id/config")({
  component: BotConfigRoute,
});
