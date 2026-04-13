import { HubLayout } from "@/layouts/HubLayout";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { coreValues, milestones } from "@/data/hub-data";
import { Heart, Shield, BookOpen, Lightbulb, Globe, Target, Eye, Compass } from "lucide-react";
import teamImg from "@/assets/team-photo.jpg";
import hospitalImg from "@/assets/hospital-interior.jpg";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const valueIcons: Record<string, any> = { Heart, Shield, BookOpen, Lightbulb, Globe };

const AboutPage = () => {
  return (
    <HubLayout>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[350px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img src={teamImg} alt="Iwosan Team" className="w-full h-full object-cover" />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 px-8 lg:px-16 pb-12 max-w-4xl">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">About Us</p>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
              Our Story
            </h1>
            <p className="text-primary-foreground/60 font-sans text-lg max-w-2xl">
              Transforming the standards of healthcare delivery and management in Nigeria.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Mission / Vision / Purpose */}
      <section className="py-20 px-8 lg:px-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { icon: Target, title: "Mission", text: "To provide world-class healthcare services that are accessible, affordable, and delivered with compassion to every Nigerian." },
            { icon: Eye, title: "Vision", text: "To transform Nigeria into a global healthcare frontier through innovation, excellence, and sustainable healthcare delivery." },
            { icon: Compass, title: "Purpose", text: "To build an integrated healthcare ecosystem that improves health outcomes and sets new standards across Africa." },
          ].map((item, i) => (
            <AnimateOnScroll key={item.title} delay={i * 0.15}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-serif font-semibold text-xl mb-3">{item.title}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* About content with image */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-6xl mx-auto px-8 lg:px-16 grid lg:grid-cols-2 gap-12 items-center">
          <AnimateOnScroll direction="left">
            <div>
              <h2 className="text-3xl font-bold mb-4">What We Do</h2>
              <div className="section-divider mb-6" />
              <p className="font-sans text-muted-foreground leading-relaxed mb-4">
                We are transforming the standards of healthcare delivery and management in Nigeria in keeping
                with global best practices. By leveraging industry relations, we also support institutional
                stakeholders who seek to advance the cause of healthcare in Nigeria.
              </p>
              <p className="font-sans text-muted-foreground leading-relaxed">
                Our integrated approach combines clinical excellence, technology innovation, and compassionate
                care to deliver healthcare services that meet and exceed international standards.
              </p>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll direction="right">
            <div className="img-zoom rounded-2xl overflow-hidden">
              <img src={hospitalImg} alt="Hospital Interior" className="w-full h-80 object-cover" loading="lazy" />
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">Principles</p>
          <h2 className="text-3xl font-bold mb-2">Our Core Values</h2>
          <div className="section-divider mb-12" />
        </AnimateOnScroll>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
          {coreValues.map((value, i) => {
            const Icon = valueIcons[value.icon] || Heart;
            return (
              <AnimateOnScroll key={value.title} delay={i * 0.1}>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-sans font-semibold text-foreground mb-1">{value.title}</h3>
                    <p className="text-sm font-sans text-muted-foreground leading-relaxed">{value.description}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-8 lg:px-16">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">History</p>
            <h2 className="text-3xl font-bold text-primary-foreground mb-2">Our Journey</h2>
            <div className="section-divider mb-12" />
          </AnimateOnScroll>
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-primary-foreground/10" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <AnimateOnScroll key={m.year} delay={i * 0.08}>
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-accent border-[3px] border-primary" />
                    <p className="font-serif font-bold text-accent text-lg">{m.year}</p>
                    <p className="font-sans text-sm text-primary-foreground/60 mt-0.5">{m.event}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>
    </HubLayout>
  );
};

export default AboutPage;
