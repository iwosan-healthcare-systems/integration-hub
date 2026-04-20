# Iwosan Innovation Hub

A centralized internal web platform for the Iwosan Healthcare network — providing staff, partners, and stakeholders with a single destination for news, resources, leadership information, and quick access to operational tools.

---

## Overview

The Iwosan Innovation Hub is a React single-page application that serves as the digital front door for the Iwosan Healthcare group. It surfaces the group's five subsidiary platforms, latest news and announcements, leadership profiles, and downloadable resources — all within a consistent, branded interface.

---

## Tech Stack

| Layer       | Technology                 |
| ----------- | -------------------------- |
| Framework   | React 18 + TypeScript 5    |
| Build tool  | Vite 5 (SWC compiler)      |
| Styling     | Tailwind CSS 3 + shadcn/ui |
| Routing     | React Router DOM 6         |
| State/Data  | TanStack Query 5           |
| Icons       | Lucide React               |
| Forms       | React Hook Form + Zod      |

---

## Project Structure

```text
src/
├── assets/              # Optimized WebP images and logos
│   └── logos/           # Subsidiary brand logos
├── components/
│   ├── ui/              # shadcn/ui primitives (sidebar, tooltip, etc.)
│   ├── AppSidebar.tsx   # Collapsible navigation sidebar
│   ├── TopNavbar.tsx    # Top bar with search and sidebar trigger
│   ├── NavLink.tsx      # Active-aware router link wrapper
│   ├── PageLoader.tsx   # Initial splash/loading screen
│   └── ScrollToTop.tsx  # Resets scroll position on navigation
├── data/
│   └── hub-data.ts      # All static content (subsidiaries, news, leadership, etc.)
├── hooks/
│   ├── useScrollAnimation.tsx  # Shared IntersectionObserver for scroll animations
│   ├── use-mobile.tsx          # Breakpoint hook
│   └── use-toast.ts            # Toast notification hook
├── layouts/
│   └── HubLayout.tsx    # Root layout (sidebar + top navbar + main)
├── pages/
│   ├── Index.tsx             # Home page
│   ├── AboutPage.tsx         # About Iwosan / mission / milestones
│   ├── SubsidiariesPage.tsx  # Network of platforms
│   ├── LeadershipPage.tsx    # Board and executive team
│   ├── ResourcesPage.tsx     # Documents and training materials
│   ├── NewsPage.tsx          # News and announcements feed
│   └── NotFound.tsx          # 404 page
└── index.css            # Global styles, CSS variables, animation classes
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd iwosan-innovation-hub

# Install dependencies
npm install i
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

Output goes to `dist/`. Preview the build locally with:

```bash
npm run preview
```

### Other commands

```bash
npm run lint          # ESLint check
npm run test          # Run Vitest tests once
npm run test:watch    # Watch mode
```

---

## Content Management

All static content lives in [`src/data/hub-data.ts`](src/data/hub-data.ts). To update the site content, edit the exported arrays directly — no CMS or API is required.

| Export          | Purpose                                          |
| --------------- | ------------------------------------------------ |
| `subsidiaries`  | Platform cards shown on Home and Subsidiaries    |
| `newsItems`     | News feed (sorted by date at runtime)            |
| `leadershipTeam`| Board and executive profiles                     |
| `resources`     | Downloadable documents and training materials    |
| `quickLinks`    | Quick-access tool shortcuts on the Home page     |
| `coreValues`    | Values shown on the About page                   |
| `milestones`    | Timeline on the About page                       |

### Adding a news item

```ts
// src/data/hub-data.ts — append to the newsItems array
{
  title: "Article headline",
  excerpt: "Short summary shown in cards.",
  date: "April 20, 2026",
  category: "Expansion",   // label shown on the card
  featured: true,           // promotes to hero card on the News page
  image: "https://...",     // external URL or local WebP import
  url: "https://...",       // opens on click
}
```

---

## Image Optimisation

All local images are stored as WebP and can be regenerated from source files using the included Python script:

```bash
# Requires Pillow
pip install Pillow
python scripts/optimize-images.py
```

The script converts every source JPG/PNG in `src/assets/` to WebP, resizes to appropriate dimensions (1920 px for hero images, 1200 px for section photos, 400 px for logos and portraits), and prints a per-file savings report. Run it whenever new source images are added to keep the asset bundle lean.

---

## Subsidiaries

The hub represents five platforms in the Iwosan network:

| Platform                                  | Category      | Website              |
| ----------------------------------------- | ------------- | -------------------- |
| Iwosan Healthcare Systems Limited         | Corporate     | iwosanhealth.com     |
| Iwosan Lagoon Hospitals Limited           | Hospital      | lagoonhospitals.com  |
| Eurapharma Care Services Nigeria Limited  | Hospital      | euracarehealth.com   |
| Paelon Memorial Hospital Limited          | Hospital      | paelonhospital.com   |
| IASO Medipark Limited                     | Medical Campus| iasomedipark.com     |

---

## Deployment

The app is a standard Vite static build and can be deployed to any static host (Netlify, Vercel, Azure Static Web Apps, Nginx, etc.).

For hosts that serve a SPA, configure all routes to return `index.html`.

**Netlify** — add a `public/_redirects` file:

```text
/*  /index.html  200
```

**Nginx**:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## License

Internal use only — © Iwosan Healthcare Systems Limited. All rights reserved.
