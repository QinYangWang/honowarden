import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";

export function AdminSettings() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/admin/config", { credentials: "include" })
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        credentials: "include",
      });
      const updated = await res.json();
      setConfig(updated);
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const boolKeys = Object.entries(config).filter(([, v]) => typeof v === "boolean");
  const numberKeys = Object.entries(config).filter(([, v]) => typeof v === "number");
  const stringKeys = Object.entries(config).filter(([, v]) => typeof v === "string");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Toggle Settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {boolKeys.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">{key.replace(/_/g, " ")}</Label>
              <Button
                variant={value ? "default" : "outline"}
                size="sm"
                onClick={() => updateField(key, !value)}
              >
                {value ? "ON" : "OFF"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Number Settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {numberKeys.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm">{key.replace(/_/g, " ")}</Label>
              <Input
                type="number"
                value={value as number}
                onChange={(e) => updateField(key, parseInt(e.target.value, 10) || 0)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Text Settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {stringKeys.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm">{key.replace(/_/g, " ")}</Label>
              <Input value={value as string} onChange={(e) => updateField(key, e.target.value)} />
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
