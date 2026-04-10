import { subsidiaries } from "@/data/hub-data";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function SubsidiariesPreview() {
  return (
    <section className="hub-section">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Our Platforms</h2>
          <p className="text-sm text-muted-foreground">Explore Iwosan's network of healthcare services</p>
        </div>
        <Link to="/subsidiaries" className="text-sm font-medium text-accent hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subsidiaries.slice(0, 3).map((sub) => (
          <a
            key={sub.name}
            href={sub.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hub-card p-5 group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="hub-badge">{sub.category}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-card-foreground mb-1">{sub.name}</h3>
            <p className="text-sm text-muted-foreground">{sub.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
