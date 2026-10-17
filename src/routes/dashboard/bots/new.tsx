import { createFileRoute as routeFactory } from "@tanstack/react-router";
import BotCreatorPage from "../../../components/dashboard/BotCreatorPage";

export const Route = routeFactory("/dashboard/bots/new")({
  component: () => <BotCreatorPage />,
});
