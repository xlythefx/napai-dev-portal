import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { developersList, developersUpdate, developersSignup } from "@/lib/adminApi";
import type { Developer } from "@/lib/adminApi";
import { adminSetRate, adminListActiveSessions, type ActiveSession } from "@/lib/timeTrackerApi";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Loader2, Users, UserPlus, Pencil, Clock, Ban, Activity } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3 },
  }),
};

interface EditForm {
  name: string;
  email: string;
  password: string;
  role: string;
  hourly_rate: string;
  currency: string;
  time_tracking_enabled: boolean;
}

const AdminDevelopers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const requesterEmail = user?.email ?? "";

  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeByDev = new Map(activeSessions.map((a) => [a.developer_id, a]));

  // Add developer dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", name: "" });

  // Edit developer dialog
  const [editDev, setEditDev] = useState<Developer | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    password: "",
    role: "developer",
    hourly_rate: "0",
    currency: "PHP",
    time_tracking_enabled: true,
  });
  const [editSaving, setEditSaving] = useState(false);

  const fetchDevs = () => {
    setLoading(true);
    setError(null);
    developersList()
      .then(setDevelopers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDevs(); }, []);

  useEffect(() => {
    if (!requesterEmail) return;
    const fetchActive = () => {
      adminListActiveSessions({ requester_email: requesterEmail })
        .then(setActiveSessions)
        .catch(() => {});
    };
    fetchActive();
    const id = setInterval(fetchActive, 15_000);
    return () => clearInterval(id);
  }, [requesterEmail]);

  const openEdit = (dev: Developer) => {
    setEditDev(dev);
    setEditForm({
      name: dev.name ?? "",
      email: dev.email,
      password: "",
      role: dev.role,
      hourly_rate: String(dev.hourly_rate ?? 0),
      currency: dev.currency ?? "PHP",
      time_tracking_enabled: dev.time_tracking_enabled ?? true,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDev) return;

    if (editForm.password && editForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    const rate = Number(editForm.hourly_rate);
    if (Number.isNaN(rate) || rate < 0) {
      toast({ title: "Invalid hourly rate", variant: "destructive" });
      return;
    }

    setEditSaving(true);
    try {
      // Update profile fields (name, email, password, role)
      const profilePayload: Parameters<typeof developersUpdate>[0] = { id: editDev.id };
      if (editForm.name !== (editDev.name ?? "")) profilePayload.name = editForm.name;
      if (editForm.email !== editDev.email) profilePayload.email = editForm.email;
      if (editForm.password) profilePayload.password = editForm.password;
      if (editForm.role !== editDev.role) profilePayload.role = editForm.role;
      if (editForm.time_tracking_enabled !== (editDev.time_tracking_enabled ?? true)) {
        profilePayload.time_tracking_enabled = editForm.time_tracking_enabled;
      }

      const hasProfileChange = Object.keys(profilePayload).length > 1;
      const hasRateChange =
        rate !== (editDev.hourly_rate ?? 0) || editForm.currency !== (editDev.currency ?? "PHP");

      if (!hasProfileChange && !hasRateChange) {
        toast({ title: "No changes to save" });
        setEditDev(null);
        return;
      }

      const tasks: Promise<unknown>[] = [];
      if (hasProfileChange) tasks.push(developersUpdate(profilePayload));
      if (hasRateChange)
        tasks.push(
          adminSetRate({
            requester_email: requesterEmail,
            developer_id: editDev.id,
            hourly_rate: rate,
            currency: editForm.currency,
          })
        );

      await Promise.all(tasks);

      setDevelopers((prev) =>
        prev.map((d) =>
          d.id === editDev.id
            ? {
                ...d,
                name: editForm.name || null,
                email: editForm.email,
                role: editForm.role,
                hourly_rate: rate,
                currency: editForm.currency,
                time_tracking_enabled: editForm.time_tracking_enabled,
              }
            : d
        )
      );
      toast({ title: "Developer updated" });
      setEditDev(null);
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim() || !addForm.password.trim()) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    if (addForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setAddLoading(true);
    try {
      await developersSignup({
        email: addForm.email.trim(),
        password: addForm.password,
        name: addForm.name.trim() || undefined,
      });
      setAddForm({ email: "", password: "", name: "" });
      setAddOpen(false);
      fetchDevs();
      toast({ title: "Developer added" });
    } catch (e) {
      toast({
        title: "Add failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2">Developers</h1>
        <div className="text-destructive py-8 p-4 rounded-lg bg-destructive/10">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-1">Ensure the API is running and migrations are applied.</p>
          <Button variant="outline" className="mt-4" onClick={fetchDevs}>Retry</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="flex items-start justify-between mb-8">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold mb-2">Developers</h1>
          <p className="text-muted-foreground">
            Manage developer accounts, roles, and hourly rates
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-5 h-5 mr-2" />
                Add Developer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Developer</DialogTitle>
                <DialogDescription>
                  Create a new developer account. They can log in at /auth.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDeveloper} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="developer@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name (optional)</label>
                  <Input
                    placeholder="Full name"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addLoading}>
                    {addLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                    ) : (
                      "Add Developer"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {developers.length} Developer{developers.length !== 1 ? "s" : ""}
            </CardTitle>
            <CardDescription>
              Click the edit button to update name, email, password, role, or hourly rate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {developers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No developers yet.</p>
                <p className="text-sm mt-1">
                  Add one above or they can sign up at /developer-signup
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setAddOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Developer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {developers.map((dev, i) => {
                  const active = activeByDev.get(dev.id);
                  return (
                  <motion.div
                    key={dev.id}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="flex flex-wrap items-center gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{dev.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {dev.name || "—"} ·{" "}
                        <span className="capitalize">{dev.role}</span> · Joined{" "}
                        {formatDate(dev.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {dev.currency} {(dev.hourly_rate ?? 0).toFixed(2)}/hr
                    </div>

                    {active && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700"
                        title={
                          active.task
                            ? `Currently working on: ${active.task} (since ${new Date(active.started_at.replace(" ", "T")).toLocaleTimeString()})`
                            : `Currently working since ${new Date(active.started_at.replace(" ", "T")).toLocaleTimeString()}`
                        }
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Working now
                      </span>
                    )}

                    {dev.time_tracking_enabled === false ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700"
                        title="Time tracking is disabled for this developer"
                      >
                        <Ban className="w-3 h-3" /> Time Tracker - Off
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700"
                        title="Time tracking enabled"
                      >
                        <Clock className="w-3 h-3" /> Time Tracker - On
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(dev)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Developer Dialog */}
      <Dialog open={!!editDev} onOpenChange={(o) => !o && setEditDev(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Developer</DialogTitle>
            <DialogDescription>{editDev?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Full name"
                value={editForm.name}
                onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                New password{" "}
                <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>
              </label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={editForm.password}
                onChange={(e) => setEditForm((s) => ({ ...s, password: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((s) => ({ ...s, role: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium">Hourly rate</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.hourly_rate}
                  onChange={(e) => setEditForm((s) => ({ ...s, hourly_rate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="w-28">
                <label className="text-sm font-medium">Currency</label>
                <Select
                  value={editForm.currency}
                  onValueChange={(v) => setEditForm((s) => ({ ...s, currency: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHP">PHP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Time tracking enabled
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, the desktop app shows an orange "Start tracking" button and disables it.
                </p>
              </div>
              <Switch
                checked={editForm.time_tracking_enabled}
                onCheckedChange={(v) =>
                  setEditForm((s) => ({ ...s, time_tracking_enabled: v }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDev(null)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminDevelopers;
