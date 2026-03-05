import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface Send {
  id: string;
  name: string;
  type: number;
  disabled: boolean;
  accessCount: number;
  maxAccessCount: number | null;
  expirationDate: string | null;
  deletionDate: string;
}

export function SendPage() {
  const [sends, setSends] = useState<Send[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const loadSends = () => {
    apiFetch<{ data: Send[] }>("/api/sends")
      .then((r) => setSends(r.data))
      .catch(console.error);
  };

  useEffect(() => { loadSends(); }, []);

  async function deleteSend(id: string) {
    await apiFetch(`/api/sends/${id}`, { method: "DELETE" });
    loadSends();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Send</h1>
        <Button onClick={() => setShowAdd(true)}>+ New Send</Button>
      </div>
      {showAdd && <AddSendForm onClose={() => { setShowAdd(false); loadSends(); }} />}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sends.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Type: {s.type === 0 ? "Text" : "File"}
              </p>
              <p className="text-sm text-muted-foreground">
                Accessed: {s.accessCount}{s.maxAccessCount ? ` / ${s.maxAccessCount}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Expires: {s.expirationDate ? new Date(s.expirationDate).toLocaleDateString() : "Never"}
              </p>
              <Button variant="destructive" size="sm" onClick={() => deleteSend(s.id)}>Delete</Button>
            </CardContent>
          </Card>
        ))}
        {sends.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted-foreground">No sends yet</p>
        )}
      </div>
    </div>
  );
}

function AddSendForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const deletionDate = new Date(Date.now() + 7 * 86400_000).toISOString();
      await apiFetch("/api/sends", {
        method: "POST",
        body: JSON.stringify({
          type: 0,
          name,
          text: { text, hidden: false },
          key: "placeholder-key",
          deletionDate,
        }),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>New Text Send</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Text</Label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-md border bg-background p-2"
              rows={4}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
