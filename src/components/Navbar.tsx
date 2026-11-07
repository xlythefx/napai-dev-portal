import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { cn } from "@/lib/utils";
import { Menu, ChevronDown, Smartphone } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useReducedMotion,
} from "framer-motion";

type NavLink = {
  name: string;
  path: string;
  /** Home-page section this link points at, for scroll-spy highlighting. */
  section?: string;
  type?: "products";
};

const navLinks: NavLink[] = [
  { name: "Home", path: "/", section: "home" },
  { name: "Services", path: "/#services", section: "services" },
  { name: "Projects", path: "/#projects", section: "projects" },
  { name: "Products", path: "#products-menu", type: "products" },
  { name: "Tools", path: "/developer-portal" },
  { name: "Weather", path: "/weather" },
  { name: "Contact", path: "/#contact", section: "contact" },
];

const products = [
  {
    name: "QuanTab",
    to: "/products/quantab",
    badge: "SaaS",
    icon: Smartphone,
    available: true,
  },
  { name: "Ob-Portus AI: Career Finder", badge: "Coming soon", available: false },
  { name: "Other", badge: "Coming soon", available: false },
];

const SPY_SECTIONS = ["home", "services", "projects", "contact"];

const Navbar = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const isHome = location.pathname === "/";
  const activeSection = useScrollSpy(SPY_SECTIONS, isHome);

  // Scroll progress rail along the bottom edge of the bar.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the mobile sheet whenever the route or hash changes.
  useEffect(() => {
    setIsOpen(false);
    setMobileProductsOpen(false);
  }, [location.pathname, location.hash]);

  const isActive = (link: NavLink) => {
    if (link.type === "products") return location.pathname.startsWith("/products");
    if (link.section) return isHome && activeSection === link.section;
    return location.pathname === link.path;
  };

  const activeName = navLinks.find((link) => isActive(link))?.name ?? null;

  const linkClass = (active: boolean) =>
    cn(
      "relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    );

  /**
   * Shared-layout pill that slides between the active nav items.
   *
   * Built as a plain element rather than a nested component — a component
   * declared in the render body is a fresh type each render, so React would
   * remount it and the layout animation would never play.
   */
  const activePill = (show: boolean) =>
    show ? (
      <motion.span
        layoutId="nav-active-pill"
        className="absolute inset-0 -z-10 rounded-full bg-foreground/[0.07]"
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 380, damping: 32 }
        }
      />
    ) : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "pointer-events-auto mx-auto transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          scrolled
            ? "mt-3 w-[min(1120px,calc(100%-1.5rem))] rounded-full border border-border bg-card/70 shadow-[var(--shadow-medium)] backdrop-blur-xl"
            : "mt-0 w-full rounded-none border border-transparent bg-transparent shadow-none backdrop-blur-0"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-4 transition-all duration-500",
            scrolled ? "h-14 px-4 lg:px-6" : "h-20 px-4 lg:px-8"
          )}
        >
          <Link to="/" className="group flex shrink-0 items-center gap-2">
            <img
              src="/assets/logonew.png"
              alt=""
              aria-hidden="true"
              className={cn(
                "object-contain transition-all duration-500 group-hover:scale-110",
                scrolled ? "h-7 w-7" : "h-8 w-8"
              )}
            />
            <span
              className={cn(
                "font-bold tracking-tighter transition-all duration-500",
                scrolled ? "text-xl" : "text-2xl"
              )}
            >
              Nap<span className="text-primary">.AI</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden items-center lg:flex">
            {navLinks.map((link) => {
              const active = isActive(link);

              if (link.type === "products") {
                return (
                  <DropdownMenu key={link.name}>
                    <DropdownMenuTrigger
                      className={cn(
                        linkClass(active),
                        "inline-flex items-center gap-1 outline-none",
                        "data-[state=open]:text-foreground",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      )}
                    >
                      {activePill(activeName === link.name)}
                      {link.name}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      sideOffset={12}
                      className="w-64 rounded-2xl border-border bg-card/95 backdrop-blur-xl"
                    >
                      {products.map((product) =>
                        product.available && product.to ? (
                          <DropdownMenuItem key={product.name} asChild>
                            <Link
                              to={product.to}
                              className="flex cursor-pointer items-center gap-2 rounded-xl"
                            >
                              {product.icon && <product.icon className="h-3.5 w-3.5" />}
                              <span className="flex-1">{product.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {product.badge}
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            key={product.name}
                            disabled
                            className="justify-between rounded-xl"
                          >
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {product.badge}
                            </span>
                          </DropdownMenuItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              const shared = {
                className: linkClass(active),
                "aria-current": active ? ("page" as const) : undefined,
                children: (
                  <>
                    {activePill(activeName === link.name)}
                    {link.name}
                  </>
                ),
              };

              return link.path.startsWith("/#") ? (
                <a key={link.name} href={link.path} {...shared} />
              ) : (
                <Link key={link.name} to={link.path} {...shared} />
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <ThemeToggle />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="rounded-full">
                  Admin
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/tools">
                <Button variant="outline" size="sm" className="rounded-full">
                  Tools
                </Button>
              </Link>
            )}
            <a href="/#contact">
              <Button
                size={scrolled ? "sm" : "default"}
                className="rounded-full bg-primary transition-all duration-500 hover:bg-primary/90"
              >
                Book us a call
              </Button>
            </a>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  className="rounded-full p-2 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open menu"
                  aria-expanded={isOpen}
                >
                  <Menu size={24} />
                </button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-full border-border bg-background/95 backdrop-blur-xl sm:max-w-sm"
              >
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>

                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between pb-6">
                    <Link to="/" className="flex items-center gap-2">
                      <img
                        src="/assets/logonew.png"
                        alt=""
                        aria-hidden="true"
                        className="h-7 w-7 object-contain"
                      />
                      <span className="text-xl font-bold tracking-tighter">
                        Nap<span className="text-primary">.AI</span>
                      </span>
                    </Link>
                  </div>

                  <nav aria-label="Mobile" className="flex-1 space-y-1 overflow-y-auto">
                    {navLinks.map((link, index) => {
                      const active = isActive(link);
                      const reveal = reduceMotion
                        ? {}
                        : {
                            initial: { opacity: 0, x: 24 },
                            animate: { opacity: 1, x: 0 },
                            transition: { delay: 0.05 + index * 0.05 },
                          };

                      if (link.type === "products") {
                        return (
                          <motion.div key={link.name} {...reveal}>
                            <button
                              type="button"
                              onClick={() => setMobileProductsOpen((v) => !v)}
                              aria-expanded={mobileProductsOpen}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors",
                                active
                                  ? "bg-foreground/5 text-foreground"
                                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                              )}
                            >
                              {link.name}
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform duration-300",
                                  mobileProductsOpen && "rotate-180"
                                )}
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {mobileProductsOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-3 space-y-1 border-l border-border py-1 pl-3">
                                    {products.map((product) =>
                                      product.available && product.to ? (
                                        <Link
                                          key={product.name}
                                          to={product.to}
                                          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                                        >
                                          {product.icon && (
                                            <product.icon className="h-3.5 w-3.5" />
                                          )}
                                          <span className="flex-1">{product.name}</span>
                                          <span className="text-xs">{product.badge}</span>
                                        </Link>
                                      ) : (
                                        <div
                                          key={product.name}
                                          className="flex items-center justify-between px-3 py-2.5 text-sm text-muted-foreground/50"
                                        >
                                          <span>{product.name}</span>
                                          <span className="text-xs">{product.badge}</span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      }

                      const itemClass = cn(
                        "block rounded-xl px-4 py-3 text-base font-medium transition-colors",
                        active
                          ? "bg-foreground/5 text-foreground"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      );

                      return (
                        <motion.div key={link.name} {...reveal}>
                          {link.path.startsWith("/#") ? (
                            <a
                              href={link.path}
                              className={itemClass}
                              aria-current={active ? "page" : undefined}
                              onClick={() => setIsOpen(false)}
                            >
                              {link.name}
                            </a>
                          ) : (
                            <Link
                              to={link.path}
                              className={itemClass}
                              aria-current={active ? "page" : undefined}
                            >
                              {link.name}
                            </Link>
                          )}
                        </motion.div>
                      );
                    })}
                  </nav>

                  <div className="space-y-2 border-t border-border pt-6">
                    {isAdmin && (
                      <Link to="/admin" className="block">
                        <Button variant="ghost" size="lg" className="w-full rounded-full">
                          Admin Panel
                        </Button>
                      </Link>
                    )}
                    {isAuthenticated && (
                      <Link to="/tools" className="block">
                        <Button variant="outline" size="lg" className="w-full rounded-full">
                          Tools
                        </Button>
                      </Link>
                    )}
                    <a
                      href="/#contact"
                      className="block"
                      onClick={() => setIsOpen(false)}
                    >
                      <Button size="lg" className="w-full rounded-full">
                        Book us a call
                      </Button>
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Scroll progress rail — hugs the bottom edge of the floating bar. */}
        <motion.div
          aria-hidden="true"
          style={{ scaleX: progress }}
          className={cn(
            "h-[2px] origin-left bg-primary transition-opacity duration-500",
            scrolled ? "opacity-100" : "opacity-0",
            scrolled ? "mx-6 rounded-full" : ""
          )}
        />
      </motion.header>
    </div>
  );
};

export default Navbar;
