import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function GeneratorPage() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [special, setSpecial] = useState(true);

  const generate = useCallback(() => {
    let chars = "";
    if (uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) chars += "abcdefghijklmnopqrstuvwxyz";
    if (numbers) chars += "0123456789";
    if (special) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (!chars) chars = "abcdefghijklmnopqrstuvwxyz";

    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    const result = Array.from(arr, (v) => chars[v % chars.length]).join("");
    setPassword(result);
  }, [length, uppercase, lowercase, numbers, special]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Password Generator</h1>
      <Card>
        <CardHeader>
          <CardTitle>Generated Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={password} readOnly className="font-mono" />
            <Button onClick={() => navigator.clipboard.writeText(password)} variant="outline">Copy</Button>
          </div>
          <Button onClick={generate} className="w-full">Generate</Button>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Length: {length}</Label>
              <input type="range" min={8} max={128} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />A-Z
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} />a-z
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} />0-9
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />!@#$%
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
