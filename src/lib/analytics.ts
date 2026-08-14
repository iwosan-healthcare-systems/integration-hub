// Loads Google Analytics (GA4) — a no-op if VITE_GA_MEASUREMENT_ID isn't set.
// Runs as a bundled module (not an inline <script> in index.html) so it's
// served from 'self' and doesn't need an 'unsafe-inline'/hash exception in
// the CSP's script-src.
export function initGoogleAnalytics() {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!gaId) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", gaId);
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
