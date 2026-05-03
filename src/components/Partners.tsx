import { motion } from "framer-motion";
import { Building2, Sparkles, Zap, Globe, Shield, Rocket } from "lucide-react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const partners = [
  { name: "TechVision", icon: Building2 },
  { name: "InnovateAI", icon: Sparkles },
  { name: "CloudScale", icon: Zap },
  { name: "GlobalTech", icon: Globe },
  { name: "SecureNet", icon: Shield },
  { name: "LaunchPad", icon: Rocket },
  { name: "DataCore", icon: Building2 },
  { name: "SmartSys", icon: Sparkles },
];

const Partners = () => {
  return (
    <section id="partners" className="py-32 bg-background relative overflow-hidden">
      {/* Flickering Grid Background */}
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="hsl(var(--primary))"
        maxOpacity={0.1}
        flickerChance={0.1}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-20"
          data-aos="fade-up"
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
            Trusted <span className="text-primary">Partners</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Working with industry leaders to deliver exceptional results
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto" data-aos="fade-up" data-aos-delay="200">
          {partners.map((partner, index) => {
            const Icon = partner.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg bg-card">
                  <Icon className="w-12 h-12 mb-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  <p className="font-bold text-lg group-hover:text-primary transition-colors">
                    {partner.name}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mt-20"
          data-aos="fade-up"
          data-aos-delay="400"
        >
          {[
            { value: "150+", label: "Projects Delivered" },
            { value: "50+", label: "Happy Clients" },
            { value: "15+", label: "Countries Served" },
            { value: "99%", label: "Client Satisfaction" },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl bg-muted/50"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Partners;
