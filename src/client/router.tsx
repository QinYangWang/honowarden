import { createHashRouter, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VaultPage } from "./pages/vault/VaultPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { SendPage } from "./pages/send/SendPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { GeneratorPage } from "./pages/tools/GeneratorPage";
import { AuthLayout } from "./layouts/AuthLayout";
import { VaultLayout } from "./layouts/VaultLayout";
import { AdminLayout } from "./layouts/AdminLayout";

export const router = createHashRouter([
  {
    path: "/login",
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: "/register",
    element: <AuthLayout />,
    children: [{ index: true, element: <RegisterPage /> }],
  },
  {
    path: "/",
    element: <VaultLayout />,
    children: [
      { index: true, element: <VaultPage /> },
      { path: "vault", element: <VaultPage /> },
      { path: "send", element: <SendPage /> },
      { path: "generator", element: <GeneratorPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/admin",
    children: [
      { path: "login", element: <AdminLoginPage /> },
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "users", element: <AdminUsers /> },
          { path: "settings", element: <AdminSettings /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
