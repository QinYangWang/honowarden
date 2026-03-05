import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface Diagnostics {
  userCount: number;
  orgCount: number;
  version: string;
  serverTime: string;
}

export function AdminDashboard() {
  const [data, setData] = useState<Diagnostics | null>(null);

  useEffect(() => {
    fetch("/admin/diagnostics", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data?.userCount ?? "..."}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Organizations</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data?.orgCount ?? "..."}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Version</CardTitle></CardHeader>
          <CardContent><p className="text-xl">{data?.version ?? "..."}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
