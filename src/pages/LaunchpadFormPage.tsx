import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Send, Sparkles, UserRound, CircleHelp, Lightbulb, FlaskConical, Flag, MessageCircle, CalendarDays, Wallet, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { entityName } from '@/lib/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShared';
import { LaunchpadReveal } from '@/components/launchpad/LaunchpadMotion';
import { Seo } from '@/components/Seo';
import { submitIdea, LAUNCHPAD_VALUES, type IdeaAnswers } from '@/services/launchpadService';
const formSections = [
  { title: 'About you', icon: UserRound, hint: 'The people behind the idea.' },
  { title: 'The problem', icon: CircleHelp, hint: 'Start with what you have noticed.' },
  { title: 'Your idea', icon: Lightbulb, hint: 'Describe the change you would like to make.' },
  { title: 'The pilot', icon: FlaskConical, hint: 'A small test with a clear measure of success.' },
  { title: 'Ownership and approval', icon: Flag, hint: 'Confirm who will lead the way.' },
];
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  const { icon: Icon, hint } = formSections[number - 1];
  return <fieldset id={`idea-section-${number}`} className="lp-form-section rounded-3xl border bg-card p-5 sm:p-7 space-y-5 shadow-sm">
    <legend className="px-2 text-base font-semibold"><span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs">0{number}</span>{title}</legend>
    <p className="flex items-center gap-2 text-xs text-muted-foreground pb-4 border-b"><Icon className="h-4 w-4 shrink-0 text-accent" />{hint}</p>
    {children}
  </fieldset>;
}
function Field({ name, label, long = false, required = true, maxLength = 200, ...props }: { name: string; label: string; long?: boolean; required?: boolean; maxLength?: number } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}{required ? <span className="text-destructive"> *</span> : ' (optional)'}</Label>{long ? <Textarea id={name} name={name} required={required} maxLength={maxLength} rows={4} /> : <Input id={name} name={name} required={required} maxLength={maxLength} {...props} />}</div>;
}
export default function LaunchpadFormPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const client = useQueryClient();
  const [values,setValues] = useState<string[]>([]); const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [startDate,setStartDate] = useState('');
  const sending = useRef(false); const errorRef = useRef<HTMLDivElement>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (sending.current) return;
    const data = new FormData(event.currentTarget); const text = (key: string) => String(data.get(key) ?? '').trim();
    const answers: IdeaAnswers = { department:text('department'), managerName:text('managerName'), managerEmail:text('managerEmail'), problem:text('problem'), idea:text('idea'), testPlan:text('testPlan'), measurement:text('measurement'), risks:text('risks'), owner:text('owner'), values, funding:Number(data.get('funding')), startDate:text('startDate'), endDate:text('endDate'), managerSupported:data.get('managerSupported')==='yes' };
    sending.current=true; setBusy(true); setError('');
    try { const result = await submitIdea(answers); await client.invalidateQueries({queryKey:['launchpad']}); navigate('/launchpad/history', { state:{submitted:result.submission.reference} }); }
    catch(e) { setError(e instanceof Error ? e.message : 'Unable to submit. Please try again.'); requestAnimationFrame(()=>errorRef.current?.focus()); }
    finally { sending.current=false; setBusy(false); }
  };
  return <LaunchpadShell><Seo path="/launchpad/submit" title="Submit an idea | LaunchPad" description="Share your idea for a better Iwosan." /><div className="max-w-3xl mx-auto space-y-6">
    <header className="lp-enter relative overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-accent/10 via-card to-card p-6 sm:p-8 space-y-4">
      <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"><Sparkles className="h-4 w-4" /> A better Iwosan starts with you</span>
      <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Give your idea<br />a starting point.</h1>
      <p className="text-muted-foreground leading-relaxed max-w-xl">Five short sections. Tell us what you would change and how you would test it.</p>
    </header>
    <LaunchpadReveal><aside className="overflow-hidden rounded-3xl border border-accent/25 shadow-sm">
      <div className="bg-primary text-primary-foreground p-6 sm:p-7 space-y-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200"><Lightbulb className="h-4 w-4" /> A worked example</p><h2 className="font-bold text-xl">Small and simple ideas count.</h2><p className="text-sm text-white/75">Here is what one practical improvement could look like.</p></div>
      <div className="bg-card p-6 sm:p-7 space-y-5"><div className="grid sm:grid-cols-2 gap-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">The problem</p><p className="text-sm font-medium">Patients miss appointments.</p></div><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent mb-2"><MessageCircle className="h-3.5 w-3.5" /> The idea</p><p className="text-sm font-medium">SMS/WhatsApp appointment reminders.</p></div></div>
        <dl className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-muted/50 p-4"><CalendarDays className="h-4 w-4 text-accent mb-2" /><dt className="text-xs text-muted-foreground">Pilot duration</dt><dd className="text-lg font-bold mt-1">8 weeks</dd></div><div className="rounded-2xl bg-muted/50 p-4"><Wallet className="h-4 w-4 text-accent mb-2" /><dt className="text-xs text-muted-foreground">Pilot budget</dt><dd className="text-lg font-bold mt-1">?95,000</dd></div></dl>
        <div className="flex gap-3 items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><TrendingDown className="h-7 w-7 text-emerald-600 shrink-0" /><div><p className="text-xs text-muted-foreground">How we will know it worked</p><p className="font-semibold text-sm mt-1">No-show rate down 20%.</p></div></div>
      </div>
    </aside></LaunchpadReveal>
    <p className="text-sm text-muted-foreground">Fields marked <span className="text-destructive">*</span> are required. You can submit another idea after completing this form.</p>
    <form onSubmit={submit} className="space-y-7">
      <Section number={1} title="About you"><div className="rounded-2xl border border-accent/15 bg-accent/5 p-5"><p className="flex items-center gap-2 text-xs text-muted-foreground mb-4"><CheckCircle2 className="h-4 w-4 text-accent shrink-0" />Automatically captured from your signed-in account</p><dl className="grid sm:grid-cols-2 gap-3 text-sm">{[['Name',user?.name],['Entity',entityName(user?.entity)],['Email',user?.email]].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-muted-foreground text-xs">{label}</dt><dd className="font-medium break-words">{value}</dd></div>)}</dl>{!user?.entity && <p className="text-xs text-muted-foreground mt-3">Your entity is unassigned. Contact an administrator to update your account.</p>}</div><Field name="department" label="Department"/><div className="grid sm:grid-cols-2 gap-4"><Field name="managerName" label="Line manager’s name"/><Field name="managerEmail" label="Line manager’s email" type="email" maxLength={254}/></div></Section>
      <Section number={2} title="The problem"><Field name="problem" label="What problem are you trying to solve, and who does it affect?" long maxLength={5000}/></Section>
      <Section number={3} title="Your idea"><Field name="idea" label="What would you like to change?" long maxLength={5000}/><div className="space-y-2"><Label id="values-label">Which Iwosan value does it support? <span className="text-destructive">*</span></Label><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-labelledby="values-label values-selected" className="w-full justify-between h-auto min-h-10 whitespace-normal text-left"><span id="values-selected">{values.length ? values.join(', ') : 'Select one or more values'}</span><ChevronDown className="h-4 w-4 shrink-0 ml-2"/></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{LAUNCHPAD_VALUES.map(value=><DropdownMenuCheckboxItem key={value} checked={values.includes(value)} onSelect={event=>event.preventDefault()} onCheckedChange={checked=>setValues(prev=>checked ? [...prev,value] : prev.filter(v=>v!==value))}>{value}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu><p className="text-xs text-muted-foreground">Choose all values that apply.</p></div></Section>
      <Section number={4} title="The pilot"><Field name="testPlan" label="Where and with whom will you test it?" long maxLength={5000}/><div><Field name="funding" label="How much funding do you need? (₦)" type="number" min={0} max={100000} step="0.01" aria-describedby="funding-help"/><p id="funding-help" className="text-sm text-accent mt-2 font-medium">The funding cap is ₦100,000 per idea.</p></div><div className="space-y-2"><p className="text-sm font-medium">When will the pilot start and end?</p><div className="grid sm:grid-cols-2 gap-4"><Field name="startDate" label="Pilot start" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/><Field name="endDate" label="Pilot end" type="date" min={startDate || undefined}/></div></div><Field name="measurement" label="How will you know it worked? Tell us what you will measure and the result you are aiming for." maxLength={500}/><Field name="risks" label="What could prevent the pilot from working?" long required={false} maxLength={5000}/></Section>
      <Section number={5} title="Ownership and approval"><Field name="owner" label="Who will be responsible for delivering the pilot?" defaultValue={user?.name ?? ''}/><p className="text-xs text-muted-foreground">Your name is prefilled. Change it if someone else will deliver the pilot.</p><fieldset className="space-y-3"><legend className="text-sm font-medium mb-2">Has your line manager seen and supported this idea? <span className="text-destructive">*</span></legend><div className="flex gap-6">{['yes','no'].map(value=><label key={value} className="flex items-center gap-2 rounded-xl border px-5 py-3 text-sm cursor-pointer transition-colors hover:border-accent/50 has-[:checked]:bg-accent/10 has-[:checked]:border-accent/50"><input className="h-4 w-4 accent-current" type="radio" name="managerSupported" value={value} required/>{value==='yes'?'Yes':'No'}</label>)}</div></fieldset></Section>
      {error && <div role="alert" tabIndex={-1} ref={errorRef} className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between rounded-2xl border bg-muted/30 p-5"><p className="text-xs text-muted-foreground">Your submission will receive a reference number.<br/>Track progress in My submissions.</p><Button type="submit" size="lg" disabled={busy}><Send className="h-4 w-4 mr-2"/>{busy?'Submitting…':'Submit idea'}</Button></div>
    </form></div></LaunchpadShell>;
}
