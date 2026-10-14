import { createFileRoute as routeFactory } from "@tanstack/react-router";
import TradePage from "../../components/dashboard/TradePage";

export const Route = routeFactory("/dashboard/trade")({ component: TradePage });
