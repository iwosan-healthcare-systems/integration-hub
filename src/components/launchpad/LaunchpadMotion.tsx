import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import './launchpad.css';

export function LaunchpadReveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`lp-reveal ${visible ? 'lp-visible' : ''} ${className}`} style={{ '--lp-delay': `${delay}ms` } as CSSProperties}>{children}</div>;
}
