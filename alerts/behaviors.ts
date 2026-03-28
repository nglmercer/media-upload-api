import { AlertBehaviorRegistry, AlertBuilder } from './src';

export function registerBehaviors() {
  // 1. Register "split-bounce" for text elements
  AlertBehaviorRegistry.register('split-bounce', (el) => {
    const textChild = el.querySelector('.text') as HTMLElement;
    if (!textChild) return;
    const { chars } = AlertBuilder.splitText(textChild, { chars: true });
    AlertBuilder.animate(chars, {
      y: [-25, 0],
      rotate: [90, 0],
      opacity: [0, 1],
      delay: AlertBuilder.stagger(40, { from: 'center' }),
      easing: 'easeOutElastic(1, .6)'
    });
  });

  // 2. Register "text-reveal" for basic text animations
  AlertBehaviorRegistry.register('text-reveal', (textEl) => {
    const { chars } = AlertBuilder.splitText(textEl, { words: false, chars: true });
    AlertBuilder.animate(chars, {
      y: [
        { to: '-1.5rem', ease: 'outExpo', duration: 600 },
        { to: 0, ease: 'outBounce', duration: 800, delay: 100 }
      ],
      rotate: { from: '-0.5turn', delay: 0 },
      opacity: { from: 0, to: 1, duration: 600 },
      delay: AlertBuilder.stagger(40),
      ease: 'inOutCirc'
    });
  });

  // 3. Register "score-count" for animating numbers
  AlertBehaviorRegistry.register('score-count', (el, data) => {
    const score = { val: 0 };
    const target = data?.target || 1250;
    AlertBuilder.animate(score, {
      val: target,
      duration: 3000,
      ease: 'outExpo',
      onUpdate: () => {
        el.textContent = Math.floor(score.val).toLocaleString();
      }
    });
  });

  // 4. Register "reveal-pop" for images and badges
  AlertBehaviorRegistry.register('reveal-pop', (el, data) => {
    const delay = data?.delay || 0;
    const scale = data?.scale || [0, 1.2, 1];
    AlertBuilder.animate(el, {
      scale: scale,
      opacity: [0, 1],
      duration: 1200,
      delay: delay,
      ease: data?.ease || 'outBack(1.7)'
    });
  });

  // 5. Register "gift-reveal" (elastic pop)
  AlertBehaviorRegistry.register('gift-reveal', (el, data) => {
    AlertBuilder.animate(el, {
      opacity: [0, 1],
      scale: [0, 1.5, 1],
      delay: data?.delay || 1500,
      duration: 1000,
      ease: 'outElastic(1, .5)'
    });
  });

  // 6. Milestone Checklist Behavior
  AlertBehaviorRegistry.register('milestone-checklist', (el, data) => {
    const items = el.querySelectorAll('.alert-element-container'); // Rows
    items.forEach((row, i) => {
      const waitTime = 1200 + (i * 1500);
      setTimeout(() => {
        const checkWrapper = row.querySelector('.checkbox-wrapper');
        const line = row.querySelector('[id^="line-"]') as HTMLElement;
        const text = row.querySelector('[id^="task-text-"]') as HTMLElement;

        if (checkWrapper) checkWrapper.classList.add('checked');
        if (line) {
          AlertBuilder.animate(line, {
            width: '100%',
            duration: 800,
            delay: 200,
            ease: 'easeInOutQuad'
          });
        }
        if (text) {
          AlertBuilder.animate(text, {
            opacity: 0.4,
            duration: 800,
            delay: 200
          });
        }
      }, waitTime);
    });
  });
}
