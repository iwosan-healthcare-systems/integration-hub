import { useEffect, useRef, ReactNode } from "react";

// Single shared observer for all AnimateOnScroll instances
const callbacks = new Map<Element, () => void>();

const sharedObserver =
  typeof window !== "undefined"
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const cb = callbacks.get(entry.target);
              if (cb) {
                cb();
                sharedObserver.unobserve(entry.target);
                callbacks.delete(entry.target);
              }
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
      )
    : null;

export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !sharedObserver) return;

    const targets = [
      ...Array.from(el.querySelectorAll(".animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right")),
      ...(el.classList.contains("animate-on-scroll") ||
      el.classList.contains("animate-on-scroll-left") ||
      el.classList.contains("animate-on-scroll-right")
        ? [el]
        : []),
    ];

    targets.forEach((t) => {
      callbacks.set(t, () => t.classList.add("visible"));
      sharedObserver.observe(t);
    });

    return () => {
      targets.forEach((t) => {
        sharedObserver.unobserve(t);
        callbacks.delete(t);
      });
    };
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
    const el = ref.current;
    if (!el || !sharedObserver) return;

    callbacks.set(el, () => el.classList.add("visible"));
    sharedObserver.observe(el);

    return () => {
      sharedObserver.unobserve(el);
      callbacks.delete(el);
    };
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
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
