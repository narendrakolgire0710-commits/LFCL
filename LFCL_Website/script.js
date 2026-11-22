/* ==========================================================================
   LFCL Season 1 — interactions & animation engine
   v8 · performance + bug-fix build

   What changed vs. v7 (short list):
   - Crest fallback is now ONE delegated handler (the old inline onerror in the
     fixtures threw "URL is not a constructor", so broken crests never recovered).
   - Owner/organiser photo click no longer opens a profile modal AND the lightbox
     at the same time; scroll-lock is reference-counted (closing one layer no
     longer unlocks page scroll while another is still open).
   - Photos inside the profile modals can open the lightbox (stopPropagation bug).
   - Quiz "Next" no longer fires the "LET THE GAME BEGIN" toast + confetti.
   - Quiz stage no longer indexes images that do not exist; stage rotation stops
     when the quiz is off-screen.
   - Fixture list matches the official LFCL fixture sheet exactly.
   - Auction countdown is pinned to 25 Nov 2026 18:30 IST for every visitor.
   - Loader can never get stuck (safety timeout) and is removed from the DOM.
   - Hover/tilt no longer inherits the reveal stagger delay (cards felt laggy).
   - Dead code (coverflow / parallax with no matching markup) removed.
   ========================================================================== */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1100px)').matches && !reduce;
const rand = (a, b) => a + Math.random() * (b - a);
const PALETTE = ['#f7c75e', '#ffe9a8', '#ffffff', '#d9a63a', '#7fa8ff', '#2f6bff', '#fff3c4'];
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- reference-counted page scroll lock (modals + lightbox share it) ---------- */
const scrollLock = (() => {
  let n = 0;
  return {
    add() { if (n++ === 0) document.body.classList.add('profile-scroll-locked'); },
    remove() { if (n > 0 && --n === 0) document.body.classList.remove('profile-scroll-locked'); }
  };
})();

/* ---------- club crest fallback (remote crest fails -> bundled local crest) ---------- */
(function crestFallback() {
  const recover = img => {
    if (!(img instanceof HTMLImageElement) || !img.dataset.fb) return;
    if (!img.dataset.fbTried) { img.dataset.fbTried = '1'; img.src = img.dataset.fb; }
    else img.hidden = true;
  };
  // error events do not bubble, but they can be captured on document
  document.addEventListener('error', e => recover(e.target), true);
  // images that already failed before this script ran
  $$('img[data-fb]').forEach(img => { if (img.complete && img.naturalWidth === 0 && img.currentSrc) recover(img); });
})();

/* ---------- background music (LFCL anthem, original file, looped) ---------- */
(function music() {
  const audio = $('#bgMusic'), btn = $('#musicToggle');
  const M = window.LFCLMusic = { attempt: () => Promise.resolve(true), enter: () => Promise.resolve() };
  if (!audio || !btn) return;
  const label = $('.mt-label', btn);
  const VOL = 1;
  let wantOn = true;       // visitor's intent: on until they press the button to mute
  let blocked = false;     // browser refused to autoplay with sound
  let fadeId = 0, resumeOnShow = false;

  const setUI = mode => {  // 'on' | 'off' | 'tap'
    btn.classList.toggle('is-on', mode === 'on');
    btn.classList.toggle('needs-tap', mode === 'tap');
    btn.setAttribute('aria-pressed', mode === 'on' ? 'true' : 'false');
    btn.setAttribute('aria-label', mode === 'on' ? 'Mute music' : 'Turn music on');
    label.textContent = mode === 'on' ? 'MUSIC ON' : mode === 'tap' ? 'TAP FOR MUSIC' : 'MUSIC OFF';
  };
  const fade = (to, ms, done) => {
    cancelAnimationFrame(fadeId);
    const from = audio.volume, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      try { audio.volume = from + (to - from) * k; } catch (e) { /* iOS: fixed volume */ }
      if (k < 1) fadeId = requestAnimationFrame(step); else if (done) done();
    };
    fadeId = requestAnimationFrame(step);
  };
  // start playback; returns 'playing' | 'blocked' | 'error'
  const play = () => {
    audio.muted = false;
    try { audio.volume = 0; } catch (e) { /* ignore */ }
    let p;
    try { p = audio.play(); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).then(() => {
      blocked = false; wantOn = true; setUI('on'); fade(VOL, 1800); return 'playing';
    }, err => {
      if (err && err.name === 'NotAllowedError') { blocked = true; setUI('tap'); return 'blocked'; }
      setUI('off'); return 'error';
    });
  };

  // used by the loader: resolves false only when the browser blocked sound
  M.attempt = () => Promise.race([play(), new Promise(r => setTimeout(() => r('slow'), 2500))]).then(r => r !== 'blocked');
  M.enter = withSound => {
    if (withSound) return play();
    wantOn = false; setUI('off'); return Promise.resolve();
  };

  // top-bar toggle
  btn.addEventListener('click', () => {
    if (audio.paused) { wantOn = true; play(); return; }
    if (wantOn) {           // mute
      wantOn = false; setUI('off');
      fade(0, 400, () => { if (!wantOn) audio.muted = true; });
    } else {                // unmute
      wantOn = true; audio.muted = false; setUI('on'); fade(VOL, 900);
    }
  });

  // safety net: if sound was blocked, the first real tap / key press starts it
  const unlock = e => {
    if (!blocked || !wantOn || !audio.paused) return;
    if (e.target && e.target.closest && e.target.closest('#musicToggle,#loader')) return;
    play().then(r => { if (r === 'playing') ['pointerdown', 'touchend', 'click', 'keydown'].forEach(t => removeEventListener(t, unlock, true)); });
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(t => addEventListener(t, unlock, { capture: true, passive: true }));

  // pause while the tab is in the background, resume when it comes back
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (!audio.paused) { resumeOnShow = true; audio.pause(); } }
    else if (resumeOnShow) { resumeOnShow = false; audio.play().catch(() => { blocked = true; setUI('tap'); }); }
  });
})();

/* ---------- loader (never blocks on slow fonts / network) ---------- */
(function loader() {
  const el = $('#loader');
  let done = false, started = false;
  const hide = () => {
    if (done) return; done = true;
    if (el) { el.classList.add('done'); setTimeout(() => el.remove(), 900); } // remove => its animations stop for good
    document.body.classList.add('ready');
  };
  // browsers only allow sound after a tap: if autoplay is refused, ask for one tap on the loader
  const gate = () => {
    const g = $('#loaderGate'), enter = $('#loaderEnter');
    if (!el || !g || !enter) return hide();
    el.classList.add('gated'); g.hidden = false;
    // a tap anywhere on the opening screen enters the site with the music
    el.addEventListener('click', () => { window.LFCLMusic.enter(true); hide(); }, { once: true });
    enter.focus({ preventScroll: true });
  };
  const proceed = () => {
    if (started) return; started = true;
    window.LFCLMusic.attempt().then(ok => ok ? hide() : gate());
  };
  if (document.readyState === 'complete') setTimeout(proceed, 450);
  else addEventListener('load', () => setTimeout(proceed, 550), { once: true });
  setTimeout(proceed, 4000);
})();

/* ---------- pause everything when the tab is hidden ---------- */
document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('tab-hidden', document.hidden));

/* ---------- cursor glow (desktop pointers only, one transform per frame) ---------- */
(function cursorGlow() {
  const glow = $('#cursorGlow');
  if (!glow || !finePointer || reduce) return;
  let gx = 0, gy = 0, queued = false;
  addEventListener('pointermove', e => {
    gx = e.clientX; gy = e.clientY;
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; glow.style.transform = `translate3d(${gx}px,${gy}px,0) translate(-50%,-50%)`; });
  }, { passive: true });
})();

/* ---------- mobile menu ---------- */
(function menu() {
  const toggle = $('#menuToggle'), links = $('#navLinks');
  if (!toggle || !links) return;
  const set = open => { links.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); };
  toggle.addEventListener('click', () => set(!links.classList.contains('open')));
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => set(false)));
  document.addEventListener('click', e => { if (links.classList.contains('open') && !e.target.closest('.nav')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) { set(false); toggle.focus(); } });
})();

/* ---------- split-text heading animation ---------- */
function splitHeading(h) {
  if (h.dataset.split) return; h.dataset.split = 1;
  h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim()); // screen readers read the heading once, not letter by letter
  let n = 0;
  const walk = node => {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w.trim()) { f.append(w); return; }
          const word = document.createElement('span'); word.className = 'w'; word.setAttribute('aria-hidden', 'true');
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.setProperty('--d', (n++ * 28) + 'ms'); word.append(s); });
          f.append(word);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
  };
  walk(h);
}
$$('main h2').forEach(splitHeading);

/* ---------- reveal on scroll ---------- */
$$('.guest-grid,.team-grid,.feature-grid,.contact-grid,.about-strip').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
const revealIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target;
  el.classList.add('visible');
  revealIO.unobserve(el);
  // once the entrance has played, drop the stagger delay so hover / tilt respond instantly
  if (el.classList.contains('reveal')) setTimeout(() => el.classList.add('reveal-done'), 1300 + (+el.style.getPropertyValue('--i') || 0) * 120);
}), { threshold: .12 });
$$('.reveal,main h2').forEach(el => revealIO.observe(el));

/* ---------- animated counters (rAF, eased) ---------- */
const counterIO = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  counterIO.unobserve(en.target);
  const el = en.target, target = +el.dataset.count;
  if (reduce) { el.textContent = String(target).padStart(2, '0'); return; }
  const t0 = performance.now(), dur = 900;
  (function step(t) {
    const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(target * eased)).padStart(2, '0');
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}), { threshold: .5 });
$$('[data-count]').forEach(el => counterIO.observe(el));

/* ---------- typed rotating words (sleeps while the hero is off-screen) ---------- */
(function typed() {
  const el = $('#typed'); if (!el || reduce) return;
  const words = ['One unforgettable celebration.', 'One trophy to chase.', 'One roar from the stands.', 'One night of glory.'];
  let w = 0, i = 0, del = false, timer = 0, heroVisible = true;
  function tick() {
    timer = 0;
    if (!heroVisible || document.hidden) return;           // resume() restarts it
    const word = words[w]; i += del ? -1 : 1; el.textContent = word.slice(0, i);
    let d = del ? 28 : 60;
    if (!del && i === word.length) { del = true; d = 1700; }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; d = 380; }
    timer = setTimeout(tick, d);
  }
  const resume = () => { if (!timer && heroVisible && !document.hidden) timer = setTimeout(tick, 200); };
  const hero = $('#home');
  if (hero) new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; resume(); }).observe(hero);
  document.addEventListener('visibilitychange', resume);
  tick();
})();

/* ---------- gold particle fields (hero + dark sections; desktop only) ---------- */
function initFxMain(cv) {
  if (reduce || matchMedia('(max-width:900px)').matches) return;
  const host = cv.parentElement, ctx = cv.getContext('2d');
  let W, H, parts = [], mouse = { x: -999, y: -999 }, vis = false, raf = 0;
  function size() {
    const r = host.getBoundingClientRect(); W = cv.width = r.width; H = cv.height = r.height;
    parts = Array.from({ length: Math.min(22, Math.floor(W * H / 52000)) }, mk);
  }
  function mk() {
    const kind = Math.random() < .35 ? 'star' : Math.random() < .5 ? 'dot' : 'rect';
    return { x: rand(0, W), y: rand(0, H), r: rand(1.2, 4), vx: rand(-.15, .15), vy: rand(-.5, -.08), c: PALETTE[Math.floor(rand(0, PALETTE.length))], kind, rot: rand(0, 6.28), vr: rand(-.03, .03), tw: rand(0, 6.28), a: rand(.35, .95) };
  }
  function star(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rad = i % 2 ? r * .35 : r * 1.8; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill();
  }
  function frame() {
    raf = 0; if (!vis || document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y; let d = 0;
      if (Math.abs(dx) < 120 && Math.abs(dy) < 120) d = Math.hypot(dx, dy);
      if (d > 0 && d < 120) { const f = (120 - d) / 120; p.x += dx / d * f * 3.2; p.y += dy / d * f * 3.2; }
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.tw += .04;
      if (p.y < -12) { p.y = H + 12; p.x = rand(0, W); } if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
      ctx.globalAlpha = p.a * (.6 + .4 * Math.sin(p.tw)); ctx.fillStyle = p.c;
      if (p.kind === 'star') star(p.x, p.y, p.r, p.rot);
      else if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .7, 0, 6.28); ctx.fill(); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r / 2, p.r * 2.2, p.r); ctx.restore(); }
    }
    ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', wake);
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) wake(); }).observe(host);
  addEventListener('resize', debounce(size, 200));
  if (finePointer) {
    host.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
    host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
  }
  size();
}

/* Particle fields run in a Web Worker on an OffscreenCanvas, so the main thread is not woken up
   60 times a second (that wake-up is what made every CSS animation on the page re-evaluate each frame). */
const FX_WORKER_SRC = `
const PALETTE=${JSON.stringify(PALETTE)};
const rand=(a,b)=>a+Math.random()*(b-a);
const raf=self.requestAnimationFrame?f=>self.requestAnimationFrame(f):f=>setTimeout(f,16);
const fields=[];
function mk(f){const kind=Math.random()<.35?'star':Math.random()<.5?'dot':'rect';
  return{x:rand(0,f.W),y:rand(0,f.H),r:rand(1.2,4),vx:rand(-.15,.15),vy:rand(-.5,-.08),c:PALETTE[Math.floor(rand(0,PALETTE.length))],kind,rot:rand(0,6.28),vr:rand(-.03,.03),tw:rand(0,6.28),a:rand(.35,.95)};}
function size(f,W,H){f.W=f.cv.width=W;f.H=f.cv.height=H;f.parts=Array.from({length:Math.min(22,Math.floor(W*H/52000))},()=>mk(f));}
function star(ctx,x,y,r,rot){ctx.beginPath();for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,rad=i%2?r*.35:r*1.8;ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}ctx.closePath();ctx.fill();}
function frame(f){f.raf=0;if(!f.vis)return;const ctx=f.ctx;ctx.clearRect(0,0,f.W,f.H);
  for(const p of f.parts){const dx=p.x-f.mx,dy=p.y-f.my;let d=0;
    if(Math.abs(dx)<120&&Math.abs(dy)<120)d=Math.hypot(dx,dy);
    if(d>0&&d<120){const k=(120-d)/120;p.x+=dx/d*k*3.2;p.y+=dy/d*k*3.2;}
    p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.tw+=.04;
    if(p.y<-12){p.y=f.H+12;p.x=rand(0,f.W);}if(p.x<-12)p.x=f.W+12;if(p.x>f.W+12)p.x=-12;
    ctx.globalAlpha=p.a*(.6+.4*Math.sin(p.tw));ctx.fillStyle=p.c;
    if(p.kind==='star')star(ctx,p.x,p.y,p.r,p.rot);
    else if(p.kind==='dot'){ctx.beginPath();ctx.arc(p.x,p.y,p.r*.7,0,6.28);ctx.fill();}
    else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-p.r,-p.r/2,p.r*2.2,p.r);ctx.restore();}}
  ctx.globalAlpha=1;f.raf=raf(()=>frame(f));}
onmessage=e=>{const m=e.data;
  if(m.t==='init'){const f={cv:m.canvas,ctx:m.canvas.getContext('2d'),vis:false,raf:0,mx:-999,my:-999,parts:[]};fields[m.id]=f;size(f,m.W,m.H);}
  else{const f=fields[m.id];if(!f)return;
    if(m.t==='size')size(f,m.W,m.H);
    else if(m.t==='mouse'){f.mx=m.x;f.my=m.y;}
    else if(m.t==='vis'){f.vis=m.v;if(m.v&&!f.raf)f.raf=raf(()=>frame(f));}}};
`;
let fxWorker = null;
const canOffscreen = typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined' && typeof Blob !== 'undefined' &&
  'transferControlToOffscreen' in HTMLCanvasElement.prototype;
function initFx(cv, id) {
  if (reduce || matchMedia('(max-width:900px)').matches) return;
  if (!canOffscreen) return initFxMain(cv);
  const host = cv.parentElement, send = m => fxWorker.postMessage(Object.assign({ id }, m));
  const dims = () => { const r = host.getBoundingClientRect(); return { W: r.width, H: r.height }; };
  try {
    if (!fxWorker) fxWorker = new Worker(URL.createObjectURL(new Blob([FX_WORKER_SRC], { type: 'text/javascript' })));
    const off = cv.transferControlToOffscreen();
    fxWorker.postMessage(Object.assign({ id, t: 'init', canvas: off }, dims()), [off]);
  } catch (err) { return initFxMain(cv); }
  new IntersectionObserver(es => send({ t: 'vis', v: es[0].isIntersecting })).observe(host);
  addEventListener('resize', debounce(() => send(Object.assign({ t: 'size' }, dims())), 200));
  if (finePointer) {
    host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); send({ t: 'mouse', x: e.clientX - r.left, y: e.clientY - r.top }); }, { passive: true });
    host.addEventListener('pointerleave', () => send({ t: 'mouse', x: -999, y: -999 }));
  }
}
$$('canvas.fx').forEach(initFx);

/* ---------- confetti cannon (canvas is only displayed while confetti is flying) ---------- */
const confetti = (function () {
  const cv = $('#confetti'); if (!cv) return () => {};
  const ctx = cv.getContext('2d'); let bits = [], run = false;
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
  fit(); addEventListener('resize', debounce(fit, 200)); cv.style.display = 'none';
  function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter(b => b.y < cv.height + 30 && b.life > 0);
    for (const b of bits) {
      b.vy += .14; b.vx *= .992; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life--;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c; ctx.globalAlpha = Math.min(1, b.life / 40);
      if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.s / 2, 0, 6.28); ctx.fill(); } else ctx.fillRect(-b.s, -b.s / 2, b.s * 2, b.s);
      ctx.restore();
    }
    if (bits.length) requestAnimationFrame(loop);
    else { run = false; ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
  }
  return function (x = innerWidth / 2, y = innerHeight * .6, n = 110) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * .95, -Math.PI * .05), sp = rand(5, 15);
      bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rand(4, 9), c: PALETTE[Math.floor(rand(0, PALETTE.length))], rot: rand(0, 6), vr: rand(-.3, .3), life: rand(90, 170), round: Math.random() < .3 });
    }
    if (!run) { run = true; cv.style.display = 'block'; requestAnimationFrame(loop); }
  };
})();

/* ---------- scroll state: progress bar, nav style, active link (single rAF, no layout reads) ---------- */
const navLinks = $$('.nav-links a[href^="#"]');
const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
const navEl = $('.nav'), progress = $('#scrollProgress');

/* pause infinite CSS animations in sections that are off-screen (CSS does the pausing via .is-offscreen) */
const animIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-offscreen', !e.isIntersecting)), { rootMargin: '0px' });
$$('main>section,.ticker,.footer-sponsors').forEach(el => animIO.observe(el)); // pause animations of everything not actually on screen

const navIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
secs.forEach(sec => navIO.observe(sec));

let ticking = false, maxScroll = 0;
const measure = () => { maxScroll = document.documentElement.scrollHeight - innerHeight; };
measure();
// page height changes while lazy images load / panels open — observe instead of measuring on every scroll
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body); else addEventListener('load', measure);
addEventListener('resize', debounce(measure, 150));
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    if (progress) progress.style.transform = `scaleX(${maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0})`;
    if (navEl) navEl.classList.toggle('scrolled', scrollY > 40);
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- 3D tilt (desktop pointers only) + magnetic buttons ---------- */
if (fine) {
  $$('.team-card,.contact-card,.feature,.strip-card,.intro-stat-card,.quiz-panel,.guest-card,.guest-chief').forEach(card => {
    let q = false, ex = 0, ey = 0;
    card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
    card.addEventListener('pointermove', e => {
      ex = e.clientX; ey = e.clientY; if (q) return; q = true;
      requestAnimationFrame(() => {
        q = false;
        const r = card.getBoundingClientRect();                  // read first, then write (one layout per frame)
        const x = (ex - r.left) / r.width - .5, y = (ey - r.top) / r.height - .5;
        card.style.setProperty('--sx', (x * 100 + 50) + '%'); card.style.setProperty('--sy', (y * 100 + 50) + '%');
        card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg) translateY(-6px)`;
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => { card.classList.remove('is-tilting'); card.style.transform = ''; });
  });
  $$('.btn,.nav-cta').forEach(b => {
    let r = null;
    b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
    b.addEventListener('pointermove', e => { if (!r) r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .14}px,${(e.clientY - r.top - r.height / 2) * .2}px)`; }, { passive: true });
    b.addEventListener('pointerleave', () => { r = null; b.style.transform = ''; });
  });
}

/* ---------- toast ---------- */
let toastTimer;
function showToast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1200);
}

/* ---------- quiz ---------- */
const questions = [
  { q: 'Which country won the 2022 FIFA World Cup?', a: ['France', 'Argentina', 'Brazil', 'Germany'], c: 1, why: 'Argentina beat France on penalties in Qatar.', img: 0 },
  { q: 'Which club won its first Champions League title in 2025?', a: ['Inter Milan', 'Arsenal', 'Paris Saint-Germain', 'Dortmund'], c: 2, why: 'PSG beat Inter Milan 5–0 in the 2025 final.', img: 4 },
  { q: 'Which club won the 2019 Champions League final in Madrid?', a: ['Tottenham', 'Liverpool', 'Ajax', 'Chelsea'], c: 1, why: 'Liverpool beat Tottenham 2–0 to win their sixth European Cup.', img: 2 },
  { q: 'Which club does Lamine Yamal play for?', a: ['Real Madrid', 'Valencia', 'Barcelona', 'Sevilla'], c: 2, why: 'Yamal came through La Masia and wears No. 10 at Barcelona.', img: 1 },
  { q: 'Which club is famously known as “The Old Lady”?', a: ['Juventus', 'Arsenal', 'Barcelona', 'AC Milan'], c: 0, why: 'Juventus is nicknamed La Vecchia Signora — The Old Lady.', img: 3 },
  { q: 'Who won the 2018 FIFA World Cup?', a: ['Croatia', 'Germany', 'France', 'Spain'], c: 2, why: 'France defeated Croatia 4–2 in the 2018 final.', img: 0 },
  { q: 'Which country hosted the 2014 FIFA World Cup?', a: ['South Africa', 'Brazil', 'Russia', 'Germany'], c: 1, why: 'Brazil hosted the 2014 tournament.', img: 4 }
];
let qi = 0, score = 0, answered = false;
const count = $('#quizCount'), scoreEl = $('#quizScore'), bar = $('#quizProgress'), question = $('#quizQuestion'),
  options = $('#quizOptions'), feedback = $('#quizFeedback'), next = $('#quizNext');
const stageImgs = $$('#quizStage img'); let stageIdx = 0, quizVisible = false;
function showStage(i) {
  if (!stageImgs.length) return;
  stageImgs[stageIdx].classList.remove('on');
  stageIdx = ((i % stageImgs.length) + stageImgs.length) % stageImgs.length;
  const el = stageImgs[stageIdx]; void el.offsetWidth; el.classList.add('on');
}
if (stageImgs.length && !reduce) {
  const quizSec = $('#quiz');
  if (quizSec) new IntersectionObserver(es => { quizVisible = es[0].isIntersecting; }).observe(quizSec);
  setInterval(() => { if (quizVisible && !document.hidden) showStage(stageIdx + 1); }, 6000);
}
function renderQuestion() {
  answered = false; const q = questions[qi];
  count.textContent = `QUESTION ${String(qi + 1).padStart(2, '0')} / ${String(questions.length).padStart(2, '0')}`;
  scoreEl.textContent = `SCORE ${score}`;
  bar.style.width = `${qi / questions.length * 100}%`; question.textContent = q.q; feedback.textContent = ''; next.disabled = true;
  next.textContent = qi === questions.length - 1 ? 'SEE MY SCORE →' : 'NEXT QUESTION →';
  options.innerHTML = ''; showStage(q.img);
  q.a.forEach((answer, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-option'; b.style.setProperty('--i', i);
    b.textContent = String.fromCharCode(65 + i) + '.  ' + answer; b.addEventListener('click', e => choose(i, e)); options.appendChild(b);
  });
}
function choose(i, e) {
  if (answered) return; answered = true; const q = questions[qi];
  [...options.children].forEach((b, n) => { b.disabled = true; if (n === q.c) b.classList.add('correct'); if (n === i && i !== q.c) b.classList.add('wrong'); });
  if (i === q.c) {
    score++; feedback.textContent = '✓ CORRECT! ' + q.why; feedback.style.color = 'var(--good)'; showToast('GOAL! ⚽');
    const r = e.currentTarget.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 60);
  } else { feedback.textContent = '✕ NOT QUITE. ' + q.why; feedback.style.color = '#e0314f'; }
  scoreEl.textContent = `SCORE ${score}`; next.disabled = false;
}
next.addEventListener('click', () => {
  if (!answered && !next.dataset.done) return;
  if (next.dataset.done) { qi = 0; score = 0; delete next.dataset.done; renderQuestion(); return; }
  if (qi < questions.length - 1) { qi++; renderQuestion(); }
  else {
    bar.style.width = '100%'; count.textContent = 'CHALLENGE COMPLETE'; question.textContent = `YOU SCORED ${score} / ${questions.length}`; options.innerHTML = '';
    const pct = score / questions.length;
    feedback.textContent = pct === 1 ? 'PERFECT SCORE! YOU ARE A TRUE FOOTBALL CHAMPION. 🏆' : pct >= .6 ? 'GREAT FOOTBALL KNOWLEDGE! KEEP IT UP. ⚽' : 'GOOD TRY! COME BACK STRONGER. 💪';
    feedback.style.color = 'var(--ink2)'; next.textContent = 'PLAY AGAIN ↻'; next.dataset.done = 1; next.disabled = false;
    if (pct >= .6) { confetti(innerWidth * .3, innerHeight * .7, 140); setTimeout(() => confetti(innerWidth * .7, innerHeight * .7, 140), 250); }
  }
});
renderQuestion();

/* ---------- CTA buttons (quiz "Next" is excluded — it already has its own feedback) ---------- */
$$('.btn:not(.quiz-next)').forEach(btn => btn.addEventListener('click', e => {
  if (btn.getAttribute('href')?.startsWith('#')) return;
  showToast('LET THE GAME BEGIN! ⚽'); confetti(e.clientX, e.clientY, 50);
}));

/* ---------- team + organiser profile viewers (carousel modals) ---------- */
(function initProfileViewers() {
  const teamCards = $$('.team-card'), organiserCards = $$('.organiser-card');
  const teamModal = $('#teamProfileModal'), organiserModal = $('#organiserProfileModal');
  if (!teamModal || !organiserModal) return;
  const teamData = teamCards.map(card => {
    const img = card.querySelector('.team-emblem img');
    return {
      name: card.querySelector('h3')?.textContent.trim() || 'LFCL TEAM',
      crest: img?.getAttribute('src') || '', crestAlt: img?.getAttribute('alt') || 'Team crest', crestFb: img?.dataset.fb || '',
      owners: [...card.querySelectorAll('.owner-person')].map(p => ({
        name: p.querySelector('span')?.textContent.trim() || p.querySelector('img')?.alt || 'Team owner',
        photo: p.querySelector('img')?.getAttribute('src') || ''
      }))
    };
  });
  const organiserData = organiserCards.map(card => ({
    name: card.querySelector('h3')?.textContent.trim() || 'Tournament organiser',
    photo: card.querySelector('.organiser-photo')?.getAttribute('src') || '',
    phone: card.querySelector('b')?.textContent.trim() || '',
    href: card.getAttribute('href') || '#'
  }));
  let activeType = null, activeIndex = 0, lastFocus = null, touchStartX = 0, touchStartY = 0;
  const modals = { team: teamModal, organiser: organiserModal };
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase() || 'LF';
  function setImage(container, src, name) {
    container.innerHTML = '';
    const initialsEl = () => { const f = document.createElement('div'); f.className = 'profile-initials'; f.textContent = initials(name); return f; };
    if (!src) { container.append(initialsEl()); return; }
    const img = document.createElement('img'); img.src = src; img.alt = name; img.decoding = 'async';
    img.addEventListener('error', () => img.replaceWith(initialsEl()), { once: true });
    container.append(img);
  }
  function renderTeam() {
    const data = teamData[activeIndex]; if (!data) return;
    $('#teamModalName').textContent = data.name;
    teamModal.querySelector('.profile-count').textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(teamData.length).padStart(2, '0')}`;
    const crest = $('#teamModalCrest');
    crest.onerror = () => {
      if (data.crestFb && crest.getAttribute('src') !== data.crestFb) { crest.src = data.crestFb; return; }
      crest.onerror = null; const f = document.createElement('div'); f.className = 'profile-initials'; f.textContent = initials(data.name); crest.parentElement.replaceChildren(f);
    };
    crest.src = data.crest; crest.alt = data.crestAlt;
    const people = $('#teamModalPeople'); people.innerHTML = '';
    data.owners.forEach((owner, i) => {
      const person = document.createElement('div'); person.className = 'profile-person'; person.style.animationDelay = `${i * 90}ms`;
      const photo = document.createElement('div'); photo.className = 'profile-person-photo'; setImage(photo, owner.photo, owner.name);
      const name = document.createElement('div'); name.className = 'profile-person-name'; name.textContent = owner.name;
      person.append(photo, name); people.append(person);
    });
    teamModal.querySelectorAll('.profile-arrow').forEach(b => b.hidden = teamData.length < 2);
  }
  function renderOrganiser() {
    const data = organiserData[activeIndex]; if (!data) return;
    $('#organiserModalName').textContent = data.name;
    organiserModal.querySelector('.profile-count').textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(organiserData.length).padStart(2, '0')}`;
    setImage($('#organiserModalPhoto'), data.photo, data.name);
    const call = $('#organiserModalCall'); call.href = data.href; call.innerHTML = `CALL ${data.phone || 'ORGANISER'} <span>↗</span>`;
    organiserModal.querySelectorAll('.profile-arrow').forEach(b => b.hidden = organiserData.length < 2);
  }
  function open(type, index) {
    if (activeType) close(true);
    lastFocus = document.activeElement; activeType = type; activeIndex = index;
    (type === 'team' ? renderTeam : renderOrganiser)();
    const modal = modals[type]; modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); scrollLock.add();
    requestAnimationFrame(() => modal.querySelector('.profile-dialog')?.focus());
  }
  function close(silent) {
    if (!activeType) return;
    const modal = modals[activeType]; modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); activeType = null; scrollLock.remove();
    if (!silent && lastFocus?.focus) lastFocus.focus();
  }
  function move(direction) {
    if (!activeType) return;
    const length = activeType === 'team' ? teamData.length : organiserData.length; if (length < 2) return;
    activeIndex = (activeIndex + direction + length) % length; (activeType === 'team' ? renderTeam : renderOrganiser)();
  }
  teamCards.forEach((card, i) => {
    card.setAttribute('tabindex', '0'); card.setAttribute('role', 'button'); card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Open ${teamData[i]?.name || 'team'} profile`);
    // a click on an owner's photo opens the photo lightbox instead of the profile
    card.addEventListener('click', e => { if (e.target.closest('.owner-person img')) return; open('team', i); });
    card.addEventListener('keydown', e => { if (e.target !== card) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('team', i); } });
  });
  organiserCards.forEach((card, i) => {
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', e => { e.preventDefault(); if (e.target.closest('.organiser-photo')) return; open('organiser', i); });
  });
  Object.entries(modals).forEach(([type, modal]) => {
    modal.querySelector('.profile-close').addEventListener('click', () => close());
    modal.querySelector('.profile-prev').addEventListener('click', () => move(-1));
    modal.querySelector('.profile-next').addEventListener('click', () => move(1));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('touchstart', e => { if (activeType !== type) return; touchStartX = e.changedTouches[0].clientX; touchStartY = e.changedTouches[0].clientY; }, { passive: true });
    modal.addEventListener('touchend', e => {
      if (activeType !== type) return;
      const dx = e.changedTouches[0].clientX - touchStartX, dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1);
    }, { passive: true });
  });
  document.addEventListener('keydown', e => {
    if (!activeType) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (e.key === 'Tab') {                                   // keep keyboard focus inside the dialog
      const f = $$('button:not([hidden]),a[href]', modals[activeType]).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], dlg = modals[activeType].querySelector('.profile-dialog');
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();

/* ---------- team directory search (Ctrl/⌘+K) ---------- */
(function initTeamDirectory() {
  const input = $('#teamSearch'), cards = $$('.team-card'), result = $('#teamResults'), grid = $('.team-grid');
  if (!input || !cards.length) return;
  const index = cards.map(card => (card.textContent + ' ' + (card.dataset.country || '')).toLocaleLowerCase());
  let empty = null;
  const filter = () => {
    const term = input.value.trim().toLocaleLowerCase(); let visible = 0;
    cards.forEach((card, i) => { const match = index[i].includes(term); card.hidden = !match; if (match) visible++; });
    result.textContent = `SHOWING ${visible} OF ${cards.length} TEAMS`;
    if (!visible) {
      if (!empty) { empty = document.createElement('p'); empty.className = 'team-empty'; empty.setAttribute('role', 'status'); grid.after(empty); }
      empty.textContent = `No team, country or owner matches “${input.value.trim()}”. Try “Italy”, “Milan” or an owner’s name.`; empty.hidden = false;
    } else if (empty) empty.hidden = true;
  };
  input.addEventListener('input', filter);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); }
    if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; filter(); input.blur(); }
  });
})();

/* ---------- full-size circular portrait lightbox ---------- */
(function initPortraitLightbox() {
  const layer = $('#portraitLightbox'), image = $('#portraitLightboxImage'), name = $('#portraitLightboxName');
  if (!layer || !image || !name) return;
  let previousFocus = null;
  function open(src, label, trigger) {
    if (!src) return;
    previousFocus = trigger || document.activeElement; image.src = src; image.alt = label || 'Enlarged profile photograph'; name.textContent = label || 'LFCL PROFILE';
    layer.classList.add('is-open'); layer.setAttribute('aria-hidden', 'false'); scrollLock.add(); layer.querySelector('button').focus();
  }
  function close() {
    if (!layer.classList.contains('is-open')) return;
    layer.classList.remove('is-open'); layer.setAttribute('aria-hidden', 'true'); scrollLock.remove(); image.removeAttribute('src');
    if (previousFocus && previousFocus.focus && document.contains(previousFocus)) previousFocus.focus();
  }
  document.addEventListener('click', e => {
    const photo = e.target.closest('.owner-person img, .organiser-photo, .profile-person-photo img, #organiserModalPhoto img');
    if (!photo) return;
    const label = photo.closest('.owner-person')?.querySelector('span')?.textContent || photo.closest('.profile-person')?.querySelector('.profile-person-name')?.textContent ||
      photo.closest('.organiser-card')?.querySelector('h3')?.textContent || $('#organiserModalName')?.textContent || photo.alt;
    open(photo.currentSrc || photo.src, label, photo.parentElement);
  });
  layer.querySelector('.portrait-lightbox-close').addEventListener('click', close);
  layer.addEventListener('click', e => { if (e.target === layer) close(); });
  document.addEventListener('keydown', e => { if (layer.classList.contains('is-open') && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
})();

/* ---------- auction countdown: 25 Nov 2026, 6:30 PM IST (same moment for every visitor) ---------- */
(function auctionCountdown() {
  const box = $('#auctionCount'); if (!box) return;
  const target = new Date('2026-11-25T18:30:00+05:30');
  const els = {}; box.querySelectorAll('b[data-u]').forEach(b => els[b.dataset.u] = b);
  const pad = n => String(n).padStart(2, '0');
  let timer = 0;
  function tick() {
    const diff = target - new Date();
    if (diff <= 0) {
      const over = new Date() - target; box.classList.add('is-live');
      box.innerHTML = over < 6 * 3600e3 ? '<span class="live-badge">● AUCTION LIVE NOW</span>' : '<span class="live-badge done">AUCTION COMPLETED</span>';
      clearInterval(timer); return;
    }
    const s = Math.floor(diff / 1000);
    els.d.textContent = pad(Math.floor(s / 86400)); els.h.textContent = pad(Math.floor(s % 86400 / 3600));
    els.m.textContent = pad(Math.floor(s % 3600 / 60)); els.s.textContent = pad(s % 60);
  }
  timer = setInterval(tick, 1000); tick();
})();

/* ---------- venue turf slideshow: automatic, one photo at a time ---------- */
(function turfSlideshow() {
  const root = $('#turfShow'); if (!root) return;
  const slides = $$('#turfShow .turf-slide'), dots = $$('#turfShow .turf-dot'), bar = $('#turfShow .turf-progress i');
  let cur = 0, timer = 0, busy = false;
  const restartBar = () => { root.classList.add('restart'); void root.offsetWidth; root.classList.remove('restart'); };
  function go(n) {
    n = (n + slides.length) % slides.length; if (n === cur || busy) return; busy = true;
    const old = slides[cur], nxt = slides[n];
    old.classList.remove('on'); old.classList.add('leaving');
    nxt.classList.remove('leaving'); void nxt.offsetWidth; nxt.classList.add('on');
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    cur = n; restartBar();
    setTimeout(() => { old.classList.remove('leaving'); busy = false; }, 1100);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); if (reduce) { clearInterval(timer); timer = setInterval(() => go(cur + 1), 5000); } }));
  if (reduce) timer = setInterval(() => go(cur + 1), 5000);
  else if (bar) bar.addEventListener('animationend', e => { if (e.animationName === 'turfProg') go(cur + 1); });
  let sx = 0, sy = 0;
  root.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY; }, { passive: true });
  root.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();

/* ---------- tournament fixtures: 28 group matches (single round-robin) + 4 playoffs ---------- */
(function fixtures() {
  const toggle = $('#fixturesToggle'), panel = $('#fixturesPanel'), tabs = $('#fixtureTabs'), list = $('#fixtureList'), heading = $('#fixtureRoundHeading');
  if (!toggle || !panel || !tabs || !list || !heading) return;
  // reuse the crest source + fallback configured in the Teams section
  const clubs = {};
  $$('.team-card').forEach(card => {
    const title = card.querySelector('h3')?.textContent.trim().toLocaleLowerCase(), image = card.querySelector('.team-emblem img');
    if (!title || !image) return;
    const entry = { logo: image.getAttribute('src') || '', fallback: image.dataset.fb || '', alt: image.alt || `${title} crest` };
    if (title.includes('borussia dortmund')) clubs['Borussia Dortmund'] = entry;
    else if (title.includes('juventus')) clubs['Juventus'] = entry;
    else if (title.includes('arsenal')) clubs['Arsenal'] = entry;
    else if (title.includes('real madrid')) clubs['Real Madrid'] = entry;
    else if (title.includes('manchester united')) clubs['Man United'] = entry;
    else if (title.includes('barcelona')) clubs['FC Barcelona'] = entry;
    else if (title.includes('ac milan')) clubs['AC Milan'] = entry;
    else if (title.includes('paris saint-germain')) clubs['Paris Saint-Germain'] = entry;
  });
  /* Matches M1–M28 exactly as printed on the official LFCL fixture sheet (do not 'correct' without the organisers). */
  const rounds = [
    ['Borussia Dortmund|Juventus', 'Arsenal|Real Madrid', 'Man United|FC Barcelona', 'AC Milan|Paris Saint-Germain'],
    ['FC Barcelona|Juventus', 'Borussia Dortmund|Real Madrid', 'Paris Saint-Germain|Arsenal', 'AC Milan|Man United'],
    ['Borussia Dortmund|Man United', 'Arsenal|AC Milan', 'Juventus|FC Barcelona', 'Real Madrid|Paris Saint-Germain'],
    ['Borussia Dortmund|AC Milan', 'Man United|Paris Saint-Germain', 'Arsenal|FC Barcelona', 'Juventus|Real Madrid'],
    ['Borussia Dortmund|Paris Saint-Germain', 'AC Milan|FC Barcelona', 'Man United|Real Madrid', 'Juventus|Arsenal'],
    ['Borussia Dortmund|FC Barcelona', 'Paris Saint-Germain|Juventus', 'AC Milan|Real Madrid', 'Man United|Arsenal'],
    ['Real Madrid|AC Milan', 'Juventus|Man United', 'Borussia Dortmund|Arsenal', 'FC Barcelona|Paris Saint-Germain']
  ];
  const knockout = [
    { name: 'QUALIFIER 1', a: '1st Place', b: '2nd Place', note: 'Winner advances directly to Final · Loser moves to Qualifier 2', n: 29 },
    { name: 'ELIMINATOR', a: '3rd Place', b: '4th Place', note: 'Winner advances to Qualifier 2 · Loser is eliminated', n: 30 },
    { name: 'QUALIFIER 2', a: 'Loser of Match 29', b: 'Winner of Match 30', note: 'Winner advances to Final · Loser is eliminated', n: 31 },
    { name: 'GRAND FINAL', a: 'Winner of Match 29', b: 'Winner of Match 31', note: 'The winner is crowned LFCL champion', n: 32 }
  ];
  const groups = rounds.map((matches, i) => ({ label: 'ROUND ' + (i + 1), title: 'GROUP STAGE · ROUND ' + (i + 1), matches: matches.map((pair, j) => { const [a, b] = pair.split('|'); return { a, b, n: i * 4 + j + 1 }; }) }));
  groups.push({ label: 'PLAYOFFS', title: 'PLAYOFF & KNOCKOUT STAGE', matches: knockout, playoff: true });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function teamMarkup(name, side) {
    const club = clubs[name];
    if (club) return `<div class="fixture-team ${side}"><img src="${esc(club.logo)}"${club.fallback ? ` data-fb="${esc(club.fallback)}"` : ''} alt="${esc(name)} logo" loading="lazy" decoding="async"><span>${esc(name)}</span></div>`;
    return `<div class="fixture-team ${side}"><span class="fixture-placeholder-crest" aria-hidden="true">🏆</span><span>${esc(name)}</span></div>`;
  }
  let current = 0;
  /* ---------- playoff bracket (navy + gold, connectors drawn from real card positions) ---------- */
  const seed = t => {
    let m = t.match(/^(\d)(?:st|nd|rd|th)/); if (m) return `<i class="po-seed s${m[1]}">${m[1]}</i>`;
    m = t.match(/^(Winner|Loser) of Match (\d+)/); if (m) return `<i class="po-seed ${m[1] === 'Winner' ? 'sw' : 'sl'}">${m[1][0]}${m[2]}</i>`;
    return '<i class="po-seed">•</i>';
  };
  const place = { '1st Place': 'League leaders', '2nd Place': 'Runners-up', '3rd Place': 'Third place', '4th Place': 'Fourth place' };
  const poSlot = t => `<div class="po-slot">${seed(t)}<span><b>${esc(t)}</b>${place[t] ? `<small>${place[t]}</small>` : ''}</span></div>`;
  const poCard = (m, cls, stage, chips, extra = '') => `<div class="po-node po-${cls}"><article class="po-card${extra}"><div class="po-head"><div><small class="po-stage">${stage}</small><h4>${esc(m.name)}</h4></div><span class="po-no">M${m.n}</span></div>${poSlot(m.a)}<div class="po-vs"><em></em>VS<em></em></div>${poSlot(m.b)}<div class="po-chips">${chips}</div></article></div>`;
  function bracket() {
    const [q1, el, q2, fin] = knockout;
    const seeds = [1, 2, 3, 4].map(n => `<li class="po-seedchip"><i class="po-seed s${n}">${n}</i><span><b>${['1st', '2nd', '3rd', '4th'][n - 1]}</b><small>${place[['1st', '2nd', '3rd', '4th'][n - 1] + ' Place']}</small></span></li>`).join('');
    return `<div class="po">
<div class="po-seeds"><div class="po-seeds-lead"><b>TOP 4 ADVANCE</b><small>after the 28 league matches</small></div><ol class="po-seedlist">${seeds}</ol></div>
<div class="po-legend"><span><i class="g"></i>Winner advances</span><span><i class="l"></i>Loser gets a second chance</span><span><i class="x"></i>Eliminated</span></div>
<div class="po-cols" aria-hidden="true"><span>STAGE 1</span><span>STAGE 2</span><span>THE FINAL</span><span>CHAMPION</span></div>
<div class="po-body"><svg class="po-lines" aria-hidden="true"></svg>`
      + poCard(q1, 'q1', 'STAGE 1', '<i class="up">▲ Winner → Final</i><i class="dn">▼ Loser → Qualifier 2</i>')
      + poCard(el, 'el', 'STAGE 1', '<i class="up">▲ Winner → Qualifier 2</i><i class="out">✕ Loser eliminated</i>')
      + poCard(q2, 'q2', 'STAGE 2', '<i class="up">▲ Winner → Final</i><i class="out">✕ Loser eliminated</i>')
      + poCard(fin, 'fin', 'THE FINAL', '<i class="up">★ The winner lifts the trophy</i>', ' po-final')
      + `<div class="po-node po-champ"><div class="po-champ-in"><div class="po-rays" aria-hidden="true"></div><div class="po-trophy" aria-hidden="true">🏆</div><b>LFCL CHAMPION</b><small>SEASON 01</small></div></div></div></div>`;
  }
  const rp = (pts, r = 14) => {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1), k = Math.min(r, l1 / 2, l2 / 2);
      d += `L${x1 - (x1 - x0) / l1 * k} ${y1 - (y1 - y0) / l1 * k}Q${x1} ${y1} ${x1 + (x2 - x1) / l2 * k} ${y1 + (y2 - y1) / l2 * k}`;
    }
    const e = pts[pts.length - 1]; return d + `L${e[0]} ${e[1]}`;
  };
  let pbRO = null, pbIO = null;
  function drawBracket(animate) {
    const body = list.querySelector('.po-body'), svg = body && body.querySelector('.po-lines'); if (!svg) return;
    if (innerWidth <= 900) { svg.innerHTML = ''; return; }
    const R = body.getBoundingClientRect(), n = c => body.querySelector('.po-' + c);
    const box = c => { const r = n(c).getBoundingClientRect(); return { l: r.left - R.left, r: r.right - R.left, t: r.top - R.top, b: r.bottom - R.top, m: (r.top + r.bottom) / 2 - R.top }; };
    const sy = (c, i) => { const node = n(c), r = node.getBoundingClientRect(), s = node.querySelectorAll('.po-slot')[i], sr = s.getBoundingClientRect(); return (sr.top + sr.bottom) / 2 - R.top; };
    const q1 = box('q1'), el = box('el'), q2 = box('q2'), fin = box('fin'), ch = box('champ');
    const gx = q1.r + (q2.l - q1.r) / 2, fx1 = fin.l - 14, fx2 = fin.l - 32;
    const y1w = sy('q1', 0), y1l = sy('q1', 1);                       // outputs leave from the two slot rows
    const lines = [
      ['w', [[q1.r, y1w], [fx1, y1w], [fx1, sy('fin', 0)], [fin.l, sy('fin', 0)]], 0.15],
      ['l', [[q1.r, y1l], [gx, y1l], [gx, sy('q2', 0)], [q2.l, sy('q2', 0)]], 0.45],
      ['w', [[el.r, sy('el', 0)], [gx, sy('el', 0)], [gx, sy('q2', 1)], [q2.l, sy('q2', 1)]], 0.6],
      ['w', [[q2.r, q2.m], [fx2, q2.m], [fx2, sy('fin', 1)], [fin.l, sy('fin', 1)]], 1.05],
      ['g', [[fin.r, fin.m], [ch.l, ch.m]], 1.5]
    ];
    svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`); svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
    svg.innerHTML = lines.map(([k, pts, dl], i) => {
      const d = rp(pts), a = pts[0], z = pts[pts.length - 1];
      return `<path class="po-glow ${k}" d="${d}"/><path class="po-p ${k}${animate ? ' draw' : ''}" style="--d:${dl}s" pathLength="1" d="${d}"/>`
        + `<circle class="po-port ${k}" cx="${a[0]}" cy="${a[1]}" r="3.4"/><circle class="po-port ${k}" cx="${z[0]}" cy="${z[1]}" r="3.4"/>`
        + (reduce ? '' : `<circle class="po-dot ${k}" r="3"><animateMotion dur="${3.2 + i * .3}s" begin="${(dl + 1).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`);
    }).join('');
  }
  function watchBracket() {
    if (pbRO) pbRO.disconnect(); if (pbIO) pbIO.disconnect();
    const body = list.querySelector('.po-body'); if (!body) return;
    if ('ResizeObserver' in window) { let f = 0; pbRO = new ResizeObserver(() => { cancelAnimationFrame(f); f = requestAnimationFrame(() => drawBracket(false)); }); pbRO.observe(body); }
    if ('IntersectionObserver' in window) { const svg = body.querySelector('.po-lines'); pbIO = new IntersectionObserver(es => { try { es[0].isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations(); } catch (e) {} }); pbIO.observe(body); }
  }
  function render(index) {
    current = index; const group = groups[index];
    $$('button', tabs).forEach((b, i) => { b.setAttribute('aria-selected', String(i === index)); b.tabIndex = i === index ? 0 : -1; });
    const at = $$('button', tabs)[index]; if (at) tabs.scrollTo({ left: Math.max(0, at.offsetLeft - (tabs.clientWidth - at.offsetWidth) / 2), behavior: reduce ? 'auto' : 'smooth' });
    panel.dataset.stage = group.playoff ? 'playoffs' : 'group';
    heading.innerHTML = `${group.playoff ? 'PLAYOFF BRACKET · ROAD TO THE FINAL' : group.title}<span>${group.playoff ? 'MATCHES 29–32' : '4 MATCHES'}</span>`;
    list.className = group.playoff ? 'fixture-list is-bracket' : 'fixture-list'; if (!group.playoff && pbRO) { pbRO.disconnect(); pbRO = null; }
    if (group.playoff) { list.innerHTML = bracket(); requestAnimationFrame(() => { drawBracket(true); watchBracket(); }); return; }
    list.innerHTML = group.matches.map((m, i) => `<article class="fixture-match" style="animation-delay:${Math.min(i, 3) * 55}ms"><div class="fixture-match-no">MATCH ${m.n}${m.name ? ' · ' + m.name : ''}</div>${teamMarkup(m.a, 'home')}<span class="fixture-vs">VS</span>${teamMarkup(m.b, 'away')}</article>`).join('');
  }
  groups.forEach((g, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fixture-tab'; b.textContent = g.label;
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => render(i)); tabs.appendChild(b);
  });
  tabs.addEventListener('keydown', e => {                          // arrow-key navigation between rounds
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault();
    const n = (current + (e.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length; render(n); $$('button', tabs)[n].focus();
  });
  let firstRender = true;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open)); panel.hidden = !open;
    if (open && firstRender) { render(0); firstRender = false; }
    if (open) panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  });
})();

/* ---------- section height calibration for content-visibility (keeps #anchor jumps exact) ---------- */
(function calibrateSections() {
  const secs = $$('main>section:not(.hero),.footer-sponsors');
  if (!secs.length || !('contentVisibility' in document.documentElement.style)) return;
  function run() {
    const y = scrollY;
    secs.forEach(s => { s.style.contentVisibility = 'visible'; });
    const hs = secs.map(s => {                                      // one layout pass for all sections
      const cs = getComputedStyle(s);
      const extra =                                                  // intrinsic size always sizes the content box
        parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      return Math.max(0, s.getBoundingClientRect().height - extra);
    });
    secs.forEach((s, i) => { s.style.contentVisibility = ''; if (hs[i]) s.style.setProperty('--cis', hs[i] + 'px'); });
    if (scrollY !== y) scrollTo(0, y);
  }
  if (document.readyState === 'complete') run(); else addEventListener('load', run, { once: true });
  addEventListener('resize', debounce(run, 500));
})();


/* ---------- fan-zone lyrics background: pause the roll while the section is off-screen ---------- */
(function lyricsBg() {
  const sec = document.getElementById('quiz'); if (!sec || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(es => es.forEach(e => sec.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '120px 0px' }).observe(sec);
})();
