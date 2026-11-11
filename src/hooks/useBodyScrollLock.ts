import { useEffect } from 'react';

/**
 * Universal mobile & desktop scroll lock for modals, drawers, and sub-pages.
 * 1. Locks the background window/body with fixed positioning so swiping inside
 *    the modal can NEVER scroll the website behind it.
 * 2. Properly handles iOS Safari and Android viewport resizing.
 * 3. Restores exact scroll position when the modal or sub-page is closed.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    // Save scroll position
    const scrollY = window.scrollY;

    // Original inline styles
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;

    // Apply strict lock to document body
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.classList.add('modal-open');

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.classList.remove('modal-open');

      // Seamlessly restore scroll position without page jump
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
