/**
 * Ported from frontend/src/utils/flyToCart.js — throws a copy of a product's photo into the cart
 * icon (an element marked data-cart-target), which bounces when it lands (.cart-flyer in
 * styles.css). `fromEl` is the photo the flight starts from; if it isn't a loaded <img> (a failed
 * SafeImage, say) an orange chip flies instead. Skipped under reduced motion, or when no cart
 * icon is on screen. Mobile has two cart icons (the topbar's, and Home's hero, which hides the
 * topbar one), so it aims at whichever is actually showing.
 */
export function flyToCart(fromEl: HTMLElement | null | undefined): void {
  if (!fromEl || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]')).find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  if (!target) return;
  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width) return;

  const size = Math.min(from.width, from.height, 140);
  const x = from.left + from.width / 2 - size / 2;
  const y = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - (x + size / 2);
  const dy = to.top + to.height / 2 - (y + size / 2);

  // The outer box carries the photo across at a steady pace while the photo rises fast and eases
  // off as it reaches the cart's height, so together they trace an arc. Its shrinking runs on
  // the separate `scale` property, on a curve of its own.
  const flyer = document.createElement('div');
  flyer.className = 'cart-flyer';
  flyer.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
  const source = fromEl as HTMLImageElement;
  const photo = document.createElement(fromEl.tagName === 'IMG' && source.complete ? 'img' : 'span');
  if (photo instanceof HTMLImageElement) photo.src = source.currentSrc || source.src;
  flyer.appendChild(photo);
  document.body.appendChild(flyer);

  const duration = 850;
  const timing: KeyframeAnimationOptions = { duration, fill: 'forwards' };
  flyer.animate({ translate: ['0 0', `${dx}px 0`] }, { ...timing, easing: 'cubic-bezier(0.35, 0, 0.65, 1)' });
  photo.animate({ translate: ['0 0', `0 ${dy}px`] }, { ...timing, easing: 'cubic-bezier(0.15, 0.75, 0.35, 1)' });
  const flight = photo.animate(
    [
      { scale: 1, borderRadius: '14px', opacity: 1 },
      { scale: 1.08, borderRadius: '18px', opacity: 1, offset: 0.12 },
      { scale: 0.4, borderRadius: '50%', opacity: 1, offset: 0.8 },
      { scale: 0.15, borderRadius: '50%', opacity: 0.2 },
    ],
    { ...timing, easing: 'ease-in-out' },
  );
  flight.onfinish = () => {
    flyer.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-10deg)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'cubic-bezier(0.3, 1.5, 0.5, 1)' },
    );
  };
}
