import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "../view/AboutPage";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});
