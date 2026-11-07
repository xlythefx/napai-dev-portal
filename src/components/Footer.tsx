import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Twitter,
  Linkedin,
  Github,
  Instagram,
  Download,
  ArrowRight,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type FooterLink = {
  name: string;
  /** Internal route (react-router) — mutually exclusive with `href`. */
  to?: string;
  /** Anchor or external URL. */
  href?: string;
};

const linkColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Company",
    links: [
      { name: "Services", href: "/#services" },
      { name: "Projects", href: "/#projects" },
      { name: "Partners", href: "/#partners" },
      { name: "Gallery", to: "/gallery" },
      { name: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Products",
    links: [
      { name: "QuanTab", to: "/products/quantab" },
      { name: "Start a Trial", to: "/products/quantab/trial" },
      { name: "Setup Guide", to: "/products/quantab/setup" },
      { name: "AI Tools", to: "/tools" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Referral Program", to: "/auth" },
      { name: "Developer Portal", to: "/developer-portal" },
      { name: "Become a Developer", to: "/developer-signup" },
      { name: "Client Login", to: "/admin" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
      { name: "GDPR Compliance", href: "#" },
    ],
  },
];

const socials = [
  { Icon: Twitter, label: "Twitter", href: "#" },
  { Icon: Linkedin, label: "LinkedIn", href: "#" },
  { Icon: Github, label: "GitHub", href: "#" },
  { Icon: Instagram, label: "Instagram", href: "#" },
];

const linkClass =
  "text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Enter your email",
        description: "Add an email address so we know where to send it.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "You're on the list",
      description: "We'll send build notes and product updates — no noise.",
    });
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary-foreground) / 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--primary-foreground) / 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 gap-12 lg:grid-cols-12"
        >
          {/* Brand + newsletter */}
          <div className="lg:col-span-5">
            <Link to="/" className="mb-4 inline-flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              <span className="text-3xl font-bold tracking-tighter">Nap.AI</span>
            </Link>

            <p className="mb-8 max-w-md text-sm leading-relaxed text-primary-foreground/70">
              Professional digital solutions and AI services for modern
              businesses. Engineered for scale, built for growth.
            </p>

            <div className="mb-8">
              <h4 className="mb-2 text-lg font-semibold">Stay in the loop</h4>
              <p className="mb-4 text-sm text-primary-foreground/70">
                Product updates and build notes, straight to your inbox.
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-2.5 text-sm placeholder:text-primary-foreground/40 focus:border-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-foreground/10"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-medium text-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Subscribe
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="flex items-center gap-3">
              {socials.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10 transition-all duration-300 hover:scale-110 hover:bg-primary-foreground/20"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-7 lg:grid-cols-4">
            {linkColumns.map((column, index) => (
              <motion.div
                key={column.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              >
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">
                  {column.title}
                </h4>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      {link.to ? (
                        <Link to={link.to} className={linkClass}>
                          {link.name}
                        </Link>
                      ) : (
                        <a href={link.href} className={linkClass}>
                          {link.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Oversized wordmark */}
        <div
          aria-hidden="true"
          className="pointer-events-none mt-16 select-none overflow-hidden"
        >
          <span className="block whitespace-nowrap text-center text-[18vw] font-bold leading-[0.8] tracking-tighter text-primary-foreground/5 lg:text-[15vw]">
            Nap.AI
          </span>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-primary-foreground/15 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-primary-foreground/70 md:flex-row">
            <p>© {currentYear} Nap.AI Digital Solutions. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={`${API_BASE}/apk/vendotab`}
                title="Download the latest QuanTab APK"
                className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-primary-foreground"
              >
                <Download className="h-3 w-3" />
                Download QuanTab APK
              </a>
              <p className="text-xs">Engineered for 9-Figure Growth</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
