import { Card, CardContent } from "@/components/ui/card";
import { Brain, Globe, Cloud, Code, LineChart, Shield, Sparkles, Zap, Target, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { IconCloud } from "@/components/ui/interactive-icon-cloud";

const services = [
  {
    icon: Brain,
    title: "AI Solutions",
    description: "Leverage artificial intelligence to automate processes and unlock unprecedented insights",
  },
  {
    icon: Globe,
    title: "Web Development",
    description: "Modern, lightning-fast websites built with cutting-edge technologies",
  },
  {
    icon: Cloud,
    title: "Cloud Infrastructure",
    description: "Scalable cloud architecture that grows with your business",
  },
  {
    icon: Code,
    title: "Custom Software",
    description: "Bespoke software solutions engineered for your unique challenges",
  },
  {
    icon: LineChart,
    title: "Data Analytics",
    description: "Transform raw data into strategic business intelligence",
  },
  {
    icon: Shield,
    title: "Cybersecurity",
    description: "Enterprise-grade security protecting your digital assets",
  },
  {
    icon: Sparkles,
    title: "Digital Transformation",
    description: "End-to-end digital transformation for modern businesses",
  },
  {
    icon: Zap,
    title: "Performance Optimization",
    description: "Maximize efficiency with performance-first engineering",
  },
  {
    icon: Target,
    title: "Strategy Consulting",
    description: "Data-driven strategies to accelerate growth and ROI",
  },
  {
    icon: Rocket,
    title: "Startup Solutions",
    description: "Launch faster with MVPs designed for rapid iteration",
  },
];

const techSlugs = [
  "typescript",
  "javascript",
  "dart",
  "java",
  "react",
  "flutter",
  "android",
  "html5",
  "css3",
  "nodedotjs",
  "express",
  "nextdotjs",
  "prisma",
  "amazonaws",
  "postgresql",
  "firebase",
  "nginx",
  "vercel",
  "testinglibrary",
  "jest",
  "cypress",
  "docker",
  "git",
  "jira",
  "github",
  "gitlab",
  "visualstudiocode",
  "androidstudio",
  "sonarqube",
  "figma",
];

const Services = () => {
  return (
    <section id="services" className="py-32 bg-muted/30 relative overflow-hidden">
      {/* Flickering Grid Background */}
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="hsl(var(--primary))"
        maxOpacity={0.08}
        flickerChance={0.15}
      />
      
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
      </div>

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
            Our <span className="text-primary">Services</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Comprehensive digital solutions engineered to accelerate your business growth
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-border/50 backdrop-blur-sm bg-card/50 h-full">
                <CardContent className="p-6 space-y-4">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-500"
                  >
                    <service.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                  </motion.div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Technology Stack Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-32 text-center"
          data-aos="fade-up"
          data-aos-delay="600"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-8 tracking-tighter">
            Technologies We <span className="text-primary">Master</span>
          </h3>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Built with cutting-edge technologies and industry best practices
          </p>
          
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg border bg-background/50 backdrop-blur-sm max-w-4xl mx-auto h-96">
            <IconCloud iconSlugs={techSlugs} />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
