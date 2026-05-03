import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ExternalLink, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import project1 from "@/assets/project-1.jpg";
import project2 from "@/assets/project-2.jpg";
import project3 from "@/assets/project-3.jpg";
import project4 from "@/assets/project-4.jpg";

const projects = [
  {
    title: "Enterprise AI Platform",
    subtitle: "Scaling Intelligence Across Operations",
    description: "AI-powered analytics platform processing 10M+ data points daily",
    image: project1,
    tags: ["AI/ML", "Cloud", "Analytics"],
  },
  {
    title: "FinTech Revolution",
    subtitle: "Banking for the Digital Age",
    description: "Mobile-first banking app serving 500K+ active users",
    image: project2,
    tags: ["FinTech", "Mobile", "Security"],
  },
  {
    title: "E-Commerce Powerhouse",
    subtitle: "Retail Meets Technology",
    description: "Omnichannel platform generating $50M+ annual revenue",
    image: project3,
    tags: ["E-Commerce", "Web", "Integration"],
  },
  {
    title: "HealthTech Innovation",
    subtitle: "Patient Care Reimagined",
    description: "Telemedicine platform connecting 100K+ patients with providers",
    image: project4,
    tags: ["HealthTech", "Web App", "API"],
  },
  {
    title: "Smart Logistics",
    subtitle: "Supply Chain Optimization",
    description: "Route optimization reducing costs by 35% for enterprise clients",
    image: project1,
    tags: ["Logistics", "AI", "IoT"],
  },
  {
    title: "EdTech Platform",
    subtitle: "Learning Without Limits",
    description: "Educational platform serving 250K+ students globally",
    image: project2,
    tags: ["EdTech", "Video", "LMS"],
  },
];

const Projects = () => {
  const navigate = useNavigate();

  return (
    <section id="projects" className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
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
            Our <span className="opacity-70">Projects</span>
          </h2>
          <p className="text-xl opacity-90">
            From startups to enterprise, we've launched platforms that transformed operations and accelerated growth
          </p>
        </motion.div>

        <div className="max-w-7xl mx-auto" data-aos="fade-up" data-aos-delay="200">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {projects.map((project, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="group cursor-pointer overflow-hidden bg-primary-foreground text-foreground border-0 hover:shadow-2xl transition-all duration-500">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale group-hover:grayscale-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ExternalLink className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                      <CardContent className="p-6 space-y-3">
                        <div>
                          <h3 className="text-2xl font-bold mb-1 group-hover:text-primary transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-sm text-muted-foreground font-medium">
                            {project.subtitle}
                          </p>
                        </div>
                        <p className="text-muted-foreground">
                          {project.description}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {project.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12 bg-primary-foreground text-foreground border-0 hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="hidden md:flex -right-12 bg-primary-foreground text-foreground border-0 hover:bg-primary hover:text-primary-foreground" />
          </Carousel>
        </div>

        {/* Gallery Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-16"
        >
          <Button
            onClick={() => navigate('/gallery')}
            className="px-8 py-4 bg-primary-foreground text-primary rounded-full font-medium hover:bg-primary-foreground/90 transition-all duration-300 group"
          >
            Check our Gallery
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Projects;
