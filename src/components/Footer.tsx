import { ArrowRight, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import iwosanIcon from "@/assets/iwosan_icon.webp";

export function Footer() {
  return (
    <footer className="bg-primary border-t border-primary-foreground/10">
      <div className="max-w-6xl mx-auto px-8 lg:px-16 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src={iwosanIcon} alt="Iwosan" className="h-9 w-9 rounded-lg object-contain" />
            <span className="font-serif font-semibold text-primary-foreground text-base leading-tight">
              Iwosan<br />
              <span className="text-accent font-sans font-normal text-xs tracking-widest uppercase">Integration Hub</span>
            </span>
          </div>
          <p className="text-sm font-sans text-primary-foreground/50 leading-relaxed max-w-xs">
            Your centralized digital hub for healthcare excellence, innovation, and collaboration across the Iwosan network.
          </p>
          <div className="flex items-center gap-2 mt-5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-sans text-primary-foreground/40 tracking-wide">Transforming Nigerian Healthcare</span>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="font-sans text-primary-foreground/80 font-semibold text-xs uppercase tracking-widest mb-4">
            Navigate
          </h4>
          <nav className="space-y-2.5">
            {[
              { label: "Home", url: "/" },
              { label: "About Iwosan", url: "/about" },
              { label: "Our Platforms", url: "/subsidiaries" },
              { label: "Leadership", url: "/leadership" },
              { label: "Resources & Knowledge", url: "/resources" },
              { label: "News & Updates", url: "/news" },
            ].map(({ label, url }) => (
              <Link
                key={url}
                to={url}
                className="flex items-center gap-1.5 text-sm font-sans text-primary-foreground/50 hover:text-accent transition-colors duration-200 group"
              >
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-sans text-primary-foreground/80 font-semibold text-xs uppercase tracking-widest mb-4">
            Contact
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span className="text-sm font-sans text-primary-foreground/50 leading-relaxed">Lagos, Nigeria</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-accent shrink-0" />
              <a
                href="tel:+2349139352779"
                className="text-sm font-sans text-primary-foreground/50 hover:text-accent transition-colors duration-200"
              >
                +234 913 935 2779
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-accent shrink-0" />
              <a
                href="mailto:info@iwosanhealth.com"
                className="text-sm font-sans text-primary-foreground/50 hover:text-accent transition-colors duration-200 break-all"
              >
                info@iwosanhealth.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="max-w-6xl mx-auto px-8 lg:px-16 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-sans text-primary-foreground/30">
            © {new Date().getFullYear()} Iwosan Healthcare Systems Limited. All rights reserved.
          </p>
          <p className="text-xs font-sans text-primary-foreground/20 tracking-wide uppercase">
            Transforming Healthcare · Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
}
