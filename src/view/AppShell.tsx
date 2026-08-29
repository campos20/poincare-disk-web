import { Outlet } from "@tanstack/react-router";
import "./construction.css";

export function AppShell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}
