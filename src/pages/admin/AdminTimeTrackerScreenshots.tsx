import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { developersList, type Developer } from "@/lib/adminApi";
import {
  adminListScreenshots,
  screenshotImageUrl,
  type TimeScreenshot,
} from "@/lib/timeTrackerApi";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";

type RangePreset = "today" | "week" | "month" | "custom";

// Use local date parts (not UTC) so "today" matches the browser's timezone.
const localDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const computeRange = (preset: RangePreset): { from: string; to: string } => {
  const today = new Date();
  const to = localDateStr(today);
  if (preset === "today") return { from: to, to };
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: localDateStr(start), to };
  }
  if (preset === "month") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: localDateStr(start), to };
  }
  return { from: "", to: "" };
};

// DB timestamps have no TZ suffix — append a space so browsers parse as local.
const parseLocalDT = (s: string) => new Date(s.includes("T") ? s : s.replace(" ", "T"));

const groupByDayHour = (screenshots: TimeScreenshot[]) => {
  const byDay: Record<string, Record<string, TimeScreenshot[]>> = {};
  for (const s of screenshots) {
    const d = parseLocalDT(s.taken_at);
    const dayKey = localDateStr(d);
    const hourKey = `${String(d.getHours()).padStart(2, "0")}:00`;
    if (!byDay[dayKey]) byDay[dayKey] = {};
    if (!byDay[dayKey][hourKey]) byDay[dayKey][hourKey] = [];
    byDay[dayKey][hourKey].push(s);
  }
  return byDay;
};

// Activity level bar (0–100). Color: green ≥ 60, amber 30–59, red < 30.
const ActivityBar = ({ level }: { level: number | null }) => {
  if (level === null) return null;
  const pct = Math.min(100, Math.max(0, level));
  const color =
    pct >= 60 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="mt-1.5" title={`Activity: ${pct}%`}>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const AdminTimeTrackerScreenshots = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const requesterEmail = user?.email ?? "";

  const initialDev = searchParams.get("developer_id") ?? "all";
  const initialDate = searchParams.get("date");

  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [filterDev, setFilterDev] = useState<string>(initialDev);
  const [preset, setPreset] = useState<RangePreset>(
    initialDate ? "custom" : "today"
  );
  const initialRange = initialDate
    ? { from: initialDate, to: initialDate }
    : computeRange("today");
  const [from, setFrom] = useState<string>(initialRange.from);
  const [to, setTo] = useState<string>(initialRange.to);

  const [screenshots, setScreenshots] = useState<TimeScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<number | null>(null);

  useEffect(() => {
    if (!requesterEmail) return;
    developersList()
      .then(setDevelopers)
      .catch((e) => setError(e.message));
  }, [requesterEmail]);

  useEffect(() => {
    if (!requesterEmail || !from || !to) return;
    setLoading(true);
    setError(null);
    adminListScreenshots({
      requester_email: requesterEmail,
      developer_id: filterDev !== "all" ? Number(filterDev) : undefined,
      from,
      to,
    })
      .then(setScreenshots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requesterEmail, filterDev, from, to]);

  const onPresetChange = (p: RangePreset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = computeRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const grouped = useMemo(() => groupByDayHour(screenshots), [screenshots]);
  const days = useMemo(
    () => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    [grouped]
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Screenshots</h1>
          <p className="text-muted-foreground">
            All screenshots clustered by day and hour. Filter by developer or date
            range.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground">Developer</label>
            <Select value={filterDev} onValueChange={setFilterDev}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All developers</SelectItem>
                {developers.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground">Range</label>
            <Select value={preset} onValueChange={(v) => onPresetChange(v as RangePreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-destructive py-4 px-4 rounded-lg bg-destructive/10">
          {error}
        </div>
      ) : screenshots.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No screenshots for this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {days.map((day) => {
            const hours = Object.keys(grouped[day]).sort();
            const dayCount = hours.reduce(
              (sum, h) => sum + grouped[day][h].length,
              0
            );
            return (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    {formatDate(day)}
                  </CardTitle>
                  <CardDescription>
                    {dayCount} screenshot{dayCount === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {hours.map((hour) => {
                    const items = grouped[day][hour];
                    return (
                      <div key={hour}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 pb-1 border-b">
                          {hour} — {items.length} shot
                          {items.length === 1 ? "" : "s"}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          {items.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setLightboxId(s.id)}
                              className="group block text-left"
                            >
                              <div className="aspect-video bg-muted rounded overflow-hidden border">
                                <img
                                  src={screenshotImageUrl(s.id, requesterEmail)}
                                  alt={`Screenshot ${s.id}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {formatTime(s.taken_at)}
                                {s.developer_name || s.developer_email ? (
                                  <span> · {s.developer_name || s.developer_email}</span>
                                ) : null}
                              </div>
                              <ActivityBar level={s.activity_level} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={lightboxId !== null}
        onOpenChange={(o) => !o && setLightboxId(null)}
      >
        <DialogContent className="max-w-5xl">
          {lightboxId !== null && (
            <div>
              <img
                src={screenshotImageUrl(lightboxId, requesterEmail)}
                alt={`Screenshot ${lightboxId}`}
                className="w-full h-auto rounded"
              />
              {(() => {
                const s = screenshots.find((x) => x.id === lightboxId);
                if (!s) return null;
                return (
                  <>
                    <div className="text-sm text-muted-foreground mt-2">
                      {formatDateTime(s.taken_at)}
                      {s.developer_email && <> · {s.developer_email}</>}
                    </div>
                    {s.activity_level !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          {(() => {
                            const pct = Math.min(100, Math.max(0, s.activity_level!));
                            const color = pct >= 60 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
                            return <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />;
                          })()}
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {Math.min(100, Math.max(0, s.activity_level!))}% activity
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimeTrackerScreenshots;
