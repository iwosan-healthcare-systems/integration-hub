import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mainRef.current) {
      mainRef.current = document.querySelector("main");
    }
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
