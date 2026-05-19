import { Link } from "react-router-dom";
import { Sparkles, Twitter, Linkedin, Github, Instagram, Download, BookOpen } from "lucide-react";
import { API_BASE } from "@/lib/api";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground py-16 relative overflow-hidden">
      {/* Background Pattern */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-8 h-8" />
              <span className="text-3xl font-bold tracking-tighter">Nap.AI</span>
            </div>
            <p className="opacity-90 leading-relaxed max-w-md mb-6">
              Professional digital solutions and AI services for modern businesses. 
              Engineered for scale, built for growth.
            </p>
            <div className="flex items-center space-x-4">
              {[Twitter, Linkedin, Github, Instagram].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-all duration-300 hover:scale-110"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3 opacity-90">
              <li><a href="/#services" className="hover:underline hover:opacity-100 transition-opacity">Services</a></li>
              <li><a href="/#projects" className="hover:underline hover:opacity-100 transition-opacity">Projects</a></li>
              <li><a href="/#partners" className="hover:underline hover:opacity-100 transition-opacity">Partners</a></li>
              <li><a href="/#contact" className="hover:underline hover:opacity-100 transition-opacity">Contact</a></li>
              <li><Link to="/auth" className="hover:underline hover:opacity-100 transition-opacity">Referral Program</Link></li>
              <li><Link to="/products/quantab" className="hover:underline hover:opacity-100 transition-opacity">QuanTab</Link></li>
              <li>
                <Link to="/products/quantab/setup" className="inline-flex items-center gap-1.5 hover:underline hover:opacity-100 transition-opacity">
                  <BookOpen className="w-3.5 h-3.5" />
                  QuanTab Setup Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-lg mb-4">Legal</h4>
            <ul className="space-y-3 opacity-90">
              <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">Privacy Policy</a></li>
              <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">Terms of Service</a></li>
              <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">Cookie Policy</a></li>
              <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">GDPR Compliance</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-90">
            <p>© {currentYear} Nap.AI Digital Solutions. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href={`${API_BASE}/apk/vendotab`}
                className="inline-flex items-center gap-1.5 text-xs hover:underline opacity-80 hover:opacity-100 transition-opacity"
                title="Download the latest QuanTab APK"
              >
                <Download className="w-3 h-3" />
                Download QuanTab APK
              </a>
              <p className="text-xs opacity-80">Engineered for 9-Figure Growth</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
