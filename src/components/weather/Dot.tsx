import { toneDot, type Tone } from "./tone";

/** Status dot used beside every severity label. */
export const Dot = ({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) => (
  <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
    {pulse && (
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${toneDot[tone]}`}
      />
    )}
    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${toneDot[tone]}`} />
  </span>
);
