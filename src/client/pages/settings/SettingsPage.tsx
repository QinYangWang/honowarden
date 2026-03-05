import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";

interface Profile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  premium: boolean;
  avatarColor: string | null;
}

export function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    apiFetch<Profile>("/api/accounts/profile").then((p) => {
      setProfile(p);
      setName(p.name);
    });
  }, []);

  async function updateProfile() {
    setSaving(true);
    try {
      const updated = await apiFetch<Profile>("/api/accounts/profile", {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={updateProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button variant="destructive" onClick={logout}>Log Out All Sessions</Button>
        </CardContent>
      </Card>
    </div>
  );
}
