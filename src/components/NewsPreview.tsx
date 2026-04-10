import { newsItems } from "@/data/hub-data";
import { ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export function NewsPreview() {
  const featured = newsItems.filter((n) => n.featured).slice(0, 2);
  const recent = newsItems.filter((n) => !n.featured).slice(0, 3);

  return (
    <section className="hub-section">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">News & Updates</h2>
          <p className="text-sm text-muted-foreground">Stay informed with the latest happenings</p>
        </div>
        <Link to="/news" className="text-sm font-medium text-accent hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {featured.map((item) => (
            <div key={item.title} className="hub-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="hub-badge">{item.category}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {item.date}
                </span>
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.excerpt}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {recent.map((item) => (
            <div key={item.title} className="hub-card p-4">
              <span className="text-xs text-muted-foreground">{item.date}</span>
              <h4 className="text-sm font-medium text-card-foreground mt-1">{item.title}</h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
