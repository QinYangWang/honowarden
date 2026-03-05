import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">HonoWarden</h1>
        <p className="mt-2 text-muted-foreground">Self-hosted password manager</p>
      </div>
      <Outlet />
    </div>
  );
}
