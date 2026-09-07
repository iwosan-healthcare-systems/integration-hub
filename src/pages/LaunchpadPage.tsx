import { Heart, ShieldCheck, BookOpen, Lightbulb, Accessibility, Sparkles, ArrowRight, Rocket, Users, Wallet } from 'lucide-react';
import { LaunchpadShell, SubmitLink } from '@/components/launchpad/LaunchpadShared';
import { LaunchpadReveal } from '@/components/launchpad/LaunchpadMotion';
import { Seo } from '@/components/Seo';

const values = [
  { name: 'Empathetic', icon: Heart, text: 'Kinder for patients, families and colleagues.', example: 'A quiet space. A little more dignity.', detail: 'Refurbish a quiet or bereavement room for grieving families.', impact: 'Privacy & dignity', amount: '₦80,000', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', tint: 'from-rose-100/70 dark:from-rose-950/30' },
  { name: 'Ethical', icon: ShieldCheck, text: 'Greater integrity, safety and responsibility.', example: 'Small habits. A cleaner ward.', detail: 'Pilot recycling and waste segregation with your ward team.', impact: 'Sustainability & compliance', amount: '₦60,000', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', tint: 'from-emerald-100/70 dark:from-emerald-950/30' },
  { name: 'Knowledge-driven', icon: BookOpen, text: 'Learn, share and use evidence to do better.', example: 'One lunch. A shared lesson.', detail: 'Bring colleagues together for a cross-facility Lunch & Learn series.', impact: 'Shared learning across sites', amount: '₦30,000', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', tint: 'from-violet-100/70 dark:from-violet-950/30' },
  { name: 'Innovative', icon: Lightbulb, text: 'Redesign a process or use tech to work smarter.', example: 'A timely reminder. Better attendance.', detail: 'Send SMS or WhatsApp appointment reminders to help patients attend.', impact: 'Fewer missed appointments', amount: '₦95,000', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', tint: 'from-amber-100/70 dark:from-amber-950/30' },
  { name: 'Accessible', icon: Accessibility, text: 'Make our care easier to reach and navigate.', example: 'Clear words. More confident patients.', detail: 'Create discharge sheets in English, Yoruba and Pidgin.', impact: 'Patient understanding & safety', amount: '₦45,000', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300', tint: 'from-sky-100/70 dark:from-sky-950/30' },
];
const steps = [
  ['Prepare', 'Develop your idea and secure your line manager’s backing, with your MD/CEO aware.'],
  ['Submit', 'Describe the problem, the process you will improve, your pilot and the funding you need.'],
  ['MD/CEO approval', 'Your MD/CEO reviews, approves and funds the idea from your entity’s budget.'],
  ['Guidance', 'Before funds are released, the Group Panel advises, challenges assumptions and logs the idea.'],
  ['You deliver', 'The idea owner leads the pilot, measures results and accounts for the funds.'],
  ['Scale', 'Retain or retire the pilot, then package proven ideas for other facilities to adopt.'],
];

export default function LaunchpadPage() {
  return <LaunchpadShell>
    <Seo path="/launchpad" title="LaunchPad" description="Turn your idea into an employee-led improvement at Iwosan." />
    <section className="lp-enter relative isolate overflow-hidden rounded-[2rem] bg-primary text-primary-foreground p-7 sm:p-12">
      <div className="lp-hero-glow pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-cyan-300/10 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-72 w-72 rounded-full border-[36px] border-white/5" aria-hidden="true" />
      <div className="relative max-w-2xl space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[10px] sm:text-xs uppercase tracking-[.18em] font-semibold text-cyan-200"><Sparkles className="h-4 w-4" /> Group innovation framework</p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight">The people closest to the problem <span className="text-cyan-200">can change it.</span></h1>
        <p className="text-base sm:text-lg text-white/85 leading-relaxed">LaunchPad gives Iwosan employees the support to turn practical ideas into better care. Develop your idea, secure backing and lead delivery, with funding from your facility and guidance from the Group Panel.</p>
        <div className="flex items-center gap-3 border-t border-white/15 pt-5"><Rocket className="h-5 w-5 text-cyan-200 shrink-0" /><p className="font-medium text-cyan-200">The idea stays with you, from start to finish.</p></div>
      </div>
    </section>

    <section aria-labelledby="values-heading" className="space-y-5 py-3">
      <LaunchpadReveal><p className="text-accent text-xs font-bold uppercase tracking-widest">Start with a value</p><h2 id="values-heading" className="text-2xl font-bold mt-2">Every idea improves a process.</h2></LaunchpadReveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">{values.map((v, i) => <LaunchpadReveal key={v.name} delay={i * 65} className="h-full"><article className="lp-card h-full rounded-2xl border bg-card p-5 space-y-4"><span className={`lp-card-icon inline-flex rounded-xl p-3 ${v.color}`}><v.icon className="h-5 w-5" /></span><h3 className="text-sm font-semibold">{v.name}</h3><p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p></article></LaunchpadReveal>)}</div>
    </section>

    <section aria-labelledby="steps-heading" className="space-y-5 py-3">
      <LaunchpadReveal><p className="text-accent text-xs font-bold uppercase tracking-widest">Your journey</p><h2 id="steps-heading" className="text-2xl font-bold mt-2">From idea to delivery</h2></LaunchpadReveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{steps.map(([title, text], i) => <LaunchpadReveal key={title} delay={(i % 3) * 75} className="h-full"><article className="lp-card h-full rounded-2xl border border-border/60 bg-muted/30 p-6"><div className="flex items-center justify-between mb-5"><span className="text-3xl font-bold text-accent/60">0{i + 1}</span><ArrowRight className="h-4 w-4 text-muted-foreground/40" /></div><h3 className="font-semibold mb-2">{title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{text}</p></article></LaunchpadReveal>)}</div>
    </section>

    <div className="grid md:grid-cols-2 gap-5 py-3">
      <LaunchpadReveal className="h-full"><section className="h-full rounded-3xl border p-7 space-y-4"><Users className="h-7 w-7 text-accent" /><h2 className="text-xl font-bold">Guidance from across Iwosan</h2><p className="text-sm text-muted-foreground leading-relaxed">An eight-person Group Panel brings together four group representatives and four members from across the entities. It advises, identifies overlaps and raises concerns. Your entity’s MD/CEO remains the approving authority.</p><p className="text-sm text-muted-foreground">Project management training will support team members who would like guidance.</p></section></LaunchpadReveal>
      <LaunchpadReveal delay={100} className="h-full"><section className="h-full rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-7 space-y-4"><div className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-5 w-5 text-accent" /> Funding per idea</div><p className="text-4xl font-bold">Up to ₦100,000</p><p className="text-sm text-muted-foreground leading-relaxed">Funded by your entity from its own budget. The programme’s pilot fund is ₦2 million, with Lagoon, Paelon, Euracare, Iwosan Wellness and Iwosan Healthcare Systems participating.</p><p className="text-sm text-muted-foreground">Pilots run in quarterly cycles. Approval is tracked by the LaunchPad Programme.</p></section></LaunchpadReveal>
    </div>

    <section aria-labelledby="ideas-heading" className="rounded-[2rem] border border-accent/10 bg-gradient-to-b from-accent/5 via-muted/30 to-transparent p-5 sm:p-8 space-y-7">
      <LaunchpadReveal><div className="max-w-2xl space-y-3"><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><Lightbulb className="h-4 w-4" /> A little inspiration</p><h2 id="ideas-heading" className="text-2xl sm:text-3xl font-bold leading-tight">Small and simple ideas<br className="hidden sm:block" /> count, too.</h2><p className="text-muted-foreground leading-relaxed">You do not need a technical or ambitious project to make a difference. Start with something you see every day.</p></div></LaunchpadReveal>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {values.map((v, i) => <LaunchpadReveal key={v.name} delay={(i % 3) * 80} className="h-full"><article className={`lp-card relative h-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br ${v.tint} to-card p-4 flex flex-col`}>
          <div className="flex items-start justify-between gap-3 mb-3"><span className={`lp-card-icon rounded-xl p-2 ${v.color}`}><v.icon className="h-5 w-5" /></span><span className="text-[10px] uppercase tracking-widest text-muted-foreground pt-2">Idea 0{i + 1}</span></div>
          <p className={`self-start rounded-full px-2.5 py-1 text-[10px] font-semibold mb-2 ${v.color}`}>{v.name}</p>
          <h3 className="font-bold text-sm leading-snug mb-2">{v.example}</h3><p className="text-xs text-muted-foreground leading-relaxed mb-3">{v.detail}</p>
          <div className="mt-auto border-t border-foreground/10 pt-3"><p className="text-[11px] text-muted-foreground mb-2">{v.impact}</p><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Illustrative budget</span><span className="font-bold text-sm">{v.amount}</span></div></div>
        </article></LaunchpadReveal>)}
        <LaunchpadReveal delay={160} className="h-full"><article className="lp-card h-full min-h-52 rounded-2xl border border-dashed border-accent/50 bg-card/60 p-4 flex flex-col justify-between gap-3"><span className="lp-card-icon inline-flex self-start rounded-xl bg-accent/10 p-2 text-accent"><Sparkles className="h-5 w-5" /></span><div><p className="text-xs text-accent font-semibold mb-2">The next idea could be yours</p><h3 className="text-lg font-bold mb-2">What could work<br />in your team?</h3><p className="text-xs text-muted-foreground">One observation. One practical change. A place to begin.</p></div></article></LaunchpadReveal>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">Amounts are illustrative. Every idea is capped at ₦100,000. The pilot programme funds up to four ideas per entity; you can submit more than one idea.</p>
    </section>

    <LaunchpadReveal><section className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-7 sm:p-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"><div><p className="text-xs uppercase tracking-widest text-cyan-200 mb-3">Make your first move</p><h2 className="text-2xl font-bold">What would you change?</h2><p className="text-white/75 mt-2">One simple form is all it takes to start.</p></div><div className="rounded-xl bg-white/10 p-2"><SubmitLink /></div></section></LaunchpadReveal>
  </LaunchpadShell>;
}
