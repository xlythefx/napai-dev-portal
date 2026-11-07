import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloudRain, RefreshCw, Waves, Wind } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { initAOS } from "@/lib/aos-init";
import {
  DISCHARGE_POINTS,
  fetchDischarge,
  fetchForecast,
  fetchJtwcBulletin,
  fetchPagasa,
  fetchRainGauges,
  fetchRiverLevels,
} from "@/lib/weatherApi";
import { DEFAULT_TOWN, getTown, type TownId } from "@/lib/weather/towns";
import {
  detectHabagat,
  floodRisk,
  parseJtwc,
  rainVerdict,
  RISK_META,
  summariseDischarge,
} from "@/lib/weather/derive";
import { AmbientBackdrop } from "@/components/weather/AmbientBackdrop";
import { AnswerCards, type Answer } from "@/components/weather/AnswerCards";
import { NowStrip } from "@/components/weather/NowStrip";
import { TownSwitcher } from "@/components/weather/TownSwitcher";
import { HourlyRainTimeline } from "@/components/weather/HourlyRainTimeline";
import { DailyOutlook } from "@/components/weather/DailyOutlook";
import { PagasaPanel } from "@/components/weather/PagasaPanel";
import { glyphForCode } from "@/lib/weather/glyph";
import { FloodRiskPanel } from "@/components/weather/FloodRiskPanel";
import { RainGauges, RiverGauges } from "@/components/weather/RiverGauges";
import { TyphoonPanel } from "@/components/weather/TyphoonPanel";
import { HabagatBanner } from "@/components/weather/HabagatBanner";
import { SourceStrip } from "@/components/weather/SourceStrip";
import { WeatherCard } from "@/components/weather/WeatherCard";
import type { Tone } from "@/components/weather/tone";

const TOWN_KEY = "napai.weather.town";
type SectionId = "rain" | "flood" | "storm";

/**
 * Public weather and flood watch for the Cainta–Taytay–Angono–Binangonan
 * corridor in Rizal.
 *
 * Structured around the three questions people actually open it for, with the
 * supporting panels behind a drill-down so the first screen stays readable.
 *
 * Eight upstream sources on four refresh cadences, so this uses react-query
 * rather than the repo's usual useState/useEffect fetching; the provider is
 * already mounted in App.tsx. Every panel fails on its own — if PAGASA is down
 * the rain answer must still render.
 */
const Weather = () => {
  const reduceMotion = useReducedMotion();

  const [townId, setTownId] = useState<TownId>(() => {
    try {
      const saved = localStorage.getItem(TOWN_KEY) as TownId | null;
      if (saved && ["cainta", "taytay", "angono", "binangonan"].includes(saved)) return saved;
    } catch {
      /* private mode / blocked storage — fall through to the default */
    }
    return DEFAULT_TOWN;
  });
  const [section, setSection] = useState<SectionId>("rain");

  const town = getTown(townId);

  useEffect(() => {
    initAOS();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TOWN_KEY, townId);
    } catch {
      /* non-fatal */
    }
  }, [townId]);

  const forecast = useQuery({
    queryKey: ["weather", "forecast", townId],
    queryFn: () => fetchForecast(town),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    // Switching town keeps the previous town's panels on screen until the new
    // forecast lands, instead of collapsing to a spinner and re-animating.
    placeholderData: keepPreviousData,
  });

  const pagasa = useQuery({
    queryKey: ["weather", "pagasa"],
    queryFn: fetchPagasa,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const rivers = useQuery({
    queryKey: ["weather", "rivers"],
    queryFn: fetchRiverLevels,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  const rain = useQuery({
    queryKey: ["weather", "rain-gauges"],
    queryFn: fetchRainGauges,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  // Basin-scale, so it is deliberately not tied to the selected town.
  const discharge = useQuery({
    queryKey: ["weather", "discharge"],
    queryFn: () => fetchDischarge(DISCHARGE_POINTS[0]),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  const jtwc = useQuery({
    queryKey: ["weather", "jtwc"],
    queryFn: fetchJtwcBulletin,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
  });

  const cyclones = useMemo(() => (jtwc.data ? parseJtwc(jtwc.data, town) : []), [jtwc.data, town]);
  const pagasaData = pagasa.data?.data ?? null;
  const townStatus = pagasaData?.town_status?.[town.name]?.status;

  const habagat = useMemo(
    () => detectHabagat(pagasaData?.weather_system ?? null, forecast.data),
    [pagasaData, forecast.data]
  );

  const dischargeSummary = useMemo(() => summariseDischarge(discharge.data), [discharge.data]);

  const risk = useMemo(
    () =>
      floodRisk({
        town,
        forecast: forecast.data,
        stations: rivers.data?.data?.stations,
        gauges: rain.data?.data?.gauges,
        cyclones,
        pagasaStatus: townStatus,
        discharge: dischargeSummary,
      }),
    [town, forecast.data, rivers.data, rain.data, cyclones, townStatus, dischargeSummary]
  );

  const verdict = useMemo(
    () => (forecast.data ? rainVerdict(forecast.data, town) : null),
    [forecast.data, town]
  );

  const parStorm = cyclones.find((c) => c.insidePar);

  // The rain glyph shows what is coming, not just what is overhead now.
  const current = forecast.data?.current;
  const skyNow = current ? glyphForCode(current.weather_code, current.is_day === 1) : undefined;
  const rainGlyph = !verdict
    ? undefined
    : verdict.rainingNow || !verdict.willRain
      ? skyNow
      : verdict.peakIntensity.key === "torrential" || verdict.peakIntensity.key === "intense"
        ? "heavy-rain"
        : verdict.peakIntensity.key === "light"
          ? "drizzle"
          : "rain";

  const answers: Answer[] = [
    {
      id: "rain",
      icon: <CloudRain className="h-4 w-4" />,
      question: "Will it rain?",
      answer: verdict
        ? verdict.rainingNow
          ? "Raining now"
          : verdict.startsAtLabel
            ? `Yes, ${verdict.startsAtLabel}`
            : verdict.willRain
              ? "Yes, within the hour"
              : "No"
        : "—",
      status: verdict ? `${verdict.peakIntensity.label} at peak` : "Loading",
      detail: verdict
        ? `${verdict.next24hTotal.toFixed(0)} mm expected over 24 hours, up to ${Math.round(verdict.maxProbability)}% chance.`
        : "Fetching the forecast…",
      tone: verdict && verdict.willRain ? verdict.peakIntensity.tone : "calm",
      pulse: verdict?.rainingNow,
      glyph: rainGlyph,
    },
    {
      id: "flood",
      icon: <Waves className="h-4 w-4" />,
      question: "Will it flood?",
      answer:
        risk.level === "low"
          ? "Not expected"
          : risk.level === "watch"
            ? "Unlikely"
            : risk.level === "elevated"
              ? "Possible"
              : risk.level === "high"
                ? "Likely"
                : "Severe risk",
      status: `${RISK_META[risk.level].label} risk`,
      detail: risk.headline,
      tone: RISK_META[risk.level].tone,
      pulse: risk.level === "high" || risk.level === "critical",
      glyph: risk.level === "high" || risk.level === "critical" ? "heavy-rain" : "fog",
    },
    {
      id: "storm",
      icon: <Wind className="h-4 w-4" />,
      question: "Typhoon or habagat?",
      answer: parStorm ? parStorm.name : habagat.active ? "Habagat" : "Neither",
      status: parStorm
        ? `${parStorm.category} inside PAR`
        : habagat.active
          ? "Southwest monsoon"
          : "Nothing active",
      detail: parStorm
        ? `${parStorm.distanceKm.toLocaleString()} km ${parStorm.bearing} of ${town.name}.`
        : habagat.active
          ? "Long spells of rain rather than short storms, possibly for days."
          : cyclones.length
            ? `${cyclones.length} system${cyclones.length === 1 ? "" : "s"} active in the Pacific, none inside PAR.`
            : "No tropical cyclone in the Philippine Area of Responsibility.",
      tone: parStorm ? "orange" : habagat.active ? "advisory" : "calm",
      pulse: Boolean(parStorm),
      glyph: parStorm ? "storm" : habagat.active ? "cloud" : "sun",
    },
  ];

  // The page's ambient tint follows whatever is most severe right now.
  const TONE_RANK: Tone[] = ["calm", "advisory", "yellow", "orange", "red"];
  const ambientTone = answers.reduce<Tone>(
    (worst, a) => (TONE_RANK.indexOf(a.tone) > TONE_RANK.indexOf(worst) ? a.tone : worst),
    "calm"
  );

  const refreshAll = () => {
    forecast.refetch();
    pagasa.refetch();
    rivers.refetch();
    rain.refetch();
    jtwc.refetch();
  };

  const anyFetching =
    forecast.isFetching || pagasa.isFetching || rivers.isFetching || rain.isFetching;

  // A live PAGASA warning is never hidden behind a tab.
  const showWarningUpFront = townStatus && townStatus !== "none" && townStatus !== "advisory";

  return (
    <div className="min-h-screen">
      <AmbientBackdrop tone={ambientTone} />
      <Navbar />

      <section className="px-4 pb-24 pt-28">
        <div className="container mx-auto max-w-7xl">
          <motion.header
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5">
              <CloudRain className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Rizal Weather &amp; Flood Watch</span>
            </div>

            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tighter md:text-6xl">
              <span className="text-primary">{town.name}</span> today
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Rain, flooding and storms for Cainta, Taytay, Angono and Binangonan — from PAGASA's
              own warnings and gauges.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <TownSwitcher value={townId} onChange={setTownId} statuses={pagasaData?.town_status} />
              <button
                onClick={refreshAll}
                disabled={anyFetching}
                aria-label="Refresh all weather data"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${anyFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </motion.header>

          {/* Main column + a sticky outlook rail. The rail keeps the week in
              view while the main column drills into today. */}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <AnswerCards
              answers={answers}
              activeId={section}
              onSelect={(id) => setSection(id as SectionId)}
            />

            {forecast.data && <NowStrip data={forecast.data} />}

            {forecast.error && !forecast.data && (
              <WeatherCard
                title="Rain forecast"
                error={forecast.error}
                errorMessage="The forecast service could not be reached. Try refreshing in a moment."
              />
            )}

            {showWarningUpFront && (
              <PagasaPanel
                data={pagasaData}
                town={town}
                stale={pagasa.data?.stale}
              />
            )}

            <HabagatBanner habagat={habagat} />

            {/* Drill-down: only the selected question's evidence is rendered. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section}
                initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {section === "rain" && forecast.data && <HourlyRainTimeline data={forecast.data} />}

                {section === "flood" && (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FloodRiskPanel risk={risk} town={town} />
                      <RiverGauges
                        stations={rivers.data?.data?.stations}
                        basin={town.basin}
                        isLoading={rivers.isLoading}
                        error={rivers.error}
                        stale={rivers.data?.stale}
                      />
                    </div>
                    <RainGauges
                      gauges={rain.data?.data?.gauges}
                      isLoading={rain.isLoading}
                      error={rain.error}
                      stale={rain.data?.stale}
                    />
                  </>
                )}

                {section === "storm" && (
                  <>
                    <TyphoonPanel
                      cyclones={cyclones}
                      bulletin={jtwc.data}
                      town={town}
                      isLoading={jtwc.isLoading}
                      error={jtwc.error}
                    />
                    {!showWarningUpFront && (
                      <PagasaPanel
                        data={pagasaData}
                        town={town}
                        isLoading={pagasa.isLoading}
                        error={pagasa.error}
                        stale={pagasa.data?.stale}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <SourceStrip pagasaAt={pagasa.data?.fetched_at} gaugesAt={rivers.data?.fetched_at} />
          </div>

          <motion.aside
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 26, delay: reduceMotion ? 0 : 0.25 }}
            className="min-w-0 lg:sticky lg:top-24"
          >
            <DailyOutlook data={forecast.data} pagasa={pagasaData} />
          </motion.aside>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Weather;
