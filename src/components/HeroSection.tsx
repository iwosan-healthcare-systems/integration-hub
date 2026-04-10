import heroBanner from "@/assets/hero-banner.jpg";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-xl mx-4 mt-4">
      <div className="absolute inset-0">
        <img src={heroBanner} alt="Iwosan Innovation Hub" className="w-full h-full object-cover" width={1920} height={800} />
        <div className="absolute inset-0 gradient-hero opacity-80" />
      </div>
      <div className="relative z-10 px-8 py-16 lg:py-20 lg:px-12">
        <div className="max-w-2xl">
          <span className="hub-badge mb-4 inline-block">Welcome to the Hub</span>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
            Iwosan Innovation Hub
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-xl mb-6">
            Your centralized digital hub for tools, resources, and everything Iwosan.
            Transforming Nigeria into a global healthcare frontier.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/about" className="inline-flex items-center px-5 py-2.5 rounded-lg gradient-accent text-accent-foreground font-medium text-sm transition-all hover:opacity-90">
              Explore Hub
            </a>
            <a href="/news" className="inline-flex items-center px-5 py-2.5 rounded-lg border border-primary-foreground/30 text-primary-foreground font-medium text-sm hover:bg-primary-foreground/10 transition-all">
              Latest News
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
