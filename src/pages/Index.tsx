import { HubLayout } from "@/layouts/HubLayout";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { ArrowRight, Heart, Stethoscope, BookOpen, Building2, Users, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import hospitalImg from "@/assets/hospital-interior.jpg";
import teamImg from "@/assets/team-photo.jpg";
import innovationImg from "@/assets/innovation-bg.jpg";
import diagnosticsImg from "@/assets/diagnostics.jpg";
import { newsItems, subsidiaries, quickLinks } from "@/data/hub-data";
import { Mail, Headphones, Calendar, CreditCard, GraduationCap } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = { Mail, Users, Headphones, Calendar, CreditCard, GraduationCap };

const Index = () => {
  return (
    <HubLayout>
      {/* Hero */}
      <section className="relative min-h-[75vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={hospitalImg} alt="" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 px-8 lg:px-16 py-20 max-w-3xl">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs mb-4 font-medium">
              Welcome to the Hub
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll delay={0.1}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.1] mb-6">
              Iwosan Innovation Hub
            </h1>
          </AnimateOnScroll>
          <AnimateOnScroll delay={0.2}>
            <p className="text-primary-foreground/70 text-lg md:text-xl max-w-xl mb-8 font-sans leading-relaxed">
              Transforming Nigeria into a global healthcare frontier. Your centralized
              platform for tools, resources, and collaboration.
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll delay={0.3}>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-accent text-accent-foreground font-sans font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Explore <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/subsidiaries"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-primary-foreground/30 text-primary-foreground font-sans font-medium text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Our Platforms
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-primary py-8">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "20+", label: "Years of Excellence" },
            { value: "5", label: "Hospital Locations" },
            { value: "1M+", label: "Patients Served" },
            { value: "2000+", label: "Healthcare Staff" },
          ].map((stat, i) => (
            <AnimateOnScroll key={stat.label} delay={i * 0.1}>
              <div className="text-primary-foreground">
                <p className="text-3xl md:text-4xl font-bold font-serif">{stat.value}</p>
                <p className="text-sm font-sans text-primary-foreground/60 mt-1">{stat.label}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-16 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">Tools</p>
          <h2 className="text-3xl font-bold mb-2">Quick Access</h2>
          <div className="section-divider mb-10" />
        </AnimateOnScroll>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
          {quickLinks.map((link, i) => {
            const Icon = iconMap[link.icon];
            return (
              <AnimateOnScroll key={link.title} delay={i * 0.08}>
                <a
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 group py-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors duration-300">
                    {Icon && <Icon className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />}
                  </div>
                  <span className="text-xs font-sans font-medium text-foreground text-center">{link.title}</span>
                </a>
              </AnimateOnScroll>
            );
          })}
        </div>
      </section>

      {/* About split */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto px-8 lg:px-16 grid lg:grid-cols-2 gap-12 items-center">
          <AnimateOnScroll direction="left">
            <div className="img-zoom rounded-2xl overflow-hidden">
              <img src={teamImg} alt="Iwosan Team" className="w-full h-80 lg:h-[420px] object-cover" loading="lazy" />
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll direction="right">
            <div>
              <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Who We Are</p>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Transforming Healthcare Delivery in Nigeria
              </h2>
              <div className="section-divider mb-6" />
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">
                We are transforming the standards of healthcare delivery and management in Nigeria
                in keeping with global best practices. By leveraging industry relations, we support
                institutional stakeholders who seek to advance healthcare in Nigeria.
              </p>
              <div className="flex flex-wrap gap-6 mb-8">
                {[
                  { icon: Heart, text: "Empathetic Care" },
                  { icon: Stethoscope, text: "Clinical Excellence" },
                  { icon: BookOpen, text: "Knowledge Driven" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-sm font-sans">
                    <item.icon className="h-4 w-4 text-accent" />
                    <span className="text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 font-sans font-medium text-sm text-accent link-underline"
              >
                Learn more about us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Subsidiaries */}
      <section className="py-20 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">Network</p>
              <h2 className="text-3xl font-bold">Our Platforms</h2>
              <div className="section-divider mt-3" />
            </div>
            <Link to="/subsidiaries" className="hidden md:flex items-center gap-1 font-sans text-sm text-accent link-underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </AnimateOnScroll>
        <div className="grid md:grid-cols-3 gap-8">
          {subsidiaries.slice(0, 3).map((sub, i) => (
            <AnimateOnScroll key={sub.name} delay={i * 0.12}>
              <a
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block hover-lift"
              >
                <div className="h-48 rounded-xl bg-primary overflow-hidden relative mb-4">
                  <img
                    src={i === 0 ? hospitalImg : i === 1 ? diagnosticsImg : innovationImg}
                    alt={sub.name}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-sans uppercase tracking-widest text-accent">{sub.category}</span>
                    <h3 className="text-primary-foreground font-serif font-semibold text-lg">{sub.name}</h3>
                  </div>
                </div>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{sub.description}</p>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* Innovation banner */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img src={innovationImg} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center px-8">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-4">Innovation</p>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Driving Digital Healthcare Transformation
            </h2>
            <p className="text-primary-foreground/60 font-sans mb-8 max-w-xl mx-auto">
              From electronic health records to telemedicine, we're building the infrastructure
              for next-generation healthcare delivery across Nigeria.
            </p>
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-accent text-accent-foreground font-sans font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Explore Resources <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimateOnScroll>
        </div>
      </section>

      {/* News */}
      <section className="py-20 px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-2">Updates</p>
              <h2 className="text-3xl font-bold">Latest News</h2>
              <div className="section-divider mt-3" />
            </div>
            <Link to="/news" className="hidden md:flex items-center gap-1 font-sans text-sm text-accent link-underline">
              All news <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </AnimateOnScroll>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {newsItems.slice(0, 3).map((item, i) => (
            <AnimateOnScroll key={item.title} delay={i * 0.1}>
              <article className="group cursor-pointer">
                <div className="h-52 rounded-xl bg-muted overflow-hidden mb-4 img-zoom">
                  <img
                    src={i === 0 ? hospitalImg : i === 1 ? diagnosticsImg : teamImg}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-sans uppercase tracking-widest text-accent font-medium">{item.category}</span>
                  <span className="text-xs font-sans text-muted-foreground">{item.date}</span>
                </div>
                <h3 className="font-serif font-semibold text-lg text-foreground mb-2 group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-2">{item.excerpt}</p>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-12 px-8 lg:px-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-sans text-primary-foreground font-semibold mb-3">Iwosan Innovation Hub</h4>
            <p className="text-sm font-sans text-primary-foreground/50 leading-relaxed">
              Your centralized digital hub for healthcare excellence,
              innovation, and collaboration.
            </p>
          </div>
          <div>
            <h4 className="font-sans text-primary-foreground font-semibold mb-3">Quick Links</h4>
            <div className="space-y-2">
              {["/about", "/subsidiaries", "/resources", "/news"].map((url) => (
                <Link key={url} to={url} className="block text-sm font-sans text-primary-foreground/50 hover:text-accent transition-colors">
                  {url.replace("/", "").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) || "Home"}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-sans text-primary-foreground font-semibold mb-3">Contact</h4>
            <p className="text-sm font-sans text-primary-foreground/50">
              Lagos, Nigeria<br />
              info@iwosanhealth.com
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-primary-foreground/10">
          <p className="text-xs font-sans text-primary-foreground/30 text-center">
            © {new Date().getFullYear()}  Iwosan Healthcare Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </HubLayout>
  );
};

export default Index;
