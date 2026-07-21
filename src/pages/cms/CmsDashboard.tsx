import { useNavigate } from 'react-router-dom';
import { Newspaper, BookOpen, CalendarDays, GraduationCap, Images } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
  {
    to: '/cms/news',
    icon: Newspaper,
    label: 'News & Announcements',
    description: 'Add, edit, or remove news articles and announcements shown on the hub.',
    color: 'text-blue-600 bg-blue-500/10',
  },
  {
    to: '/cms/courses',
    icon: BookOpen,
    label: 'Courses',
    description: 'Manage the Learning Centre course catalogue — titles, categories, levels, and details.',
    color: 'text-green-600 bg-green-500/10',
  },
  {
    to: '/cms/sessions',
    icon: CalendarDays,
    label: 'Live Sessions',
    description: 'Schedule and update upcoming live training and meeting sessions.',
    color: 'text-orange-600 bg-orange-500/10',
  },
  {
    to: '/cms/learning-paths',
    icon: GraduationCap,
    label: 'Learning Paths',
    description: 'Curate structured learning paths that group courses for specific audiences.',
    color: 'text-purple-600 bg-purple-500/10',
  },
  {
    to: '/cms/picture-library',
    icon: Images,
    label: 'Picture Library',
    description: 'Upload and organize pictures — with titles and descriptions — for the Picture Library page.',
    color: 'text-pink-600 bg-pink-500/10',
  },
];

export default function CmsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Content Manager</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the dynamic content shown across the Iwosan Innovation Hub.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ to, icon: Icon, label, description, color }) => (
          <Card
            key={to}
            className="border-border/60 cursor-pointer hover:border-accent/50 hover:shadow-sm transition-all"
            onClick={() => navigate(to)}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
