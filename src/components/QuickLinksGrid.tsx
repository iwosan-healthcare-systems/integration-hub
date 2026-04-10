import { Mail, Users, Headphones, Calendar, CreditCard, GraduationCap } from "lucide-react";
import { quickLinks } from "@/data/hub-data";

const iconMap: Record<string, any> = {
  Mail, Users, Headphones, Calendar, CreditCard, GraduationCap,
};

export function QuickLinksGrid() {
  return (
    <section className="hub-section">
      <h2 className="text-xl font-semibold mb-1">Quick Access</h2>
      <p className="text-sm text-muted-foreground mb-6">Jump to frequently used tools and systems</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickLinks.map((link) => {
          const Icon = iconMap[link.icon];
          return (
            <a
              key={link.title}
              href={link.url}
              target={link.url.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="hub-card p-4 flex flex-col items-center gap-3 text-center group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                {Icon && <Icon className="h-5 w-5 text-accent" />}
              </div>
              <span className="text-sm font-medium text-card-foreground">{link.title}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
