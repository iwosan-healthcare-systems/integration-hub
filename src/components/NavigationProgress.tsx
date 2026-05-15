import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function NavigationProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    const t1 = setTimeout(() => setProgress(35), 20);   // jump to 35%
    const t2 = setTimeout(() => setProgress(75), 150);  // ease to 75%
    const t3 = setTimeout(() => setProgress(100), 400); // complete
    const t4 = setTimeout(() => setVisible(false), 700); // fade out

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-accent shadow-[0_0_8px_0px] shadow-accent/60 transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 0 ? '0ms' : progress < 50 ? '120ms' : '350ms',
          opacity: progress === 100 ? 0 : 1,
          transition: `width ${progress === 0 ? '0ms' : progress < 50 ? '120ms' : '350ms'} ease-out, opacity 300ms ease-in`,
        }}
      />
    </div>
  );
}
