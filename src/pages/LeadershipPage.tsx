import { HubLayout } from "@/layouts/HubLayout";
import { leadershipTeam } from "@/data/hub-data";
import { User } from "lucide-react";

const LeadershipPage = () => {
  return (
    <HubLayout>
      <div className="hub-section max-w-5xl mx-auto">
        <span className="hub-badge mb-3 inline-block">Our Team</span>
        <h1 className="text-3xl font-bold mb-2">Leadership</h1>
        <p className="text-muted-foreground mb-8">Meet the people driving Iwosan's mission to transform healthcare in Nigeria.</p>

        <div className="grid sm:grid-cols-2 gap-6">
          {leadershipTeam.map((member) => (
            <div key={member.name} className="hub-card p-6 flex gap-4">
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <User className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">{member.name}</h3>
                <p className="text-sm text-accent font-medium mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </HubLayout>
  );
};

export default LeadershipPage;
