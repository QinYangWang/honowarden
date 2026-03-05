import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { deriveKey, hashPassword, makeEncKey } from "../../lib/crypto";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 12) {
      setError("Master password must be at least 12 characters");
      setLoading(false);
      return;
    }

    try {
      const masterKey = await deriveKey(password, email, 0, 600000);
      const masterPasswordHash = await hashPassword(masterKey, password);
      const keys = await makeEncKey(masterKey);

      const res = await fetch("/identity/accounts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || email.split("@")[0],
          masterPasswordHash,
          masterPasswordHint: hint || null,
          key: keys.encKey,
          kdf: 0,
          kdfIterations: 600000,
          keys: {
            publicKey: keys.publicKey,
            encryptedPrivateKey: keys.encPrivateKey,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error_description || "Registration failed");
      }

      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Set up your HonoWarden vault</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Master Password (min 12 chars)</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Master Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hint">Master Password Hint (optional)</Label>
            <Input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Log In</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
