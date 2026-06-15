import lagoonLogo from "@/assets/logos/lagoon-logo.webp";
import paelonLogo from "@/assets/logos/paelon-logo.webp";
import iasoLogo   from "@/assets/logos/iaso-logo.webp";
import euracareLogo from "@/assets/logos/euracare-logo.svg";

export interface SubsidiaryLink {
  label: string;
  url: string | null;
  available: boolean;
}

export interface SubsidiaryPortal {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  tagline: string;
  overview: string;
  logo: string;
  logoBg: string;

  website: string;
  emailPortal: SubsidiaryLink;
  hrPortal: SubsidiaryLink;
  emr: SubsidiaryLink;

  itSupport: {
    email: string;
    phone: string | null;
    helpdeskUrl: string | null;
    hours: string;
  };

  theme: {
    /** solid accent — Tailwind full class e.g. "bg-sky-500" */
    accent: string;
    /** accent text colour */
    accentText: string;
    /** light tinted bg for the hero */
    heroBg: string;
    /** card top border stripe */
    stripe: string;
    /** badge bg + text */
    badge: string;
    /** hover glow shadow */
    glow: string;
    /** icon colour */
    iconColor: string;
    /** subtle card bg */
    cardBg: string;
    /** card border */
    cardBorder: string;
    /** hover card border */
    cardBorderHover: string;
  };
}

export const subsidiaryPortals: SubsidiaryPortal[] = [
  {
    slug: "iwosan-lagoon-hospitals",
    name: "Iwosan Lagoon Hospitals Limited",
    shortName: "Lagoon Hospitals",
    category: "Hospital",
    tagline: "World-class healthcare, right here in Lagos.",
    overview:
      "Iwosan Lagoon Hospitals is a premier multi-specialty hospital group offering world-class inpatient, outpatient, emergency, and specialist care across Lagos. The first hospital in Sub-Saharan Africa to earn the JCI Gold Seal of Approval, Lagoon Hospitals has achieved this distinction five consecutive times. With centres in Ikoyi, Ikeja, and Victoria Island — and a state-of-the-art Centre of Excellence for Cardiovascular Care — the group continues to set the standard for clinical excellence and patient-centred care in Nigeria.",
    logo: lagoonLogo,
    logoBg: "bg-white",

    website: "https://www.lagoonhospitals.com",
    emailPortal: {
      label: "Lagoon Webmail",
      url: "https://mail.lagoonhospitals.com/",
      available: true,
    },
    hrPortal: {
      label: "HR Portal",
      url: "https://hrportal.lagoonhospitals.com/",
      available: true,
    },
    emr: {
      label: "EMR System",
      url: "http://192.168.120.9:300/Login.aspx?Logout=1&RefURL=",
      available: true,
    },

    itSupport: {
      email: "itsupport@lagoonhospitals.com",
      phone: null,
      helpdeskUrl: null,
      hours: "Monday – Friday, 8 am – 6 pm",
    },

    theme: {
      accent: "bg-sky-500",
      accentText: "text-sky-600",
      heroBg: "from-sky-500/15 via-sky-500/5 to-background",
      stripe: "bg-sky-500",
      badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
      glow: "hover:shadow-sky-500/20",
      iconColor: "text-sky-500",
      cardBg: "bg-sky-500/5",
      cardBorder: "border-sky-500/20",
      cardBorderHover: "hover:border-sky-500/60 hover:bg-sky-500/10",
    },
  },

  {
    slug: "eurapharma-care-services",
    name: "Eurapharma Care Services Nigeria Limited",
    shortName: "Eurapharma Care",
    category: "Hospital",
    tagline: "Delivering healthcare and pharmaceutical excellence.",
    overview:
      "Eurapharma Care Services Nigeria Limited is a comprehensive healthcare and pharmaceutical services provider operating across Nigeria. The organisation delivers integrated medical supply solutions, specialist clinical services, and patient support programmes, working in close alignment with the broader Iwosan network to ensure high-quality, accessible care for patients at every stage of their healthcare journey.",
    logo: euracareLogo,
    logoBg: "bg-white",

    website: "https://www.euracarehealth.com",
    emailPortal: {
      label: "Outlook 365 Mail",
      url: "https://outlook.office365.com/mail/",
      available: true,
    },
    hrPortal: {
      label: "HR Portal",
      url: null,
      available: false,
    },
    emr: {
      label: "EMR System",
      url: "https://10.130.2.8",
      available: true,
    },

    itSupport: {
      email: "itsupport@euracarehealth.com",
      phone: null,
      helpdeskUrl: null,
      hours: "Monday – Friday, 8 am – 6 pm",
    },

    theme: {
      accent: "bg-emerald-500",
      accentText: "text-emerald-600",
      heroBg: "from-emerald-500/15 via-emerald-500/5 to-background",
      stripe: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      glow: "hover:shadow-emerald-500/20",
      iconColor: "text-emerald-500",
      cardBg: "bg-emerald-500/5",
      cardBorder: "border-emerald-500/20",
      cardBorderHover: "hover:border-emerald-500/60 hover:bg-emerald-500/10",
    },
  },

  {
    slug: "paelon-memorial-hospital",
    name: "Paelon Memorial Hospital Limited",
    shortName: "Paelon Memorial",
    category: "Hospital",
    tagline: "Specialist care where it matters most.",
    overview:
      "Paelon Memorial Hospital Limited is a specialist hospital with a strong focus on emergency care, maternal and reproductive health, advanced diagnostics, and patient-centred clinical services. Acquired by Iwosan in November 2025, Paelon deepens the group's presence across Lagos with a commitment to compassionate, evidence-based medicine and a multidisciplinary care model that puts patients first at every touchpoint.",
    logo: paelonLogo,
    logoBg: "bg-white",

    website: "https://www.paelonmemorial.com",
    emailPortal: {
      label: "Paelon Webmail",
      url: "https://webmail.paelonmemorial.com/",
      available: true,
    },
    hrPortal: {
      label: "HR Portal",
      url: null,
      available: false,
    },
    emr: {
      label: "EMR System",
      url: "https://paelon.instanta.app",
      available: true,
    },

    itSupport: {
      email: "itsupport@paelonmemorial.com",
      phone: null,
      helpdeskUrl: null,
      hours: "Monday – Friday, 8 am – 6 pm",
    },

    theme: {
      accent: "bg-rose-500",
      accentText: "text-rose-600",
      heroBg: "from-rose-500/15 via-rose-500/5 to-background",
      stripe: "bg-rose-500",
      badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
      glow: "hover:shadow-rose-500/20",
      iconColor: "text-rose-500",
      cardBg: "bg-rose-500/5",
      cardBorder: "border-rose-500/20",
      cardBorderHover: "hover:border-rose-500/60 hover:bg-rose-500/10",
    },
  },

  {
    slug: "iaso-medipark",
    name: "IASO Medipark Limited",
    shortName: "IASO Medipark",
    category: "Medical Campus",
    tagline: "An integrated healthcare ecosystem built for tomorrow.",
    overview:
      "IASO Medipark Limited is a 140-bed integrated multi-specialty medical campus under development in Ikoyi, Lagos. Commissioned by Governor Babajide Sanwo-Olu in December 2024, the campus brings together hospital care, advanced diagnostics, medical training, and a modern healthcare ecosystem under one roof. With 20% of beds reserved for Lagos State's indigent population, IASO Medipark is designed to be a landmark destination for both clinical excellence and community health impact.",
    logo: iasoLogo,
    logoBg: "bg-white",

    website: "https://www.iasomedipark.com",
    emailPortal: {
      label: "Outlook 365 Mail",
      url: "https://outlook.office365.com/mail/",
      available: true,
    },
    hrPortal: {
      label: "HR Portal",
      url: null,
      available: false,
    },
    emr: {
      label: "EMR System",
      url: null,
      available: false,
    },

    itSupport: {
      email: "itsupport@iasomedipark.com",
      phone: null,
      helpdeskUrl: null,
      hours: "Monday – Friday, 8 am – 6 pm",
    },

    theme: {
      accent: "bg-amber-500",
      accentText: "text-amber-600",
      heroBg: "from-amber-500/15 via-amber-500/5 to-background",
      stripe: "bg-amber-500",
      badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      glow: "hover:shadow-amber-500/20",
      iconColor: "text-amber-500",
      cardBg: "bg-amber-500/5",
      cardBorder: "border-amber-500/20",
      cardBorderHover: "hover:border-amber-500/60 hover:bg-amber-500/10",
    },
  },
];

export function getSubsidiaryBySlug(slug: string): SubsidiaryPortal | undefined {
  return subsidiaryPortals.find((s) => s.slug === slug);
}
