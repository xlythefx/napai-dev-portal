import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import project1 from "@/assets/project-1.jpg";
import project2 from "@/assets/project-2.jpg";
import project3 from "@/assets/project-3.jpg";
import project4 from "@/assets/project-4.jpg";

const projects = [
  {
    title: "Enterprise AI Platform",
    industry: "Operations",
    year: "2025",
    description:
      "An analytics platform that ingests millions of daily data points and turns them into operational decisions.",
    image: project1,
    tags: ["AI/ML", "Cloud", "Analytics"],
  },
  {
    title: "FinTech Mobile Banking",
    industry: "Finance",
    year: "2025",
    description:
      "A mobile-first banking experience built around speed, clarity, and end-to-end security.",
    image: project2,
    tags: ["FinTech", "Mobile", "Security"],
  },
  {
    title: "Omnichannel Commerce",
    industry: "Retail",
    year: "2024",
    description:
      "Unified storefront, inventory, and CRM stack for a multi-region retail brand.",
    image: project3,
    tags: ["E-Commerce", "Web", "Integration"],
  },
  {
    title: "Telemedicine Platform",
    industry: "Health",
    year: "2024",
    description:
      "HIPAA-compliant telemedicine connecting patients with providers across geographies.",
    image: project4,
    tags: ["HealthTech", "Web", "API"],
  },
  {
    title: "Smart Logistics",
    industry: "Logistics",
    year: "2024",
    description:
      "Route and dispatch optimization that meaningfully cut operational cost for an enterprise client.",
    image: project1,
    tags: ["Logistics", "AI", "IoT"],
  },
  {
    title: "EdTech Learning Hub",
    industry: "Education",
    year: "2024",
    description:
      "A learning platform with adaptive content, video tooling, and live cohort features.",
    image: project2,
    tags: ["EdTech", "Video", "LMS"],
  },
];

const Projects = () => {
  const navigate = useNavigate();

  return (
    <section
      id="projects"
      className="py-32 bg-background relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.04),transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight">
            Systems we&apos;ve <span className="text-primary">shipped</span>
          </h2>
          <p className="text-lg text-muted-foreground mt-5">
            A small selection of platforms, products, and infrastructure
            we&apos;ve built with founders and operating teams.
          </p>
        </motion.div>

        <div className="max-w-7xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {projects.map((project, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <Card className="group relative cursor-pointer overflow-hidden border border-border bg-card hover:border-foreground/30 hover:-translate-y-1 hover:shadow-xl transition-all duration-500 h-full">
                      {/* number */}
                      <span className="absolute top-4 right-4 z-20 text-xs font-mono text-background/80 bg-foreground/80 backdrop-blur-sm px-2 py-1 rounded-md tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-100 group-hover:opacity-50 transition-opacity duration-500" />
                      </div>

                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                          <span>{project.industry}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                          <span className="font-mono">{project.year}</span>
                        </div>

                        <div>
                          <h3 className="text-xl font-bold tracking-tight mb-2 leading-tight group-hover:text-primary transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {project.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {project.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider rounded-md border border-border text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors pt-2">
                          <span>Read case study</span>
                          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12 border-border bg-card hover:bg-foreground hover:text-background hover:border-foreground" />
            <CarouselNext className="hidden md:flex -right-12 border-border bg-card hover:bg-foreground hover:text-background hover:border-foreground" />
          </Carousel>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-3 mt-16"
        >
          <p className="text-sm text-muted-foreground">
            Want to see more of what we&apos;ve built?
          </p>
          <Button
            onClick={() => navigate("/gallery")}
            size="lg"
            className="h-12 px-7 rounded-full group bg-foreground text-background hover:bg-foreground/90"
          >
            View full gallery
            <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Projects;
