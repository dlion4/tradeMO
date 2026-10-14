import { createFileRoute as routeFactory } from "@tanstack/react-router";
import BotsPage from "../../../components/dashboard/BotsPage";

export const Route = routeFactory("/dashboard/bots/")({ component: BotsPage });
