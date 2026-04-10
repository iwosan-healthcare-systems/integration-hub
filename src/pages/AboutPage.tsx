import { HubLayout } from "@/layouts/HubLayout";
import { coreValues, milestones } from "@/data/hub-data";
import { Heart, Shield, BookOpen, Lightbulb, Globe, Target, Eye, Compass } from "lucide-react";

const valueIcons: Record<string, any> = {
  Heart, Shield, BookOpen, Lightbulb, Globe,
};

const AboutPage = () => {
  return (
    <HubLayout>
      <div className="hub-section max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <span className="hub-badge mb-3 inline-block">About Us</span>
          <h1 className="text-3xl font-bold mb-4">About Iwosan Healthcare Systems</h1>
          <p className="text-muted-foreground max-w-3xl text-lg">
            We are transforming the standards of healthcare delivery and management in Nigeria
            in keeping with global best practices. By leveraging industry relations, we also support
            institutional stakeholders who seek to advance the cause of healthcare in Nigeria.
          </p>
        </div>

        {/* Mission / Vision */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Target, title: "Our Mission", text: "To provide world-class healthcare services that are accessible, affordable, and delivered with compassion to every Nigerian." },
            { icon: Eye, title: "Our Vision", text: "To transform Nigeria into a global healthcare frontier through innovation, excellence, and sustainable healthcare delivery." },
            { icon: Compass, title: "Our Purpose", text: "To build an integrated healthcare ecosystem that improves health outcomes and sets new standards across Africa." },
          ].map((item) => (
            <div key={item.title} className="hub-card p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <item.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2 text-card-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Core Values */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Our Core Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreValues.map((value) => {
              const Icon = valueIcons[value.icon] || Heart;
              return (
                <div key={value.title} className="hub-card p-5">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-1">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {milestones.map((m, i) => (
                <div key={m.year} className="relative pl-12" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                  <span className="text-sm font-bold text-accent">{m.year}</span>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HubLayout>
  );
};

export default AboutPage;
