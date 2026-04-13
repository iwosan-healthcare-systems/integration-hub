import { Building2, Heart, Stethoscope, Users, FileText, BookOpen, GraduationCap, Newspaper, Bell, TrendingUp } from "lucide-react";
import iwosanLogo from "@/assets/iwosan-logo.png";
import lagoonLogo from "@/assets/logos/lagoon-logo.png";
import paelonLogo from "@/assets/logos/paelon-logo.png";
import iasoLogo from "@/assets/logos/iaso-logo.png";
import euracareLogo from "@/assets/logos/euracare-logo.svg";

export const coreValues = [
  {
    title: "Empathetic",
    description: "We take great care to understand the needs, pains, thoughts and feelings of our patients and put ourselves in their shoes to deliver appropriate care.",
    icon: "Heart",
  },
  {
    title: "Ethical",
    description: "We are committed to the tenets of moral and professional principles — Beneficence, Non-Maleficence, Autonomy, and Justice guide our medical practice.",
    icon: "Shield",
  },
  {
    title: "Knowledge-driven",
    description: "We keep up to date with recent trends in healthcare, enabling our team of highly skilled professionals to provide excellent healthcare services.",
    icon: "BookOpen",
  },
  {
    title: "Innovative",
    description: "We consistently stay ahead of the curve by offering world-class healthcare services, adopting new technology, and rewarding ingenuity.",
    icon: "Lightbulb",
  },
  {
    title: "Accessible",
    description: "We are friendly, welcoming, approachable, and reachable. Our customers can reach us at any time and receive top quality healthcare services.",
    icon: "Globe",
  },
];

export const subsidiaries = [
  {
    name: "Iwosan Healthcare Systems Limited",
    description: "Parent company and lead promoter of the Iwosan network, delivering integrated healthcare operations, digital health platforms, and strategic Nigerian partnerships.",
    category: "Corporate",
    url: "https://www.iwosanhealth.com",
    color: "primary",
    logo: iwosanLogo,
  },
  {
    name: "Iwosan Lagoon Hospitals Limited",
    description: "Premier multi-specialty hospital in Lagos offering world-class inpatient, outpatient, emergency, and specialist care.",
    category: "Hospital",
    url: "https://www.lagoonhospitals.com",
    color: "accent",
    logo: lagoonLogo,
  },
  {
    name: "Eurapharma Care Services Nigeria Limited",
    description: "Healthcare services and pharmaceutical care provider delivering medical supply solutions and patient support services across Nigeria.",
    category: "Healthcare Services",
    url: "https://www.euracare.com.ng",
    color: "primary",
    logo: euracareLogo,
  },
  {
    name: "Paelon Memorial Hospital Limited",
    description: "Specialist hospital focused on emergency care, maternal health, diagnostics, and patient-centered clinical services.",
    category: "Hospital",
    url: "https://www.paelonhospital.com",
    color: "accent",
    logo: paelonLogo,
  },
  {
    name: "IASO Medipark Limited",
    description: "A 140-bed integrated multi-specialty medical campus in Ikoyi, Lagos, offering hospital care, diagnostics, training, and a modern healthcare ecosystem.",
    category: "Medical Campus",
    url: "https://www.iasomedipark.com",
    color: "primary",
    logo: iasoLogo,
  },
];

export const leadershipTeam = [
  {
    name: "Fola Laoye",
    role: "Group Managing Director / CEO",
    bio: "Visionary leader driving Iwosan's mission to transform healthcare delivery in Nigeria with global best practices.",
  },
  {
    name: "Dr. Tokunbo Shitta-Bey",
    role: "Chief Medical Director",
    bio: "Experienced medical professional overseeing clinical excellence and patient care standards across all facilities.",
  },
  {
    name: "Adebayo Ogunlesi",
    role: "Chief Operating Officer",
    bio: "Strategic operations leader ensuring seamless service delivery and organizational efficiency.",
  },
  {
    name: "Funmi Adeyemi",
    role: "Chief Financial Officer",
    bio: "Finance expert managing sustainable growth and investment strategies for the healthcare group.",
  },
];

export const resources = [
  {
    title: "Employee Handbook 2024",
    category: "Policies",
    type: "PDF",
    date: "Jan 2024",
    icon: "FileText",
  },
  {
    title: "Clinical Protocols Guide",
    category: "Guidelines",
    type: "PDF",
    date: "Mar 2024",
    icon: "FileText",
  },
  {
    title: "Patient Safety Standards",
    category: "Policies",
    type: "PDF",
    date: "Feb 2024",
    icon: "Shield",
  },
  {
    title: "Healthcare Financing in Nigeria",
    category: "Research",
    type: "PDF",
    date: "2023",
    icon: "TrendingUp",
  },
  {
    title: "Infection Control Training",
    category: "Training",
    type: "Video",
    date: "Apr 2024",
    icon: "GraduationCap",
  },
  {
    title: "IT Security Awareness",
    category: "Training",
    type: "Slides",
    date: "Mar 2024",
    icon: "Shield",
  },
];

export const newsItems = [
  {
    title: "Iwosan Expands Healthcare Services Across Southwest Nigeria",
    excerpt: "The group announces plans to open three new specialist clinics in Lagos, Ibadan, and Abeokuta as part of its expansion strategy.",
    date: "April 5, 2024",
    category: "Expansion",
    featured: true,
  },
  {
    title: "New Partnership with Global Health Organizations",
    excerpt: "Iwosan Healthcare Systems signs MoU with leading international health organizations to improve healthcare standards.",
    date: "March 28, 2024",
    category: "Partnerships",
    featured: false,
  },
  {
    title: "Annual Staff Town Hall Meeting Highlights",
    excerpt: "Key takeaways from the 2024 Town Hall including new benefits, growth plans, and employee recognition awards.",
    date: "March 15, 2024",
    category: "Internal",
    featured: false,
  },
  {
    title: "Iwosan Launches Digital Health Records System",
    excerpt: "State-of-the-art electronic health records system deployed across all facilities for improved patient care coordination.",
    date: "March 1, 2024",
    category: "Technology",
    featured: true,
  },
  {
    title: "Healthcare Excellence Awards 2024",
    excerpt: "Iwosan team members recognized for outstanding contributions to patient care and medical innovation.",
    date: "February 20, 2024",
    category: "Awards",
    featured: false,
  },
  {
    title: "Community Health Outreach Program Success",
    excerpt: "Over 5,000 community members benefited from the quarterly free health screening and vaccination drive.",
    date: "February 10, 2024",
    category: "Community",
    featured: false,
  },
];

export const milestones = [
  { year: "2000", event: "Iwosan Healthcare Systems founded with a vision to transform Nigerian healthcare." },
  { year: "2005", event: "Acquired Lagoon Hospitals, establishing a premier multi-specialty hospital network." },
  { year: "2010", event: "Expanded to five hospital locations across Lagos State." },
  { year: "2015", event: "Launched Iwosan Diagnostics and Pharmacy divisions." },
  { year: "2018", event: "Established partnerships with global healthcare institutions." },
  { year: "2020", event: "Led COVID-19 response efforts across Nigeria." },
  { year: "2023", event: "Launched Innovation Hub to drive digital healthcare transformation." },
  { year: "2024", event: "Expanding services to Southwest Nigeria with new specialist clinics." },
];

export const quickLinks = [
  { title: "Email Portal", url: "https://mail.iwosanhealth.com", icon: "Mail" },
  { title: "HR System", url: "#", icon: "Users" },
  { title: "IT Support", url: "#", icon: "Headphones" },
  { title: "Leave Request", url: "#", icon: "Calendar" },
  { title: "Payroll", url: "#", icon: "CreditCard" },
  { title: "Learning Portal", url: "#", icon: "GraduationCap" },
];
