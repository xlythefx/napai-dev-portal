import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminListScreenshots,
  screenshotImageUrl,
  type TimeScreenshot,
} from "@/lib/timeTrackerApi";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const AdminTimeTrackerSession = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const requesterEmail = user?.email ?? "";
  const sid = Number(sessionId);

  const [screenshots, setScreenshots] = useState<TimeScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<number | null>(null);

  useEffect(() => {
    if (!requesterEmail || !sid) return;
    setLoading(true);
    setError(null);
    adminListScreenshots({ requester_email: requesterEmail, session_id: sid })
      .then(setScreenshots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requesterEmail, sid]);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-2">Session #{sid}</h1>
      <p className="text-muted-foreground mb-6">
        {screenshots.length} screenshot{screenshots.length === 1 ? "" : "s"}.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Screenshots
          </CardTitle>
          <CardDescription>Click any thumbnail to enlarge.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-destructive py-4 px-4 rounded-lg bg-destructive/10">
              {error}
            </div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No screenshots in this session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLightboxId(s.id)}
                  className="group block text-left"
                >
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                    <img
                      src={screenshotImageUrl(s.id, requesterEmail)}
                      alt={`Screenshot ${s.id}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(s.taken_at)}
                    {s.activity_level !== null && (
                      <> · activity {s.activity_level}</>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={lightboxId !== null} onOpenChange={(o) => !o && setLightboxId(null)}>
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
                  <div className="text-sm text-muted-foreground mt-2">
                    {formatDateTime(s.taken_at)}
                    {s.activity_level !== null && (
                      <> · activity level {s.activity_level}</>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimeTrackerSession;
