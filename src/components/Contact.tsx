import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing details",
        description: "Please fill in your name, email, and message.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message sent",
      description: "We'll get back to you within one business day.",
    });

    setFormData({ name: "", email: "", company: "", message: "" });
  };

  const reasons = [
    "You want a custom system, not a templated one",
    "You need AI agents that act on real business data",
    "You're scaling past your current stack",
    "You want a partner, not a contractor",
  ];

  return (
    <section
      id="contact"
      className="py-32 bg-muted/20 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.05),transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-medium tracking-wide uppercase">
              Let&apos;s build
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-5">
            Tell us what you&apos;re{" "}
            <span className="text-primary">building.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Drop us a message or book a call. We&apos;ll come back with honest
            scope, timeline, and next steps — no sales theater.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Name <span className="text-primary">*</span>
                    </label>
                    <Input
                      placeholder="Jane Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Email <span className="text-primary">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Company
                  </label>
                  <Input
                    placeholder="Acme Inc."
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    What are you building?{" "}
                    <span className="text-primary">*</span>
                  </label>
                  <Textarea
                    placeholder="A few sentences on the problem, the team, and any timeline you're working against."
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                    rows={6}
                    className="resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-full group"
                >
                  Send message
                  <Send className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-1">
                  We respond within one business day.
                </p>
              </form>
            </div>
          </motion.div>

          {/* Side panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 space-y-5"
          >
            {/* Book a call card */}
            <div className="rounded-2xl border border-foreground bg-foreground text-background p-7 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-background/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-background/10 border border-background/20 mb-5">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    30-min intro
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2">
                  Prefer to talk?
                </h3>
                <p className="text-sm opacity-80 leading-relaxed mb-5">
                  Book a free call. We&apos;ll listen first, then tell you
                  honestly whether we&apos;re the right fit.
                </p>
                <Button
                  variant="secondary"
                  className="w-full h-11 rounded-full bg-background text-foreground hover:bg-background/90"
                >
                  Schedule a call
                </Button>
              </div>
            </div>

            {/* Contact details */}
            <div className="rounded-2xl border border-border bg-card p-7 space-y-4">
              {[
                {
                  icon: Mail,
                  label: "Email",
                  value: "hello@napai.digital",
                  href: "mailto:hello@napai.digital",
                },
                {
                  icon: Phone,
                  label: "Phone",
                  value: "+1 (555) 123-4567",
                  href: "tel:+15551234567",
                },
                {
                  icon: MapPin,
                  label: "Where",
                  value: "Remote · Global delivery",
                },
              ].map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-start gap-3 group">
                    <div className="w-9 h-9 rounded-lg bg-muted/60 border border-border flex items-center justify-center shrink-0 group-hover:border-foreground/30 transition-colors">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
                return item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block hover:opacity-80 transition-opacity"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={item.label}>{content}</div>
                );
              })}
            </div>

            {/* Why us */}
            <div className="rounded-2xl border border-border bg-card p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Reach out if
              </p>
              <ul className="space-y-3">
                {reasons.map((r, i) => (
                  <motion.li
                    key={r}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/80 leading-relaxed">
                      {r}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
