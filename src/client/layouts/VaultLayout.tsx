import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useVaultStore } from "../stores/vault.store";
import { useEffect } from "react";

const sidebarItems = [
  { to: "/vault", label: "All Items", icon: "🔐" },
  { to: "/send", label: "Send", icon: "📤" },
  { to: "/generator", label: "Generator", icon: "🔑" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function VaultLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 flex-col border-r bg-muted/30">
        <div className="border-b p-4">
          <h1 className="text-lg font-bold">HonoWarden</h1>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                location.pathname === item.to
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => { logout(); navigate("/login"); }}
          >
            Log Out
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b px-4 py-2">
          <Input
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
