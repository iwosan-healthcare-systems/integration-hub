import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { useState } from "react";
import { coreValues, milestones } from "@/data/hub-data";
import { Heart, Shield, BookOpen, Lightbulb, Globe } from "lucide-react";
import hospitalImg from "@/assets/hospital-interior.webp";
import visionIcon1 from "@/assets/vision-icon-1.png";
import visionIcon2 from "@/assets/vision-icon-2.png";
import visionIcon3 from "@/assets/vision-icon-3.png";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const valueIcons: Record<string, any> = { Heart, Shield, BookOpen, Lightbulb, Globe };

const AboutPage = () => {
  const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>({});

  const visionItems = [
    {
      image: visionIcon1,
      text: "We are a consistently patient-first, world-class healthcare services provider.",
      textColor: "text-emerald-600",
      iconRing: "ring-4 ring-emerald-400/20",
    },
    {
      image: visionIcon2,
      text: "We are empathetic, ethical, knowledge-driven, innovative and accessible.",
      textColor: "text-cyan-600",
      iconRing: "ring-4 ring-cyan-400/20",
    },
    {
      image: visionIcon3,
      text: "We will look after you.",
      textColor: "text-slate-900",
      iconRing: "ring-4 ring-slate-900/15",
    },
  ];

  const toggleReadMore = (title: string) => {
    setExpandedValues((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <>

      {/* Hero */}
      <section className="relative bg-about-header min-h-[220px] sm:min-h-[240px] flex items-center py-14 sm:py-16 px-6 sm:px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 bg-about-header" />
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">About Us</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
              Our Story
            </h1>
            <p className="text-primary-foreground/60 font-sans max-w-xl">
              Transforming the standards of healthcare delivery and management in Nigeria.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Vision & Values */}
      <section className="py-20 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">Principles</p>
          <h2 className="text-3xl font-bold mb-4">Our Vision and Values</h2>
        </AnimateOnScroll>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {visionItems.map((item, i) => (
            <AnimateOnScroll key={i} delay={i * 0.12}>
              <div className={`group relative flex h-full min-h-[24rem] flex-col items-center justify-between gap-6 rounded-[2.5rem] bg-slate-50/70 p-8 text-center transition duration-500 hover:-translate-y-1 hover:bg-slate-100`}>
                <div className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white shadow-xl p-4 transition-transform duration-500 group-hover:scale-105 ${item.iconRing}`}>
                  <img src={item.image} alt="Vision icon" className="h-full w-full object-contain" loading="lazy" />
                </div>
                <p className={`min-h-[5.5rem] text-sm sm:text-base font-sans leading-8 ${item.textColor}`}>
                  {item.text}
                </p>
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
        <div className="space-y-6">
          {coreValues.map((value, i) => {
            const Icon = valueIcons[value.icon] || Heart;
            const isExpanded = expandedValues[value.title];
            const shouldTruncate = value.description.length > 170;
            const preview = shouldTruncate && !isExpanded ? `${value.description.slice(0, 170).trim()}...` : value.description;

            return (
              <AnimateOnScroll key={value.title} delay={i * 0.1}>
                                <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200/70 bg-white/95 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:flex-row md:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 transition-transform duration-500 hover:scale-105">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-sans font-semibold text-lg text-foreground">{value.title}</p>
                      {shouldTruncate ? (
                        <button
                          type="button"
                          onClick={() => toggleReadMore(value.title)}
                          className="text-sm font-semibold text-accent underline-offset-4 transition hover:text-accent-foreground"
                        >
                          {isExpanded ? "Read less" : "Read more"}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground leading-7">
                      {preview}
                    </p>
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

    </>
  );
};

export default AboutPage;
