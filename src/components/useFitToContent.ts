import { useLayoutEffect, useRef } from 'react';

// Grows a textarea to fit its text so nothing is hidden, whatever the
// font size, zoom level or window width.
export const useFitToContent = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const border = el.offsetHeight - el.clientHeight;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + border}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value]);

  return ref;
};
