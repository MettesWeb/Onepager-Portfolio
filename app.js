(() => {
  const root = document.documentElement;
  const storedLanguage = localStorage.getItem('portfolio-language');
  let language = storedLanguage === 'en' ? 'en' : 'de';
  let particleHeadingController = null;

  function setLanguage(nextLanguage) {
    language = nextLanguage;
    root.lang = language;
    document.querySelectorAll('[data-de][data-en]').forEach((element) => {
      const translatedText = element.dataset[language];
      const particleText = element.matches('[data-particle-heading]')
        ? element.querySelector('.particle-heading-text')
        : null;
      if (particleText) particleText.textContent = translatedText;
      else element.textContent = translatedText;
    });
    document.querySelectorAll('[data-placeholder-de][data-placeholder-en]').forEach((element) => {
      element.placeholder = element.dataset[`placeholder${language === 'de' ? 'De' : 'En'}`];
    });
    document.querySelectorAll('.lang-btn').forEach((button) => {
      const isActive = button.dataset.lang === language;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    document.querySelectorAll('.kinetic-heading').forEach(wrapKineticText);
    window.requestAnimationFrame(() => particleHeadingController?.refresh());
    localStorage.setItem('portfolio-language', language);
  }

  document.querySelectorAll('.lang-btn').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
  setLanguage(language);

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupParticleHeading(element) {
    if (!element || reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null;

    const source = document.createElement('span');
    source.className = 'particle-heading-text';
    source.textContent = element.textContent.trim();

    const canvas = document.createElement('canvas');
    canvas.className = 'particle-heading-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    element.textContent = '';
    element.append(source, canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let progress = 0;
    let target = 0;
    let frame = 0;

    const buildParticles = () => {
      const hostRect = element.getBoundingClientRect();
      if (!hostRect.width || !hostRect.height) return;

      const width = Math.max(1, Math.ceil(hostRect.width));
      const height = Math.max(1, Math.ceil(hostRect.height));
      canvas.width = width;
      canvas.height = height;

      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      const style = getComputedStyle(element);
      maskCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      maskCtx.fillStyle = '#fff';
      maskCtx.textBaseline = 'top';

      const textNode = source.firstChild;
      if (!textNode) return;
      const text = textNode.textContent;
      const wordPattern = /\S+/g;
      let match;
      while ((match = wordPattern.exec(text))) {
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        maskCtx.fillText(match[0], rect.left - hostRect.left, rect.top - hostRect.top);
      }

      const pixels = maskCtx.getImageData(0, 0, width, height).data;
      const stride = Math.max(5, Math.ceil(Math.sqrt((width * height) / 3000)));
      const next = [];
      for (let y = 0; y < height; y += stride) {
        for (let x = 0; x < width; x += stride) {
          if (pixels[(y * width + x) * 4 + 3] < 90) continue;
          const angle = Math.random() * Math.PI * 2;
          const distance = 24 + Math.random() * 105;
          next.push({
            x,
            y,
            dx: Math.cos(angle) * distance + 28 + Math.random() * 38,
            dy: Math.sin(angle) * distance - 12 - Math.random() * 45,
            size: 1.1 + Math.random() * 2.2,
            gold: Math.random() < .13
          });
        }
      }
      particles = next;
    };

    const draw = () => {
      const delta = target - progress;
      progress += delta * .12;
      if (Math.abs(delta) < .006) progress = target;

      const eased = 1 - Math.pow(1 - progress, 3);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = String(Math.min(1, progress * 3));
      source.style.opacity = String(Math.max(0, 1 - progress * 3));

      particles.forEach((particle) => {
        const shimmer = Math.sin(progress * 14 + particle.x * .035) * 2;
        ctx.globalAlpha = Math.max(0, 1 - progress * .28);
        ctx.fillStyle = particle.gold ? '#f0bd82' : '#fffaf4';
        ctx.beginPath();
        ctx.arc(
          particle.x + particle.dx * eased,
          particle.y + particle.dy * eased + shimmer,
          Math.max(.45, particle.size * (1 - progress * .52)),
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      element.classList.toggle('is-fragmenting', progress > .02);
      if (progress !== target) frame = window.requestAnimationFrame(draw);
      else if (progress === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.opacity = '0';
        source.style.opacity = '1';
        element.classList.remove('is-fragmenting');
      }
    };

    const animateTo = (nextTarget) => {
      target = nextTarget;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(draw);
    };

    element.addEventListener('pointerenter', () => {
      buildParticles();
      animateTo(1);
    });
    element.addEventListener('pointerleave', () => animateTo(0));

    const resizeObserver = new ResizeObserver(() => {
      if (progress === 0) buildParticles();
    });
    resizeObserver.observe(element);

    buildParticles();
    return {
      refresh() {
        window.requestAnimationFrame(buildParticles);
      }
    };
  }

  particleHeadingController = setupParticleHeading(document.querySelector('[data-particle-heading]'));
  const revealElements = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const comet = document.getElementById('scrollComet');
  if (comet) {
    const updateComet = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      comet.style.transform = `translateY(${progress * 60}vh)`;
    };
    updateComet();
    window.addEventListener('scroll', updateComet, { passive: true });
  }

  function wrapKineticText(element) {
    const isName = element.classList.contains('kinetic-name');
    const raw = isName ? element.innerHTML.replace(/<br\s*\/?>/i, '\n') : element.textContent.trim();
    element.innerHTML = '';
    element.setAttribute('aria-label', raw.replace(/\s+/g, ' '));

    if (isName) {
      [...raw].forEach((character) => {
        const span = document.createElement('span');
        span.setAttribute('aria-hidden', 'true');
        if (character === '\n') span.className = 'letter break';
        else {
          span.className = character === ' ' ? 'letter space' : 'letter';
          span.textContent = character === ' ' ? '\u00a0' : character;
        }
        element.appendChild(span);
      });
      return;
    }

    const lines = element.id === 'skills-title'
      ? (language === 'de' ? ['Sechs Bereiche.', 'Eine gemeinsame Richtung.'] : ['Six areas.', 'One shared direction.'])
      : [raw];
    element.setAttribute('aria-label', lines.join(' '));

    lines.forEach((line) => {
      const lineSpan = document.createElement('span');
      if (lines.length > 1) lineSpan.className = 'kinetic-line';
      line.split(/\s+/).forEach((word, wordIndex, words) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'kinetic-word';
        wordSpan.setAttribute('aria-hidden', 'true');
        [...word].forEach((character) => {
          const letter = document.createElement('span');
          letter.className = 'letter';
          letter.textContent = character;
          wordSpan.appendChild(letter);
        });
        lineSpan.appendChild(wordSpan);
        if (wordIndex < words.length - 1) lineSpan.appendChild(document.createTextNode(' '));
      });
      element.appendChild(lineSpan);
    });
  }

  document.querySelectorAll('.kinetic-name, .kinetic-heading').forEach((element) => {
    wrapKineticText(element);
    if (reducedMotion) return;
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const phase = ((event.clientX - rect.left) / Math.max(1, rect.width)) * Math.PI * 4;
      const letters = [...element.querySelectorAll('.letter:not(.break)')];
      letters.forEach((letter, index) => {
        const wave = Math.sin(index * .7 + phase) * 7;
        letter.style.transform = `translateY(${wave}px)`;
        letter.style.color = Math.abs(wave) > 5 ? 'var(--kinetic-accent)' : '';
      });
    });
    element.addEventListener('pointerleave', () => {
      element.querySelectorAll('.letter').forEach((letter) => {
        letter.style.transform = '';
        letter.style.color = '';
      });
    });
  });

  const intro = document.getElementById('introScreen');
  const countdown = document.getElementById('countdown');
  const canvas = document.getElementById('nameCanvas');
  const introName = document.getElementById('introName');
  const introHexagon = document.getElementById('introHexagon');
  const introFlash = document.getElementById('introFlash');
  const skipIntro = document.getElementById('skipIntro');
  const navigation = performance.getEntriesByType?.('navigation')?.[0];
  const pageUrl = new URL(window.location.href);
  const skipRequested = pageUrl.searchParams.get('skipIntro') === '1';
  const shouldSkipIntro = skipRequested && navigation?.type !== 'reload';

  if (skipRequested) {
    pageUrl.searchParams.delete('skipIntro');
    history.replaceState(null, '', `${pageUrl.pathname}${pageUrl.search}${pageUrl.hash}`);
  }

  if (intro && shouldSkipIntro) {
    intro.remove();
    root.classList.remove('skip-site-intro');
  } else if (intro && countdown && canvas && introHexagon && !reducedMotion) {
    let animationFrame;
    let finished = false;

    const finishIntro = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(animationFrame);
      intro.classList.add('is-finished');
      window.setTimeout(() => intro.remove(), 900);
    };

    skipIntro?.addEventListener('click', finishIntro);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') finishIntro();
    }, { once: true });

    function startParticles() {
      const ctx = canvas.getContext('2d');
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const centerX = width / 2;
      const centerY = height / 2;
      const particleCount = width < 600 ? 900 : Math.min(2300, Math.round(width * height / 760));
      const hexRadius = Math.min(width * .265, height * .34, 280);
      const hexVertices = Array.from({ length: 6 }, (_, vertexIndex) => {
        const angle = -Math.PI / 2 + vertexIndex * Math.PI / 3;
        return {
          x: centerX + Math.cos(angle) * hexRadius,
          y: centerY + Math.sin(angle) * hexRadius
        };
      });
      const pointOnHexagon = (position) => {
        const sidePosition = position * 6;
        const side = Math.floor(sidePosition) % 6;
        const progress = sidePosition - Math.floor(sidePosition);
        const from = hexVertices[side];
        const to = hexVertices[(side + 1) % 6];
        return {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress
        };
      };
      const particles = Array.from({ length: particleCount }, (_, particleIndex) => {
        const target = pointOnHexagon((particleIndex + Math.random() * .8) / particleCount);
        const depth = .35 + Math.random() * .9;
        return {
          startX: -width * .14 + Math.random() * width * 1.28,
          startY: -height * .12 + Math.random() * height * 1.24,
          targetX: target.x + (Math.random() - .5) * 5,
          targetY: target.y + (Math.random() - .5) * 5,
          burstAngle: Math.atan2(target.y - centerY, target.x - centerX) + (Math.random() - .5) * .45,
          burstDistance: 150 + Math.random() * Math.max(width, height) * .68,
          size: (.5 + Math.random() * 1.55) * depth,
          speed: (65 + Math.random() * 190) * depth,
          wave: Math.random() * Math.PI * 2,
          depth,
          bright: particleIndex % 13 === 0,
          color: particleIndex % 9 === 0 ? '#fff8e9' : (particleIndex % 4 === 0 ? '#ffd69c' : '#d99a5e')
        };
      });

      const start = performance.now();
      const flowEnd = 1900;
      const gatherEnd = 3100;
      const holdEnd = 3650;
      const burstEnd = 4250;
      const animate = (now) => {
        const elapsed = now - start;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        particles.forEach((particle) => {
          const travel = particle.speed * Math.min(elapsed, flowEnd) / 1000;
          const flowX = (particle.startX + travel + width * .16) % (width * 1.3) - width * .15;
          const flowY = particle.startY - travel * .13 + Math.sin(elapsed / 360 + particle.wave) * (18 + 34 * particle.depth);
          let x = flowX;
          let y = flowY;
          let alpha = .2 + particle.depth * .42;
          if (elapsed >= flowEnd && elapsed < gatherEnd) {
            const progress = (elapsed - flowEnd) / (gatherEnd - flowEnd);
            const eased = 1 - Math.pow(1 - progress, 4);
            const swirl = Math.sin(progress * Math.PI) * (1 - particle.depth) * 120;
            x = flowX + (particle.targetX - flowX) * eased + Math.cos(particle.wave + progress * 5) * swirl;
            y = flowY + (particle.targetY - flowY) * eased + Math.sin(particle.wave + progress * 5) * swirl;
            alpha = .48 + progress * .5;
          } else if (elapsed >= gatherEnd && elapsed < holdEnd) {
            x = particle.targetX + Math.cos(particle.wave + elapsed / 140) * .9;
            y = particle.targetY + Math.sin(particle.wave + elapsed / 140) * .9;
            alpha = .8 + Math.sin(elapsed / 80 + particle.wave) * .2;
          } else if (elapsed >= holdEnd) {
            const progress = Math.min(1, (elapsed - holdEnd) / (burstEnd - holdEnd));
            const eased = Math.pow(progress, 1.65);
            x = particle.targetX + Math.cos(particle.burstAngle) * particle.burstDistance * eased;
            y = particle.targetY + Math.sin(particle.burstAngle) * particle.burstDistance * eased;
            alpha = Math.max(0, 1 - progress * 1.08);
          }
          const streak = Math.max(1.5, particle.speed * particle.depth * .018);
          ctx.beginPath();
          ctx.strokeStyle = particle.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = Math.max(.35, particle.size * .52);
          ctx.moveTo(x - streak, y + streak * .13);
          ctx.lineTo(x, y);
          ctx.stroke();
          if (particle.bright) {
            ctx.beginPath();
            ctx.fillStyle = particle.color;
            ctx.arc(x, y, particle.size * 1.35, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.globalCompositeOperation = 'source-over';
        if (elapsed > 1840) introHexagon.classList.add('is-forming');
        if (elapsed > 3160) introHexagon.classList.add('is-charged');
        if (elapsed > 3650) {
          introHexagon.classList.add('is-bursting');
          introFlash?.classList.add('is-visible');
        }
        if (elapsed > 3920) {
          canvas.classList.add('is-fading');
          introName?.classList.add('is-visible');
        }
        ctx.globalAlpha = 1;
        if (elapsed < burstEnd) animationFrame = requestAnimationFrame(animate);
        else window.setTimeout(finishIntro, 1500);
      };
      animationFrame = requestAnimationFrame(animate);
    }

    const numbers = ['3', '2', '1'];
    let index = 0;
    const nextNumber = () => {
      countdown.textContent = numbers[index];
      countdown.style.animation = 'none';
      void countdown.offsetWidth;
      countdown.style.animation = '';
      index += 1;
      if (index < numbers.length) window.setTimeout(nextNumber, 720);
      else window.setTimeout(() => { countdown.style.display = 'none'; }, 720);
    };

    startParticles();
    nextNumber();
  } else if (intro) {
    intro.remove();
  }

  const contactForm = document.querySelector('.contact-form[data-email-recipient]');
  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);
    const recipient = contactForm.dataset.emailRecipient;
    const subjectSelect = contactForm.querySelector('[name="subject"]');
    const enquiry = subjectSelect?.selectedOptions[0]?.textContent?.trim() || (language === 'de' ? 'Kontaktanfrage' : 'Contact enquiry');
    const subject = `${language === 'de' ? 'Anfrage über maritsilvagebhardt.com' : 'Enquiry via maritsilvagebhardt.com'}: ${enquiry}`;
    const labels = language === 'de'
      ? { name: 'Name', email: 'E-Mail', phone: 'Telefon', message: 'Nachricht' }
      : { name: 'Name', email: 'Email', phone: 'Phone', message: 'Message' };
    const body = [
      `${labels.name}: ${formData.get('name') || ''}`,
      `${labels.email}: ${formData.get('email') || ''}`,
      `${labels.phone}: ${formData.get('phone') || '-'}`,
      '',
      `${labels.message}:`,
      `${formData.get('message') || ''}`
    ].join('\n');

    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  if (!reducedMotion) {
    document.querySelectorAll('.visual-srl-feature, .visual-srl').forEach((container) => {
      const logo = container.querySelector('.srl-logo-3d');
      if (!logo) return;
      container.addEventListener('pointermove', (event) => {
        const rect = container.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        logo.style.transform = `perspective(900px) rotateX(${-y * 18}deg) rotateY(${x * 22}deg) translateY(-7px) scale(1.035)`;
      });
      container.addEventListener('pointerleave', () => { logo.style.transform = ''; });
    });
  }

  document.querySelectorAll('[data-video-carousel]').forEach((carousel) => {
    const slides = [...carousel.querySelectorAll('.video-slide')];
    const dots = [...carousel.querySelectorAll('.carousel-dots button')];
    const videos = slides.map((slide) => slide.querySelector('video'));
    let current = 0;
    let timer;

    const stopAuto = () => window.clearInterval(timer);
    const show = (next) => {
      current = (next + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        const active = index === current;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        dots[index]?.classList.toggle('is-active', active);
        dots[index]?.setAttribute('aria-pressed', String(active));
        if (!active) videos[index]?.pause();
      });
    };
    const startAuto = () => {
      stopAuto();
      if (!reducedMotion && slides.length > 1) timer = window.setInterval(() => show(current + 1), 7000);
    };
    const select = (next) => { show(next); startAuto(); };

    carousel.querySelector('.carousel-prev')?.addEventListener('click', () => select(current - 1));
    carousel.querySelector('.carousel-next')?.addEventListener('click', () => select(current + 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => select(index)));
    videos.forEach((video) => {
      video?.addEventListener('play', stopAuto);
      video?.addEventListener('pause', startAuto);
      video?.addEventListener('ended', () => select(current + 1));
    });
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', startAuto);
    show(0);
    startAuto();
  });
})();
