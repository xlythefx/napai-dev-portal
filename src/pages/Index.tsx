import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Projects from "@/components/Projects";
import Testimonials from "@/components/Testimonials";
import Partners from "@/components/Partners";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import AICompanion from "@/components/AICompanion";
import { initAOS } from "@/lib/aos-init";

const SECRET = "goadmin";

const Index = () => {
  const navigate = useNavigate();
  const bufferRef = useRef("");

  useEffect(() => {
    initAOS();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      bufferRef.current = (bufferRef.current + e.key).slice(-SECRET.length);
      if (bufferRef.current.toLowerCase() === SECRET) {
        bufferRef.current = "";
        navigate("/admin");
      }
    },
    [navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Partners />
      <Services />
      <Projects />
      <Testimonials />
      <Contact />
      <Footer />
      <AICompanion />
    </div>
  );
};

export default Index;
