import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import ProjectGallery from "@/components/ProjectGallery";
import Footer from "@/components/Footer";
import { initAOS } from "@/lib/aos-init";

const Gallery = () => {
  useEffect(() => {
    initAOS();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ProjectGallery />
      <Footer />
    </div>
  );
};

export default Gallery;
