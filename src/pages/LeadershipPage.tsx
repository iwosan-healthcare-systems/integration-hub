import { HubLayout } from "@/layouts/HubLayout";
import { AnimateOnScroll } from "@/hooks/useScrollAnimation";
import { leadershipTeam } from "@/data/hub-data";
import teamImg from "@/assets/team-photo.jpg";

const LeadershipPage = () => {
  return (
    <HubLayout>
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img src={teamImg} alt="Leadership" className="w-full h-full object-cover" />
          <div className="overlay-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 px-8 lg:px-16 pb-12">
          <AnimateOnScroll>
            <p className="font-sans uppercase tracking-[0.2em] text-accent text-xs font-medium mb-3">Our Team</p>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground">Leadership</h1>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-20 px-8 lg:px-16 max-w-5xl mx-auto">
        <AnimateOnScroll>
          <p className="font-sans text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            Meet the people driving Iwosan's mission to transform healthcare delivery in Nigeria
            with innovation, excellence, and compassion.
          </p>
        </AnimateOnScroll>

        <div className="space-y-12">
          {leadershipTeam.map((member, i) => (
            <AnimateOnScroll key={member.name} delay={i * 0.12} direction={i % 2 === 0 ? "left" : "right"}>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shrink-0">
                  <span className="text-2xl font-serif font-bold text-accent-foreground">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-xl text-foreground">{member.name}</h3>
                  <p className="font-sans text-sm text-accent font-medium mb-3">{member.role}</p>
                  <p className="font-sans text-muted-foreground leading-relaxed max-w-lg">{member.bio}</p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </section>
    </HubLayout>
  );
};

export default LeadershipPage;
