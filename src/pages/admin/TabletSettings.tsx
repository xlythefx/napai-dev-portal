import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Wrench, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { tabletSettingsGet, tabletSettingsUpdate, type TabletSettings } from "@/lib/tabletApi";

const TabletSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [settings, setSettings] = useState<TabletSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof TabletSettings | null>(null);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    tabletSettingsGet(email)
      .then((r) => setSettings(r.settings))
      .catch((e: Error) => toast({ title: "Failed to load settings", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [email, toast]);

  const toggle = async (key: keyof TabletSettings, next: boolean) => {
    if (!settings) return;
    const prev = settings[key];
    setSettings({ ...settings, [key]: next });
    setSavingKey(key);
    try {
      const r = await tabletSettingsUpdate(email, { [key]: next });
      setSettings(r.settings);
      toast({ title: "Saved", description: `${key} is now ${next ? "ON" : "OFF"}` });
    } catch (err) {
      setSettings({ ...settings, [key]: prev });
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Runtime toggles for the QuanTab backend. Changes take effect immediately on the next API request.
        </p>
      </div>

      {settings.is_maintenance && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-300">Maintenance mode is ON</p>
            <p className="text-muted-foreground">
              New activations and trial signups are blocked with a 503. Heartbeats from already-licensed
              tablets continue to work so existing devices stay alive.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 inline-flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>License-key emailing</CardTitle>
              <CardDescription>
                When OFF, the bulk-email, provisioning-email and trial QR endpoints refuse to send. The
                admin UI still lets you generate keys — they just don't get emailed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <Label htmlFor="email_keys_enabled" className="flex flex-col gap-0.5 cursor-pointer">
              <span className="font-medium">Enable emailing of license keys</span>
              <span className="text-xs text-muted-foreground">
                bulk_email · provisioning_email · trial_email_qr
              </span>
            </Label>
            <div className="flex items-center gap-2">
              {savingKey === "email_keys_enabled" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Switch
                id="email_keys_enabled"
                checked={settings.email_keys_enabled}
                onCheckedChange={(v) => toggle("email_keys_enabled", v)}
                disabled={savingKey !== null}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 inline-flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <CardTitle>Maintenance mode</CardTitle>
              <CardDescription>
                When ON, customer-facing endpoints return 503. New activations and trial signups are
                blocked. Existing tablets continue to heartbeat normally.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <Label htmlFor="is_maintenance" className="flex flex-col gap-0.5 cursor-pointer">
              <span className="font-medium">Maintenance mode</span>
              <span className="text-xs text-muted-foreground">
                activate · request_trial · trial_email_qr
              </span>
            </Label>
            <div className="flex items-center gap-2">
              {savingKey === "is_maintenance" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Switch
                id="is_maintenance"
                checked={settings.is_maintenance}
                onCheckedChange={(v) => toggle("is_maintenance", v)}
                disabled={savingKey !== null}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TabletSettingsPage;
