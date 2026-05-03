import { motion } from "framer-motion";
import {
  Building2,
  Sparkles,
  Cloud,
  Globe,
  Shield,
  Rocket,
  Database,
  Brain,
} from "lucide-react";

// TODO: replace each partner with a real client SVG / logo image
const partners = [
  { name: "TechVision", icon: Building2 },
  { name: "InnovateAI", icon: Sparkles },
  { name: "CloudScale", icon: Cloud },
  { name: "GlobalTech", icon: Globe },
  { name: "SecureNet", icon: Shield },
  { name: "LaunchPad", icon: Rocket },
  { name: "DataCore", icon: Database },
  { name: "SmartSys", icon: Brain },
];

const PartnerLogo = ({
  name,
  Icon,
}: {
  name: string;
  Icon: typeof Building2;
}) => (
  <div className="flex items-center gap-4 px-10 py-8 mx-3 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-foreground/30 hover:bg-card transition-colors duration-300 shrink-0 min-w-[260px] h-24">
    <Icon className="w-8 h-8 text-muted-foreground" />
    <span className="font-semibold text-lg tracking-tight text-foreground/80 whitespace-nowrap">
      {name}
    </span>
  </div>
);

const Partners = () => {
  return (
    <section
      id="partners"
      className="py-16 bg-background relative overflow-hidden border-y border-border/40"
    >
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by teams building with us
          </p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex overflow-hidden">
          <div className="flex animate-marquee-left">
            {[...partners, ...partners].map((p, i) => (
              <PartnerLogo key={i} name={p.name} Icon={p.icon} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;
