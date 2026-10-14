import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { ScriptsListPage } from "../../../components/dashboard/ScriptEditorPage";

export const Route = routeFactory("/dashboard/scripts/")({
  component: ScriptsListPage,
});
