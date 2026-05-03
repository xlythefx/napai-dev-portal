import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import project1 from "@/assets/project-1.jpg";
import project2 from "@/assets/project-2.jpg";
import project3 from "@/assets/project-3.jpg";
import project4 from "@/assets/project-4.jpg";

const galleryProjects = [
  {
    title: "Enterprise AI Platform",
    subtitle: "Scaling Intelligence Across Operations",
    description: "AI-powered analytics platform processing 10M+ data points daily",
    image: project1,
    tags: ["AI/ML", "Cloud", "Analytics"],
    category: "AI Solutions",
  },
  {
    title: "FinTech Revolution",
    subtitle: "Banking for the Digital Age",
    description: "Mobile-first banking app serving 500K+ active users",
    image: project2,
    tags: ["FinTech", "Mobile", "Security"],
    category: "Financial Tech",
  },
  {
    title: "E-Commerce Powerhouse",
    subtitle: "Retail Meets Technology",
    description: "Omnichannel platform generating $50M+ annual revenue",
    image: project3,
    tags: ["E-Commerce", "Web", "Integration"],
    category: "E-Commerce",
  },
  {
    title: "HealthTech Innovation",
    subtitle: "Patient Care Reimagined",
    description: "Telemedicine platform connecting 100K+ patients with providers",
    image: project4,
    tags: ["HealthTech", "Web App", "API"],
    category: "Healthcare",
  },
  {
    title: "Smart Logistics",
    subtitle: "Supply Chain Optimization",
    description: "Route optimization reducing costs by 35% for enterprise clients",
    image: project1,
    tags: ["Logistics", "AI", "IoT"],
    category: "Logistics",
  },
  {
    title: "EdTech Platform",
    subtitle: "Learning Without Limits",
    description: "Educational platform serving 250K+ students globally",
    image: project2,
    tags: ["EdTech", "Video", "LMS"],
    category: "Education",
  },
  {
    title: "Real Estate Portal",
    subtitle: "Property Discovery Made Easy",
    description: "Advanced property search with AI-powered recommendations",
    image: project3,
    tags: ["Real Estate", "AI", "Search"],
    category: "Real Estate",
  },
  {
    title: "Social Media Analytics",
    subtitle: "Insights That Drive Growth",
    description: "Comprehensive analytics platform for social media management",
    image: project4,
    tags: ["Analytics", "Social Media", "Dashboard"],
    category: "Analytics",
  },
];

const categories = ["All", "AI Solutions", "Financial Tech", "E-Commerce", "Healthcare", "Logistics", "Education", "Real Estate", "Analytics"];

const ProjectGallery = () => {
  return (
    <section id="gallery" className="py-32 bg-muted/30 relative overflow-hidden">
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
            Check our <span className="text-primary">Gallery</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Explore our diverse portfolio of innovative projects across various industries
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          {categories.map((category, index) => (
            <motion.button
              key={category}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                category === "All"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground border border-border hover:border-primary hover:text-primary"
              }`}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleryProjects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <Card className="group cursor-pointer overflow-hidden bg-background text-foreground border-border hover:shadow-2xl transition-all duration-500">
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectGallery;
