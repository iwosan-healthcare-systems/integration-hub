import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leadership } from "@/data/hub-data";
import { Seo } from "@/components/Seo";
const LeadershipPage = () => {
  const categories = [
    {
      value: "boardMembers",
      title: "Board Members",
      description: "Guiding strategy, oversight and governance for Iwosan's next phase of growth.",
      items: leadership.boardMembers,
    },
    {
      value: "management",
      title: "Management",
      description: "Operational leaders committed to building systems, culture and performance across the business.",
      items: leadership.management,
    },
    {
      value: "medicalAdvisoryCouncil",
      title: "Medical Advisory Council",
      description: "Medical leaders advising on clinical quality, safety and innovation across our hospitals.",
      items: leadership.medicalAdvisoryCouncil,
    },
  ];

  return (
    <>
      <Seo
        title="Leadership"
        description="Meet our board members, management team, and medical advisory council driving Iwosan's healthcare mission."
        path="/leadership"
      />

      <section className="relative bg-leadership-header min-h-[260px] sm:min-h-[300px] flex items-center py-16 sm:py-20 px-6 sm:px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 bg-leadership-header opacity-90" />
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.24em] text-accent text-xs font-semibold mb-3">Our Team</p>
            <h1 className="text-3xl sm:text-4xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
              Meet Our Industry Leaders
            </h1>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
        <AnimateOnScroll>
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="font-sans text-muted-foreground text-base sm:text-lg leading-relaxed">
              Our Leadership team comprises renowned and highly accomplished business and clinical professionals who have built visionary business and practices and are unreservedly passionate about healthcare development in Africa.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="space-y-8">
          <Tabs defaultValue="boardMembers">
            <TabsList className="justify-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-1 shadow-sm mb-10">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.value}
                  value={category.value}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-white hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent/20 data-[state=active]:to-secondary/20 data-[state=active]:text-accent"
                >
                  {category.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category.value} value={category.value}>
                <AnimateOnScroll>
                  <div className="space-y-6 pt-6">
                    <div className="space-y-3 mb-4 text-center md:text-left">
                      <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{category.title}</h2>
                      <p className="mx-auto max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed md:mx-0">
                        {category.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                      {category.items.map((member, i) => (
                        <AnimateOnScroll key={member.name} delay={i * 0.08}>
                          <div className="group text-center px-2 py-3 transition-transform duration-300 hover:-translate-y-1">
                            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-slate-100 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)] sm:h-32 sm:w-32">
                              {member.image ? (
                                <img
                                  src={member.image}
                                  alt={member.name}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-secondary">
                                  <span className="text-lg sm:text-2xl font-serif font-bold text-accent-foreground">
                                    {member.name.split(" ").map((n) => n[0]).join("")}
                                  </span>
                                </div>
                              )}
                            </div>
                            <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2 group-hover:text-accent transition-colors">
                              {member.name}
                            </h3>
                            <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-snug">
                              {member.role}
                            </p>
                          </div>
                        </AnimateOnScroll>
                      ))}
                    </div>
                  </div>
                </AnimateOnScroll>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

    </>
  );
};

export default LeadershipPage;
