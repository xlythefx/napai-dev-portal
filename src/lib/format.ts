/**
 * Shared date/time formatters used across the admin dashboard.
 * formatDate     -> "Feb 03, 2003"
 * formatDateTime -> "Feb 03, 2003, 1:23 PM"
 * formatTime     -> "1:23 PM"
 */

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const toDate = (value: string | number | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  // SQL DATE strings ("2026-05-02") parse as UTC; anchor at noon to avoid TZ drift.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + "T12:00:00");
  }
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value: string | number | Date | null | undefined): string => {
  const d = toDate(value);
  return d ? dateFmt.format(d) : "—";
};

export const formatDateTime = (value: string | number | Date | null | undefined): string => {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : "—";
};

export const formatTime = (value: string | number | Date | null | undefined): string => {
  const d = toDate(value);
  return d ? timeFmt.format(d) : "—";
};
