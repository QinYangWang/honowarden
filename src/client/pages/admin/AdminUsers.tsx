import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  enabled: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadUsers = () => {
    fetch("/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  };

  useEffect(() => { loadUsers(); }, []);

  async function toggleUser(id: string, enabled: boolean) {
    await fetch(`/admin/users/${id}/${enabled ? "disable" : "enable"}`, {
      method: "POST",
      credentials: "include",
    });
    loadUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user permanently?")) return;
    await fetch(`/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    loadUsers();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${u.enabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {u.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}</td>
                <td className="p-3 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toggleUser(u.id, u.enabled)}>
                    {u.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
