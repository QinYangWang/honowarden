import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useVaultStore, type CipherItem } from "../../stores/vault.store";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../../components/ui/dialog";

const typeIcons: Record<number, string> = {
  1: "🔑",
  2: "📝",
  3: "💳",
  4: "🪪",
};

const typeLabels: Record<number, string> = {
  1: "Login",
  2: "Secure Note",
  3: "Card",
  4: "Identity",
};

export function VaultPage() {
  const queryClient = useQueryClient();
  const { ciphers, setCiphers, selectedCipherId, selectCipher, searchQuery } = useVaultStore();
  const [showAdd, setShowAdd] = useState(false);

  const { data: syncData } = useQuery({
    queryKey: ["sync"],
    queryFn: () => apiFetch<{ ciphers: CipherItem[]; folders: { id: string; name: string }[] }>("/api/sync"),
  });

  useEffect(() => {
    if (syncData?.ciphers) {
      setCiphers(syncData.ciphers);
    }
  }, [syncData, setCiphers]);

  const filtered = ciphers.filter(
    (c) =>
      !c.deletedDate &&
      (searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const selected = ciphers.find((c) => c.id === selectedCipherId);

  return (
    <div className="flex h-full gap-4">
      <div className="w-80 space-y-2 overflow-auto border-r pr-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Vault ({filtered.length})
          </h2>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger>
              <Button size="sm">+ Add</Button>
            </DialogTrigger>
            <DialogContent>
              <AddCipherForm
                onClose={() => {
                  setShowAdd(false);
                  queryClient.invalidateQueries({ queryKey: ["sync"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        {filtered.map((cipher) => (
          <button
            key={cipher.id}
            onClick={() => selectCipher(cipher.id)}
            className={`w-full rounded-md border p-3 text-left transition-colors ${
              selectedCipherId === cipher.id ? "border-primary bg-primary/5" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{typeIcons[cipher.type] || "📄"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{cipher.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {cipher.login?.username || typeLabels[cipher.type] || "Item"}
                </p>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? "No items match your search" : "Your vault is empty"}
          </p>
        )}
      </div>

      <div className="flex-1">
        {selected ? (
          <CipherDetail cipher={selected} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select an item to view details
          </div>
        )}
      </div>
    </div>
  );
}

function CipherDetail({ cipher }: { cipher: CipherItem }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{typeIcons[cipher.type] || "📄"}</span>
          {cipher.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cipher.type === 1 && cipher.login && (
          <>
            {cipher.login.username && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Username</Label>
                <div className="flex items-center gap-2">
                  <p className="flex-1 rounded bg-muted p-2 font-mono text-sm">{cipher.login.username}</p>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(cipher.login!.username || "")}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
            {cipher.login.password && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="flex items-center gap-2">
                  <p className="flex-1 rounded bg-muted p-2 font-mono text-sm">
                    {showPassword ? cipher.login.password : "••••••••"}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(cipher.login!.password || "")}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
            {cipher.login.uris?.map((uri, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs text-muted-foreground">URI {i + 1}</Label>
                <p className="rounded bg-muted p-2 text-sm">{uri.uri}</p>
              </div>
            ))}
          </>
        )}
        {cipher.notes && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <p className="whitespace-pre-wrap rounded bg-muted p-2 text-sm">{cipher.notes}</p>
          </div>
        )}
        {cipher.revisionDate && (
          <p className="text-xs text-muted-foreground">
            Updated: {new Date(cipher.revisionDate).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AddCipherForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uri, setUri] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/ciphers", {
        method: "POST",
        body: JSON.stringify({
          type: 1,
          name,
          login: {
            username,
            password,
            uris: uri ? [{ uri, match: null }] : [],
          },
        }),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add Login</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URI</Label>
          <Input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
