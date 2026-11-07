/**
 * Attribution and freshness. Open-Meteo's data is CC-BY 4.0, so crediting it is
 * a licence condition, not a courtesy.
 */

interface Source {
  label: string;
  href: string;
  note: string;
  updatedAt?: string;
}

const fmt = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
};

export const SourceStrip = ({
  pagasaAt,
  gaugesAt,
}: {
  pagasaAt?: string;
  gaugesAt?: string;
}) => {
  const sources: Source[] = [
    {
      label: "PAGASA",
      href: "https://www.pagasa.dost.gov.ph/regional-forecast/ncrprsd",
      note: "Regional forecast, rainfall warnings and river gauges",
      updatedAt: pagasaAt,
    },
    {
      label: "PAGASA PMT-FFWS",
      href: "https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/",
      note: "Pasig–Marikina–Tullahan water levels and rain gauges",
      updatedAt: gaugesAt,
    },
    {
      label: "Open-Meteo",
      href: "https://open-meteo.com/",
      note: "Hourly and daily model forecast (CC-BY 4.0)",
    },
    {
      label: "JTWC",
      href: "https://www.metoc.navy.mil/jtwc/jtwc.html",
      note: "Western Pacific tropical cyclone advisory",
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="text-sm font-semibold tracking-tight">Where this data comes from</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sources.map((s) => (
          <li key={s.label}>
            <a
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-medium underline-offset-4 hover:underline"
            >
              {s.label}
            </a>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.note}</p>
            {fmt(s.updatedAt) && (
              <p className="text-[11px] text-muted-foreground">Updated {fmt(s.updatedAt)}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        PAGASA does not publish a free public weather API, so the official figures here are read
        from PAGASA's own published pages and flood-forecasting feeds. This page is an unofficial
        aid — for warnings and evacuation decisions, follow PAGASA and your local DRRMO.
      </p>
    </div>
  );
};
