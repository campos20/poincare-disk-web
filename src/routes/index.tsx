import { createFileRoute } from "@tanstack/react-router";
import { ConstructionApp } from "../view/ConstructionApp";

export const Route = createFileRoute("/")({
  component: ConstructionApp,
});
