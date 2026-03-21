'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timeout = setTimeout(() => setIsNavigating(false), 500);
    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 animate-progress-bar" />
    </div>
  );
}
