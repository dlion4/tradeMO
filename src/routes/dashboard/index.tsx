import { createFileRoute as routeFactory } from "@tanstack/react-router";
import DashboardPage from "../../components/dashboard/DashboardPage";

export const Route = routeFactory("/dashboard/")({ component: DashboardPage });
