import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ChevronDown, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/#services" },
    { name: "Projects", path: "/#projects" },
    { name: "Products", path: "#products-menu", type: "products" },
    { name: "Tools", path: "/developer-portal" },
    { name: "Contact", path: "/#contact" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === path;
    return location.hash === path.replace("/", "");
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-2 group">
            <img
              src="/assets/logonew.png"
              alt="Nap.AI"
              className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-2xl font-bold tracking-tighter">
              Nap<span className="text-primary">.AI</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) =>
              link.type === "products" ? (
                <DropdownMenu key={link.name}>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 outline-none data-[state=open]:text-primary data-[state=open]:bg-primary/10">
                    {link.name}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/products/quantab"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="flex-1">QuanTab</span>
                        <span className="text-xs text-muted-foreground">SaaS</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="justify-between">
                      <span>Ob-Portus AI: Career Finder</span>
                      <span className="text-xs text-muted-foreground">
                        Coming soon
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="justify-between">
                      <span>Other</span>
                      <span className="text-xs text-muted-foreground">
                        Coming soon
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : link.path.startsWith("/#") ? (
                <a
                  key={link.name}
                  href={link.path}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    isActive(link.path)
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    location.pathname === link.path
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {link.name}
                </Link>
              )
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="lg" className="rounded-full">
                  Admin Panel
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/tools">
                <Button variant="outline" size="lg" className="rounded-full">
                  Tools
                </Button>
              </Link>
            )}
            <a href="/#contact">
              <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90">
                Book us a call
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link, index) =>
                  link.type === "products" ? (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="px-4 py-3 rounded-lg bg-primary/5"
                    >
                      <p className="text-sm font-medium text-foreground mb-2">
                        Products
                      </p>
                      <div className="space-y-1">
                        <Link
                          to="/products/quantab"
                          className="flex items-center gap-2 rounded-md py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span className="flex-1">QuanTab</span>
                          <span className="text-xs text-muted-foreground">SaaS</span>
                        </Link>
                        <div className="flex items-center justify-between rounded-md py-2 text-sm text-muted-foreground/60">
                          <span>Ob-Portus AI: Career Finder</span>
                          <span className="text-xs">Coming soon</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md py-2 text-sm text-muted-foreground/60">
                          <span>Other</span>
                          <span className="text-xs">Coming soon</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : link.path.startsWith("/#") ? (
                    <motion.a
                      key={link.name}
                      href={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`block px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                        isActive(link.path)
                          ? "text-primary bg-primary/10"
                          : "text-foreground hover:text-primary hover:bg-primary/5"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.name}
                    </motion.a>
                  ) : (
                    <Link key={link.name} to={link.path} onClick={() => setIsOpen(false)}>
                      <motion.span
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`block px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                          location.pathname === link.path
                            ? "text-primary bg-primary/10"
                            : "text-foreground hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        {link.name}
                      </motion.span>
                    </Link>
                  )
                )}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.1 }}
                  className="pt-4 space-y-2"
                >
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="lg" className="w-full rounded-full">
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                  {isAuthenticated && (
                    <Link to="/tools" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" size="lg" className="w-full rounded-full">
                        Tools
                      </Button>
                    </Link>
                  )}
                  <a href="/#contact" onClick={() => setIsOpen(false)}>
                    <Button size="lg" className="w-full rounded-full">
                      Book us a call
                    </Button>
                  </a>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
