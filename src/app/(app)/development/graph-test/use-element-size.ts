'use client';

import { useEffect, useRef, useState } from 'react';

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: rect.height,
      });
    };

    update();

    const observer = new ResizeObserver(() => {
      update();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
