import { useEffect, useState } from "react";

type Phase = "typing" | "deleting";

export function useTypewriterLoop(
  text: string,
  options: {
    startDelay?: number;
    typeSpeed?: number;
    deleteSpeed?: number;
    pauseDuration?: number;
  } = {},
) {
  const { startDelay = 300, typeSpeed = 55, deleteSpeed = 28, pauseDuration = 2500 } = options;
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (count < text.length) {
        timeout = setTimeout(
          () => setCount((c) => c + 1),
          count === 0 ? startDelay : typeSpeed,
        );
      } else {
        timeout = setTimeout(() => setPhase("deleting"), pauseDuration);
      }
    } else {
      if (count > 0) {
        timeout = setTimeout(() => setCount((c) => c - 1), deleteSpeed);
      } else {
        timeout = setTimeout(() => setPhase("typing"), 500);
      }
    }

    return () => clearTimeout(timeout);
  }, [phase, count, text, startDelay, typeSpeed, deleteSpeed, pauseDuration]);

  return { count, phase, fullyTyped: phase === "typing" && count === text.length };
}
