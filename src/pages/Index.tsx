import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { ArrowRight, Heart, Stethoscope, BookOpen, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import heroBannerMobileImg from "@/assets/hero-hub-mobile.webp";
import heroBannerDesktopImg from "@/assets/hero-hub-desktop.webp";
import teamImg from "@/assets/team-photo.webp";
import innovationImg from "@/assets/innovation-bg.webp";
import { subsidiaries } from "@/data/hub-data";
import { getNews, type NewsItem } from "@/services/cmsService";
import { Seo } from "@/components/Seo";

const faqs = [
  {
    question: "What is the Iwosan Integration Hub?",
    answer: "The Iwosan Integration Hub is a centralized digital platform that connects all Iwosan Healthcare Systems subsidiaries — providing a unified space for tools, resources, healthcare collaboration, and information across the Iwosan network.",
  },
  {
    question: "Which hospitals and platforms are part of the Iwosan network?",
    answer: "The Iwosan network currently comprises Iwosan Lagoon Hospitals, Eurapharma Care Services (Euracare), Paelon Memorial Hospital, and IASO Medipark — each specializing in different aspects of healthcare delivery across Lagos, Nigeria.",
  },
  {
    question: "Where are Iwosan's facilities located?",
    answer: "Iwosan's facilities are located across Lagos, Nigeria, with hospitals and care centres in Ikoyi, Ikeja, Victoria Island, Ikoyi, and Alaro City. The network continues to expand its footprint to improve access to quality healthcare.",
  },
  {
    question: "How long has Iwosan been operating in Nigeria?",
    answer: "Iwosan Investments Limited was co-founded in 2019 and went on to acquire other subsidiaries along the way. In 2026, the group rebranded as Iwosan Healthcare Systems Limited to reflect its expanded focus on healthcare delivery and management across Nigeria. The network's hospitals have a combined history of over 40 years of healthcare excellence in the region.",
  },
  {
    question: "Is Iwosan Lagoon Hospitals internationally accredited?",
    answer: "Yes. Iwosan Lagoon Hospitals has earned the Joint Commission International (JCI) Gold Seal of Approval five consecutive times, making it one of the most accredited hospitals in Sub-Saharan Africa and the first hospital in the region to achieve JCI accreditation.",
  },
  {
    question: "What specialist services does the Iwosan network offer?",
    answer: "Across its network, Iwosan offers a comprehensive range of services including cardiology, neurosurgery, oncology, maternal and child health, emergency care, diagnostics, telemedicine, pharmaceutical care, and multi-specialist outpatient consultations.",
  },
  {
    question: "How can I contact Iwosan Healthcare Systems?",
    answer: "You can reach us by phone at +2349139352779, by email at info@iwosanhealth.com, or by visiting our facility in Lagos. You can also connect with individual subsidiaries through their dedicated websites accessible via the Our Platforms section.",
  },
  {
    question: "What is Iwosan's mission in the Nigerian healthcare landscape?",
    answer: "Iwosan's mission is to transform Nigeria into a global healthcare frontier by raising the standards of healthcare delivery and management in line with global best practices — leveraging institutional partnerships, innovation, and investment to advance healthcare access and quality.",
  },
  {
    question: "Does Iwosan support healthcare professionals and institutions?",
    answer: "Yes. Through the Iwosan Integration Hub, the network supports institutional stakeholders, medical professionals, and healthcare innovators with resources, knowledge-sharing platforms, training, and collaborative opportunities to advance healthcare in Nigeria.",
  },
  {
    question: "How is Iwosan embracing digital healthcare transformation?",
    answer: "Iwosan is actively investing in digital health infrastructure, including electronic health records, telemedicine services, and a connected ecosystem across its subsidiaries. The Iwosan Integration Hub itself is part of this digital transformation drive, serving as a centralized platform for the entire network.",
  },
];

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    getNews().then(({ news }) => {
      if (news) setLatestNews(news.slice(0, 3));
    });
  }, []);

  return (
    <>
      <Seo
        title="Iwosan Integration Hub"
        description="Transforming Nigeria into a global healthcare frontier. Your centralized platform for tools, resources, and collaboration across the Iwosan network."
        path="/"
      />

      {/* Hero */}
      <section className="relative min-h-[88svh] sm:min-h-[82svh] md:min-h-[75vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBannerMobileImg} alt="" className="md:hidden w-full h-full object-cover object-center" fetchPriority="high" loading="eager" decoding="async" />
          <img src={heroBannerDesktopImg} alt="" className="hidden md:block w-full h-full object-cover object-center" fetchPriority="high" loading="eager" decoding="async" />
          <div className="absolute inset-0 bg-primary/75" />
        </div>
        <div className="relative z-10 w-full px-6 sm:px-8 md:px-10 lg:px-16 py-16 md:py-20">
          <div className="max-w-3xl">
            <AnimateOnScroll>
              <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs mb-4 font-medium">
                Welcome to the Hub
              </p>
            </AnimateOnScroll>
            <AnimateOnScroll delay={0.1}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.1] mb-5 md:mb-6">
                Iwosan Integration Hub
              </h1>
            </AnimateOnScroll>
            <AnimateOnScroll delay={0.2}>
              <p className="text-primary-foreground/70 text-base sm:text-lg md:text-xl max-w-xl mb-7 md:mb-8 font-sans leading-relaxed">
                Transforming Nigeria into a global healthcare frontier. Your centralized
                platform for tools, resources, and collaboration.
              </p>
            </AnimateOnScroll>
            <AnimateOnScroll delay={0.3}>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-accent text-accent-foreground font-sans font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Explore <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/subsidiaries"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full border border-primary-foreground/30 text-primary-foreground font-sans font-medium text-sm hover:bg-primary-foreground/10 transition-colors"
                >
                  Our Platforms
                </Link>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-primary py-8">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "40+", label: "Years of Excellence" },
            { value: "4", label: "Locations" },
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
                <div className="h-48 rounded-xl overflow-hidden relative mb-4">
                  <div className={`absolute inset-0 ${sub.logoBg ?? "bg-white"}`} />
                  <img
                    src={sub.logo}
                    alt={sub.name}
                    className="absolute inset-0 w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500 z-10"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/10 to-transparent z-20" />
                  <div className="absolute bottom-4 left-4 right-4 z-30">
                    <h3 className="text-primary-foreground font-serif font-semibold text-lg drop-shadow">{sub.name}</h3>
                  </div>
                </div>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{sub.description}</p>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
        <div className="md:hidden mt-8 text-center">
          <Link to="/subsidiaries" className="inline-flex items-center gap-1 font-sans text-sm text-accent link-underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
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
          {latestNews.map((item, i) => (
            <AnimateOnScroll key={item.id} delay={i * 0.1}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="h-52 rounded-xl bg-muted overflow-hidden mb-4 img-zoom">
                  <img
                    src={item.image}
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
              </a>
            </AnimateOnScroll>
          ))}
        </div>
        <div className="md:hidden mt-8 text-center">
          <Link to="/news" className="inline-flex items-center gap-1 font-sans text-sm text-accent link-underline">
            All news <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-3xl mx-auto px-8 lg:px-16">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">FAQ</p>
              <h2 className="text-3xl font-bold mb-3">Frequently Asked Questions</h2>
              <div className="section-divider mx-auto mt-3" />
            </div>
          </AnimateOnScroll>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <AnimateOnScroll key={i} delay={i * 0.05}>
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i ? "true" : "false"}
                  >
                    <span className="font-serif font-semibold text-base text-foreground leading-snug">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-accent shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-96" : "max-h-0"}`}
                  >
                    <p className="px-6 pb-5 text-sm font-sans text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

    </>
  );
};

export default Index;
