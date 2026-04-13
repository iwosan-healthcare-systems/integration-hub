import { useEffect, useState } from "react";
import iwosanLogo from "@/assets/iwosan-logo.png";

export function PageLoader() {
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1200);
    const hideTimer = setTimeout(() => setHidden(true), 1800);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className={`page-loader ${loaded ? "loaded" : ""}`}>
      <div className="flex flex-col items-center gap-6">
        <img
          src={iwosanLogo}
          alt="Iwosan"
          className="h-14 w-auto animate-float"
        />
        <div className="loader-pulse" />
      </div>
    </div>
  );
}
