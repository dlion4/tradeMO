import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { ScriptDetailPage } from "../../../components/dashboard/ScriptEditorPage";

function ScriptEditorRoute() {
  const { id } = Route.useParams();
  return <ScriptDetailPage scriptId={id} />;
}

export const Route = routeFactory("/dashboard/scripts/$id")({
  component: ScriptEditorRoute,
});
