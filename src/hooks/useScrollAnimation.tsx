import { useEffect, useRef, useState, ReactNode } from "react";

export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const el = ref.current;
    if (el) {
      const children = el.querySelectorAll(
        ".animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right"
      );
      children.forEach((child) => observer.observe(child));
      // Also observe the element itself
      if (
        el.classList.contains("animate-on-scroll") ||
        el.classList.contains("animate-on-scroll-left") ||
        el.classList.contains("animate-on-scroll-right")
      ) {
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}

export function AnimateOnScroll({
  children,
  className = "",
  direction = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const animClass =
    direction === "left"
      ? "animate-on-scroll-left"
      : direction === "right"
      ? "animate-on-scroll-right"
      : "animate-on-scroll";

  return (
    <div
      ref={ref}
      className={`${animClass} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
