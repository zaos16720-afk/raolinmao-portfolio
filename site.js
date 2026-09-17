(() => {
  const THEMES = {
    practical: { code: 'VERSION A', title: '适合真实投递的克制版本', note: '让内容和证据先说话。' },
    cinematic: { code: 'VERSION B', title: '电影预告式夸张版本', note: '把三段经历剪成一部关于行动与结果的预告片。' },
    hyper: { code: 'VERSION C', title: '未来交互式夸张版本', note: '恢复最初版本的粒子网络、霓虹光晕与轻微 3D 反馈。' },
    apple: { code: 'VERSION D', title: '苹果设计原则版本', note: '克制、清楚、流畅，让每个细节都有理由。' },
  };

  const html = document.documentElement;
  const query = new URLSearchParams(location.search);
  const isProduction = query.get('mode') !== 'lab';
  const themeButtons = [...document.querySelectorAll('[data-set-theme]')];
  const intro = document.querySelector('.theme-intro');
  const introCode = intro?.querySelector('.intro-code');
  const introTitle = intro?.querySelector('h2');
  const introNote = intro?.querySelector('p:not(.intro-code)');
  const progress = document.querySelector('.scroll-progress span');
  let currentTheme = 'practical';
  let introTimer = 0;
  let particleFrame = 0;

  function urlTheme() {
    if (isProduction) return 'apple';
    const candidate = query.get('theme');
    return THEMES[candidate] ? candidate : 'practical';
  }

  function closeIntro() {
    clearTimeout(introTimer);
    intro?.classList.remove('is-open');
  }

  function showIntro(theme) {
    if (!intro || !introCode || !introTitle || !introNote) return;
    const copy = THEMES[theme];
    introCode.textContent = copy.code;
    introTitle.textContent = copy.title;
    introNote.textContent = copy.note;
    intro.classList.add('is-open');
    clearTimeout(introTimer);
    introTimer = window.setTimeout(closeIntro, 950);
  }

  function configureTheme(theme, announce = true) {
    if (isProduction) theme = 'apple';
    if (!THEMES[theme]) return;
    const changed = currentTheme !== theme;
    currentTheme = theme;
    html.dataset.theme = theme;
    themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme)));
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    history.replaceState({}, '', url);
    document.querySelectorAll('.resume-link').forEach((link) => {
      link.href = `resume.html?theme=${encodeURIComponent(theme)}${isProduction ? '&mode=production' : ''}`;
    });
    if (announce && changed) showIntro(theme);
    configureCanvas();
  }

  if (isProduction) {
    html.dataset.mode = 'production';
    document.title = '饶林茂｜工作案例作品集';
    const lab = document.querySelector('.design-lab');
    if (lab) {
      lab.hidden = true;
      lab.setAttribute('aria-hidden', 'true');
    }
  } else {
    themeButtons.forEach((button) => button.addEventListener('click', () => configureTheme(button.dataset.setTheme)));
  }
  intro?.querySelector('button')?.addEventListener('click', closeIntro);

  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? scrollY / max : 0;
    progress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);

  const revealTargets = [...document.querySelectorAll('.section-heading, .case-card, .case-cover-copy, .case-cover-proof, .story-copy, .evidence, .tool-copy, .tool-visual, .closing-copy, .closing blockquote')];
  revealTargets.forEach((target) => target.classList.add('reveal'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach((target) => observer.observe(target));

  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (currentTheme !== 'hyper' || innerWidth < 900) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  const contactDialog = document.querySelector('.contact-dialog');
  document.querySelectorAll('[data-open-contact]').forEach((button) => button.addEventListener('click', () => contactDialog.showModal()));
  document.querySelectorAll('[data-close-contact]').forEach((button) => button.addEventListener('click', () => contactDialog.close()));
  contactDialog.addEventListener('click', (event) => { if (event.target === contactDialog) contactDialog.close(); });

  const lightbox = document.querySelector('.image-lightbox');
  const lightboxImage = lightbox.querySelector('img');
  const lightboxCaption = lightbox.querySelector('p');
  document.querySelectorAll('.evidence img').forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `查看大图：${img.alt}`);
    const open = () => {
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.alt;
      lightboxCaption.textContent = img.alt;
      lightbox.showModal();
    };
    img.addEventListener('click', open);
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
  document.querySelector('[data-close-lightbox]').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });

  const canvas = document.querySelector('#fx-canvas');
  const context = canvas.getContext('2d');
  let particles = [];

  function sizeCanvas() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: Math.min(70, Math.floor(innerWidth / 18)) }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.25,
      c: Math.random() > 0.5 ? '102,247,255' : '255,66,208',
    }));
  }

  function drawParticles() {
    context.clearRect(0, 0, innerWidth, innerHeight);
    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0 || particle.x > innerWidth) particle.vx *= -1;
      if (particle.y < 0 || particle.y > innerHeight) particle.vy *= -1;
      context.fillStyle = `rgba(${particle.c},.65)`;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      context.fill();
      for (let j = index + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
        if (distance < 115) {
          context.strokeStyle = `rgba(102,247,255,${(1 - distance / 115) * 0.12})`;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
    });
    particleFrame = requestAnimationFrame(drawParticles);
  }

  function configureCanvas() {
    cancelAnimationFrame(particleFrame);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (currentTheme === 'hyper' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sizeCanvas();
      drawParticles();
    }
  }

  addEventListener('resize', () => { if (currentTheme === 'hyper') sizeCanvas(); });
  configureTheme(urlTheme(), false);
  updateProgress();
})();
