import { useEffect, useState } from "react";

export function TypewriterHeading({
  text,
  className,
  startDelay = 300,
  speed = 55,
}: {
  text: string;
  className?: string;
  startDelay?: number;
  speed?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    let interval: ReturnType<typeof setInterval>;

    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        frame += 1;
        setCount(frame);
        if (frame >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(interval);
    };
  }, [text, startDelay, speed]);

  const done = count >= text.length;

  return (
    <h1 className={className}>
      <span aria-hidden="true" className={done ? "shine-text" : undefined}>
        {text.slice(0, count)}
        {!done && <span className="typewriter-cursor" />}
      </span>
      <span className="sr-only">{text}</span>
    </h1>
  );
}
