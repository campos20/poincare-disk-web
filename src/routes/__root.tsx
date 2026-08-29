import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "../view/AppShell";

export const Route = createRootRoute({
  component: AppShell,
});
