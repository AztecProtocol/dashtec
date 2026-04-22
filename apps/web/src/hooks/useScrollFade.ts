import { useEffect, useRef, RefObject } from 'react';

// The size of the fade effect in pixels.
const FADE_SIZE = '20px';

/**
 * A custom hook that applies a dynamic vertical scroll fade effect to an element.
 * It adds a top fade when scrolled down and a bottom fade when there's more content to scroll.
 * @returns A RefObject to be attached to the scrollable HTML element.
 */
export const useScrollFade = <T extends HTMLElement>(): RefObject<T> => {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;

      // Determine if there is enough content to scroll.
      const hasScrollableContent = scrollHeight > clientHeight;
      if (!hasScrollableContent) {
        element.style.setProperty('--scroll-fade-top-size', '0px');
        element.style.setProperty('--scroll-fade-bottom-size', '0px');
        return;
      }

      // Check if scrolled to the absolute top or bottom with a small buffer.
      const isScrolledToTop = scrollTop < 5;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 5;

      // Set CSS variables to control the mask gradient size.
      element.style.setProperty('--scroll-fade-top-size', isScrolledToTop ? '0px' : FADE_SIZE);
      element.style.setProperty('--scroll-fade-bottom-size', isScrolledToBottom ? '0px' : FADE_SIZE);
    };

    // Run the check on initial mount.
    handleScroll();

    // Add event listeners for scroll and resize events.
    element.addEventListener('scroll', handleScroll, { passive: true });
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(element);

    // Cleanup listeners on component unmount.
    return () => {
      element.removeEventListener('scroll', handleScroll);
      resizeObserver.unobserve(element);
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  return elementRef as unknown as RefObject<T>;
};
