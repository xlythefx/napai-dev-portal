import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Apple,
  Monitor,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  getCurrentRelease,
  type CurrentRelease,
} from "@/lib/timeTrackerReleasesApi";

const TimeTracker = () => {
  const [winRelease, setWinRelease] = useState<CurrentRelease | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);

  useEffect(() => {
    getCurrentRelease("win")
      .then(setWinRelease)
      .catch(() => setWinRelease(null))
      .finally(() => setLoadingRelease(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tools
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary">Time Tracker</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
              Napai Time Tracker
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A friendly desktop companion that quietly tracks your work hours, snaps a few
              screenshots for proof, and calculates your earnings — all while staying out of your
              way. Everything syncs securely to the cloud and your Napai admin panel, so your
              hours are always backed up and ready to view from anywhere.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
              <CardHeader>
                <CardTitle className="text-2xl">Download the desktop app</CardTitle>
                <CardDescription className="text-base mt-1">
                  Install it once, sign in, and start tracking. Works in the background and
                  syncs to the cloud automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {loadingRelease ? (
                    <Button size="lg" disabled className="rounded-full">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading…
                    </Button>
                  ) : winRelease ? (
                    <a href={winRelease.download_url}>
                      <Button size="lg" className="rounded-full">
                        <Monitor className="w-4 h-4 mr-2" />
                        Download for Windows
                      </Button>
                    </a>
                  ) : (
                    <Button size="lg" disabled className="rounded-full">
                      <Monitor className="w-4 h-4 mr-2" />
                      Download for Windows
                    </Button>
                  )}
                  <Button size="lg" disabled variant="outline" className="rounded-full">
                    <Apple className="w-4 h-4 mr-2" />
                    Download for macOS
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TimeTracker;
