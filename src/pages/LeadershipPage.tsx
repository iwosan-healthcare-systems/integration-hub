import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { leadershipTeam } from "@/data/hub-data";
const LeadershipPage = () => {
  return (
    <>

      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-leadership-header" />
        <div className="relative z-10 px-6 sm:px-8 lg:px-16 pb-10 md:pb-12">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Our Team</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground">Leadership</h1>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-6 sm:px-8 lg:px-16 max-w-5xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            Meet the people driving Iwosan's mission to transform healthcare delivery in Nigeria
            with innovation, excellence, and compassion.
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {leadershipTeam.map((member, i) => (
            <AnimateOnScroll key={member.name} delay={i * 0.1}>
              <div className="group text-center">
                <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300 mb-4">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                      <span className="text-2xl font-serif font-bold text-accent-foreground">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="font-serif font-semibold text-lg text-foreground mb-1 group-hover:text-accent transition-colors">
                  {member.name}
                </h3>
                <p className="font-sans text-sm text-accent font-medium">{member.role}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

    </>
  );
};

export default LeadershipPage;
