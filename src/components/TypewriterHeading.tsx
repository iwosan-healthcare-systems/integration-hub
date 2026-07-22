import { useTypewriterLoop } from "@/hooks/useTypewriterLoop";

export function TypewriterHeading({
  text,
  className,
  startDelay = 300,
  typeSpeed = 55,
  deleteSpeed = 28,
  pauseDuration = 2500,
}: {
  text: string;
  className?: string;
  startDelay?: number;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
}) {
  const { count, fullyTyped } = useTypewriterLoop(text, {
    startDelay,
    typeSpeed,
    deleteSpeed,
    pauseDuration,
  });

  return (
    <h1 className={className}>
      <span aria-hidden="true" className={fullyTyped ? "shine-text" : undefined}>
        {text.slice(0, count)}
        {!fullyTyped && <span className="typewriter-cursor" />}
      </span>
      <span className="sr-only">{text}</span>
    </h1>
  );
}
