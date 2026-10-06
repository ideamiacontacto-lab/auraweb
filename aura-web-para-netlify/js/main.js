/* AURA Training — interacciones. Mejora progresiva: si este archivo falla, el contenido se ve igual. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
  };

  /* Titulares palabra por palabra: cada palabra en .w > span con delay escalonado */
  $$('[data-words]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const s = document.createElement('span');
            s.style.setProperty('--d', `${120 + i++ * 60}ms`);
            s.textContent = part;
            w.append(s);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'svg') walk(n);
      });
    };
    walk(el);
  });

  /* BBH Bogle no trae letras acentuadas ni ¿ ¡. En todo texto con Bogle, la letra se arma con la base de Bogle
     + la tilde dibujada (.dia). La letra real queda en un span oculto para lectores de pantalla. */
  const DIA = { á: ['a', 'ac'], é: ['e', 'ac'], í: ['i', 'ac'], ó: ['o', 'ac'], ú: ['u', 'ac'], ü: ['u', 'di'], ñ: ['n', 'ti'], '¿': ['?', 'inv'], '¡': ['!', 'inv'] };
  const DIA_RE = /[áéíóúüñ¿¡]/i;
  const isBogle = (el) => getComputedStyle(el).fontFamily.includes('BBH Bogle');
  const fixDia = (root) => {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (DIA_RE.test(n.textContent) && n.parentElement && !n.parentElement.closest('.dia,script,style,svg') && isBogle(n.parentElement)) ? 1 : 2,
    });
    const nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach((n) => {
      const frag = document.createDocumentFragment();
      // cada palabra con tilde va en un span sin corte, para que la letra armada no parta la palabra
      n.textContent.split(/(\s+)/).forEach((word) => {
        if (!DIA_RE.test(word)) { frag.append(word); return; }
        const nw = document.createElement('span');
        nw.className = 'nw';
        frag.append(nw);
        [...word].forEach((ch) => {
        const low = ch.toLowerCase(), d = DIA[low];
        if (!d) { nw.append(ch); return; }
        const s = document.createElement('span');
        s.className = `dia ${d[1]}`;
        const base = document.createElement('span');
        base.setAttribute('aria-hidden', 'true');
        base.textContent = ch === low ? d[0] : d[0].toUpperCase();
        const real = document.createElement('span');
        real.className = 'sr';
        real.textContent = ch;
        s.append(base, real);
        nw.append(s);
        });
      });
      n.replaceWith(frag);
    });
  };
  fixDia(document.body);

  /* Reveal al scrollear. Sin IntersectionObserver, se muestra todo. */
  // Se calcula con la posición en pantalla (no con IntersectionObserver) para que nada quede oculto si un observer falla.
  // Mobile (ref integratedbio.com): títulos que se destapan palabra por palabra y párrafos que se "llenan" al scrollear
  const wrapWords = (el, cls, each) => {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const s = document.createElement('span');
          s.className = cls;
          s.textContent = part;
          if (each) each(s, i);
          i++;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.matches('svg,.dia,.sr')) walk(n);
    });
    walk(el);
  };
  const fillEls = [];
  if (!reduce) { // títulos y párrafos clave animados (ref integratedbio.com), en mobile y desktop
    $$('main > section:not(#inicio) .h2').forEach((h) => {
      wrapWords(h, 'mw', (s, i) => s.style.setProperty('--md', `${i * 55}ms`));
      h.classList.add('mreveal');
      h.setAttribute('data-reveal', '');
    });
    $$('.about-txt p.first, #online .lead, .ident-end .lead').forEach((p) => {
      wrapWords(p, 'fw');
      p.setAttribute('data-fill', '');
      fillEls.push({ el: p, words: $$('.fw', p) });
    });
  }

  // En mobile cada sección entra con un fade suave al llegar (Joaquín: que no se sienta tan largo)
  if (innerWidth < 761) $$('main > section:not(#inicio) > .wrap, main > section > .how-pin, main > .vblock .vframe').forEach((el) => el.setAttribute('data-reveal', ''));
  let revealPending = $$('[data-reveal], #stage');
  const revealCheck = () => {
    if (!revealPending.length) return;
    const lim = innerHeight * 0.92;
    revealPending = revealPending.filter((el) => {
      if (el.getBoundingClientRect().top < lim) { el.classList.add('in'); return false; }
      return true;
    });
  };
  revealCheck();
  addEventListener('scroll', revealCheck, { passive: true });
  addEventListener('load', revealCheck);

  // "Esto es para vos si": las frases se encienden al llegar a la pantalla. Listener propio y directo
  // (no depende del rAF ni de "reducir movimiento"), para que nunca queden grises.
  const identItems = $$('#identList li');
  const identCheck = () => identItems.forEach((li) => li.classList.toggle('lit', li.getBoundingClientRect().top < innerHeight * 0.78));
  identCheck();
  addEventListener('scroll', identCheck, { passive: true });
  addEventListener('resize', identCheck);

  /* Nav: blanca con línea apenas bajás */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('solid', scrollY > 8);
  onScrollNav();
  addEventListener('scroll', onScrollNav, { passive: true });

  /* Menú mobile */
  const menu = $('#menu'), burger = $('#burger');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(true));
  $('#menuClose').addEventListener('click', () => setMenu(false));
  $$('a, button[data-open]', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* Cursor con resorte (skiper61: mass .1, damping 10, stiffness 131). Solo con mouse.
     Variante por URL: ?cursor=circulo | estrella | brazo */
  const cur = $('#cur');
  if (matchMedia('(pointer: fine)').matches && cur) {
    const v = new URLSearchParams(location.search).get('cursor');
    if (['circulo', 'estrella', 'brazo'].includes(v)) cur.dataset.v = v;
    const M = 0.1, D = 10, K = 131;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, last = 0, raf = 0, seen = false;
    const step = (t) => {
      const dt = Math.min((t - (last || t)) / 1000, 1 / 30); last = t;
      if (reduce) { x = tx; y = ty; } else {
        for (let i = 0; i < 4; i++) {
          const h = dt / 4;
          vx += ((-K * (x - tx) - D * vx) / M) * h; x += vx * h;
          vy += ((-K * (y - ty) - D * vy) / M) * h; y += vy * h;
        }
      }
      cur.style.transform = `translate3d(${x}px,${y}px,0)`;
      raf = Math.abs(x - tx) + Math.abs(y - ty) + Math.abs(vx) + Math.abs(vy) > 0.05 ? requestAnimationFrame(step) : 0;
      if (!raf) last = 0;
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; }
      document.documentElement.classList.add('has-cur');
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { document.documentElement.classList.remove('has-cur'); seen = false; });
    // fondo real debajo del mouse: el primer ancestro con color de fondo no transparente
    const bgUnder = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const m = c.match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.5)) return m.slice(0, 3).map(Number);
      }
      return [255, 255, 255];
    };
    document.addEventListener('mouseover', (e) => {
      cur.classList.toggle('big', !!e.target.closest('a,button,[data-cur],input,label,summary,video'));
      // sobre violeta (o fondos oscuros como fotos con sombra) el cursor pasa a blanco para que se vea
      const [r, g, b] = bgUnder(e.target);
      const violetish = Math.abs(r - 106) < 40 && Math.abs(g - 69) < 40 && Math.abs(b - 216) < 45;
      const dark = 0.299 * r + 0.587 * g + 0.114 * b < 90;
      cur.classList.toggle('inv', violetish || dark || !!e.target.closest('.hero-card,.fcard,.vframe,.pcard.el,.final'));
    });
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
  }

  /* Tarjeta del hero (Alive): con mouse, la foto pasa a video al hover; en celular, pasa sola al verla */
  const hc = $('#heroCard');
  if (hc) {
    const hv = $('video', hc);
    const play = () => { hv.preload = 'auto'; hc.classList.add('play'); hv.play().catch(() => {}); }; // el cambio de foto a video no espera a que cargue
    const stop = () => { hc.classList.remove('play'); setTimeout(() => { if (!hc.classList.contains('play')) hv.pause(); }, 600); };
    // desktop: el video aparece al pasar el mouse por la foto de Aldana (lado derecho del hero)
    if (matchMedia("(hover: hover) and (min-width: 761px)").matches) {
      const still = $(".still", hc);
      hc.addEventListener("mousemove", (e) => {
        const r = still.getBoundingClientRect();
        const over = e.clientX > r.left + r.width * 0.15;
        if (over && !hc.classList.contains("play")) play();
        else if (!over && hc.classList.contains("play")) stop();
      });
      hc.addEventListener("mouseleave", stop);
    }
    // En celular (estilo carolinegirvan.com): foto a pantalla completa y botón "Ver video" en la esquina
    const hp = $('#heroPlay');
    if (hp) hp.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !hc.classList.contains('play');
      if (on) play(); else { hc.classList.remove('play'); hv.pause(); }
      hp.classList.toggle('on', on);
      $('span', hp).textContent = on ? 'Pausar' : 'Ver video';
    });
  }

  /* Videos secundarios: se reproducen solo cuando están en pantalla */
  // Se calcula con la posición en pantalla (no con IntersectionObserver), igual que los reveals.
  const vids = $$('video[data-autoplay]');
  if (!reduce && vids.length) {
    let vTick = false;
    const vidCheck = () => {
      vTick = false;
      vids.forEach((v) => {
        const r = v.getBoundingClientRect();
        const visH = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        const visW = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
        const on = r.height > 0 && r.width > 0 && visH > r.height * 0.2 && visW > r.width * 0.2;
        if (on && v.paused) { v.preload = 'auto'; v.play().catch(() => {}); }
        else if (!on && !v.paused) v.pause();
      });
    };
    const vQueue = () => { if (!vTick) { vTick = true; requestAnimationFrame(vidCheck); } };
    addEventListener('scroll', vQueue, { passive: true });
    addEventListener('resize', vQueue);
    document.addEventListener('scroll', vQueue, { passive: true, capture: true }); // también al deslizar los carriles en mobile
    vidCheck();
  }
  if (reduce) $$('video[autoplay]').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });

  /* Planes: card stack (skiper17). La card de abajo se achica apenas cuando la siguiente la tapa. */
  const cards = $$('#stack .pcard');
  if (cards.length && !reduce) {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (innerWidth < 761) { cards.forEach((c) => { c.style.transform = ''; c.style.filter = ''; }); return; } // en mobile las cards van en carril, sin stack
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next) { c.style.transform = ''; return; }
        const a = c.getBoundingClientRect(), b = next.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, 1 - (b.top - a.top) / a.height));
        c.style.transform = p > 0 ? `scale(${1 - p * 0.06})` : '';
        c.style.filter = p > 0 ? `brightness(${1 - p * 0.08})` : '';
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }
  $$('.pcard .more').forEach((b) => b.addEventListener('click', () => {
    const open = b.closest('.pcard').classList.toggle('open');
    b.textContent = open ? 'Qué incluye −' : 'Qué incluye +';
  }));

  /* POPUP DE CONTACTO: pasos con botones → "Listo" → WhatsApp con el mensaje armado.
     Nunca manda a un chat vacío. Si se configura FORM_ENDPOINT (Formspree), además llega al mail. */
  const WA = '5493447508710';
  const FORM_ENDPOINT = ''; // pendiente: endpoint de Formspree para auratraining03@gmail.com
  const veil = $('#veil'), form = $('#flow'), barsEl = $('#bars'), back = $('#back'), stepN = $('#stepN'), foot = $('#foot');
  const panes = Object.fromEntries($$('.st', form).map((p) => [p.dataset.key, p]));
  const EYEBROW = { prueba: 'Clase de prueba', rutina: 'Rutina base gratis', auto: '¿Te ayudo a elegir?' };
  let state = {}, steps = [], idx = 0, lastFocus = null, opens = Number(store.get('aura-pop') || 0);

  const show = (key) => {
    Object.values(panes).forEach((p) => p.classList.toggle('on', p.dataset.key === key));
    const isDone = key === 'listo';
    foot.style.visibility = isDone ? 'hidden' : '';
    back.style.visibility = idx > 0 ? 'visible' : 'hidden';
    stepN.textContent = isDone ? 'Listo' : `${idx + 1} / ${steps.length}`;
    $('#mHint').textContent = key === 'datos' ? 'Último paso' : 'Elegí una opción';
    form.scrollTop = 0;
    $$('i', barsEl).forEach((b, i) => b.classList.toggle('on', isDone || i <= idx));
    const first = $('.opt, input', panes[key]) || $('a, button', panes[key]);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
  };

  // preset: respuestas que ya vienen del selector "Encontrá tu AURA" (esos pasos se saltean)
  const open = ({ plan = '', intent = '', preset = {} } = {}) => {
    state = { plan, intent, ...preset };
    steps = ['objetivo', 'dias', 'lugar', 'plan', 'datos'].filter((k) => !(k in preset) && !(k === 'plan' && plan));
    idx = 0;
    barsEl.innerHTML = steps.map(() => '<i></i>').join('');
    $$('.opt', form).forEach((o) => o.setAttribute('aria-pressed', 'false'));
    form.reset();
    $('#err').textContent = '';
    $$('[data-eyebrow]', form).forEach((e, i) => {
      if (!e.dataset.base) e.dataset.base = e.textContent;
      e.textContent = EYEBROW[intent] || (plan ? `AURA ${plan}` : e.dataset.base);
    });
    lastFocus = document.activeElement;
    veil.classList.add('on');
    veil.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    opens++; store.set('aura-pop', String(opens));
    show(steps[0]);
  };
  const close = () => {
    veil.classList.remove('on');
    veil.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.documentElement.style.overflow = '';
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (t) { e.preventDefault(); open({ plan: t.dataset.plan || '', intent: t.dataset.intent || '' }); }
  });
  $$('[data-close]', veil).forEach((b) => b.addEventListener('click', close));
  veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (veil.classList.contains('on')) close(); else setMenu(false);
  });
  // foco atrapado dentro del popup
  veil.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button, a[href], input', veil).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  $$('.opt', form).forEach((o) => o.addEventListener('click', () => {
    const pane = o.closest('.st');
    $$('.opt', pane).forEach((x) => x.setAttribute('aria-pressed', String(x === o)));
    state[pane.dataset.key] = o.dataset.v;
    setTimeout(() => { idx++; show(steps[idx]); }, 220);
  }));
  back.addEventListener('click', () => { if (idx > 0) { idx--; show(steps[idx]); } });
  // (i) en cada plan: muestra qué incluye sin elegirlo; se abre de a uno
  $$('.po-i', form).forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const po = b.closest('.po'), open = !po.classList.contains('info');
    $$('.po', form).forEach((x) => { x.classList.remove('info'); $('.po-i', x).setAttribute('aria-expanded', 'false'); });
    po.classList.toggle('info', open);
    b.setAttribute('aria-expanded', String(open));
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim(), contacto = form.contacto.value.trim();
    if (!nombre || !contacto) { $('#err').textContent = 'Completá tu nombre y un WhatsApp o mail para que te pueda responder.'; return; }
    state.nombre = nombre; state.contacto = contacto;
    const dias = state.dias === '5 o más' ? '5 o más días' : `${state.dias} días`;
    let msg = `Hola Aldana, soy ${nombre}. Busco ${state.objetivo}, puedo entrenar ${dias} ${state.lugar}`;
    msg += state.plan ? ` y me interesa AURA ${state.plan}.` : ' y quiero que me ayudes a elegir el plan.';
    if (state.intent === 'prueba') msg += ' Me gustaría hacer la clase de prueba.';
    if (state.intent === 'rutina') msg += ' Me gustaría recibir la rutina base gratis.';
    msg += ` Mi contacto: ${contacto}.`;
    $('#waGo').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    $('#doneTitle').textContent = `Listo, ${nombre.split(' ')[0]}.`;
    fixDia($('#doneTitle'));
    $('#sum').innerHTML = '';
    $('#sum').append(
      'Buscás ', Object.assign(document.createElement('b'), { textContent: state.objetivo }),
      `, ${dias} por semana ${state.lugar}`,
      state.plan ? ', con ' : '. Te ayudo a elegir el plan.',
      ...(state.plan ? [Object.assign(document.createElement('b'), { textContent: `AURA ${state.plan}` }), '.'] : []),
    );
    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...state, mensaje: msg }) }).catch(() => {});
    }
    idx = steps.length;
    show('listo');
  });

  /* Popup automático, como máximo 2 veces por sesión en total:
     1) cuando ya viste Planes y volvés al inicio  2) intención de salida en desktop */
  const planes = $('#planes');
  if (planes && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) store.set('aura-saw-plans', '1'); }, { threshold: 0.25 }).observe(planes);
    addEventListener('scroll', () => {
      if (scrollY < 120 && store.get('aura-saw-plans') && !store.get('aura-auto-top') && opens < 2 && !veil.classList.contains('on')) {
        store.set('aura-auto-top', '1');
        open({ intent: 'auto' });
      }
    }, { passive: true });
  }
  if (matchMedia('(pointer: fine)').matches) {
    const t0 = Date.now();
    document.addEventListener('mouseout', (e) => {
      if (e.relatedTarget || e.clientY > 0 || Date.now() - t0 < 15000) return;
      if (store.get('aura-auto-exit') || opens >= 2 || veil.classList.contains('on')) return;
      store.set('aura-auto-exit', '1');
      open({ intent: 'auto' });
    });
  }

  /* ============ Efectos ligados al scroll (un solo listener con rAF) ============ */
  const vh = () => innerHeight;
  const progress = (el) => { // 0 cuando el elemento entra por abajo, 1 cuando sale por arriba
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (vh() - r.top) / (vh() + r.height)));
  };
  const scrollFx = [];

  // Párrafos que se llenan palabra por palabra mientras cruzan la pantalla (mobile)
  if (fillEls.length) scrollFx.push(() => fillEls.forEach(({ el, words }) => {
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh() * 0.88 - r.top) / (vh() * 0.5)));
    const k = Math.round(p * words.length);
    words.forEach((w, j) => w.classList.toggle('on', j < k));
  }));

  // Identificación: cada frase se enciende al pasar el 70% de la pantalla
  const identLis = $$('#identList li');
  scrollFx.push(() => identLis.forEach((li) => li.classList.toggle('lit', li.getBoundingClientRect().top < vh() * 0.7)));

  // Cómo funciona (skiper19): en desktop la sección queda fijada; al bajar aparece cada tarjeta
  // y la línea la une con la siguiente. La línea se arma con la posición real de las tarjetas.
  const how = $('#como'), howTrack = $('#howTrack'), howSvg = $('.how-line'), howPath = $('#howPath');
  const howSteps = $$('#howTrack .steps li');
  const buildHowPath = () => {
    if (!howTrack || !howSteps.length) return;
    const t = howTrack.getBoundingClientRect();
    howSvg.setAttribute('viewBox', `0 0 ${Math.round(t.width)} ${Math.round(t.height)}`);
    // offsetTop/Left no se ven afectados por el transform de la animación de entrada
    const pts = howSteps.map((li) => ({ x2: li.offsetLeft + li.offsetWidth, x: li.offsetLeft, cx: li.offsetLeft + li.offsetWidth / 2, top: li.offsetTop, bot: li.offsetTop + li.offsetHeight, my: li.offsetTop + li.offsetHeight / 2 }));
    // un tramo por par de tarjetas: sale por abajo (o arriba) del centro de una y entra por el costado de la siguiente
    const NS = 'http://www.w3.org/2000/svg';
    howSvg.replaceChildren();
    howSegs = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      // conector prolijo: sale del costado derecho de una tarjeta y entra por el izquierdo de la siguiente (curva en S)
      const mx = (a.x2 + b.x) / 2;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('pathLength', '1');
      path.setAttribute('d', `M ${a.x2} ${a.my} C ${mx} ${a.my}, ${mx} ${b.my}, ${b.x} ${b.my}`);
      howSvg.append(path);
      howSegs.push(path);
    }
    howStage = -1;
    setHowStage(lastHowStage);
  };
  let howSegs = [], howStage = -1, lastHowStage = 0;
  // etapa k: tarjetas 0..k visibles y tramos 0..k-1 dibujados (de a una tarjeta, con transición)
  const setHowStage = (k) => {
    lastHowStage = k;
    if (k === howStage) return;
    const up = k > howStage;
    howStage = k;
    howSteps.forEach((li, i) => {
      li.classList.toggle('wait', up && i === k && i > 0);
      li.classList.toggle('on', i <= k);
    });
    howSegs.forEach((s, i) => s.classList.toggle('on', i < k));
  };
  buildHowPath();
  addEventListener('resize', buildHowPath);
  addEventListener('load', buildHowPath);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildHowPath);
  scrollFx.push(() => {
    if (!how || !howTrack) return;
    const r = how.getBoundingClientRect();
    const pinned = how.offsetHeight > vh() * 1.5; // en desktop la sección mide 260vh y está fijada
    const p = pinned
      ? Math.min(1, Math.max(0, -r.top / (how.offsetHeight - vh())))
      : Math.min(1, Math.max(0, (vh() * 0.85 - howTrack.getBoundingClientRect().top) / (howTrack.offsetHeight * 0.9)));
    // 4 etapas repartidas en el recorrido; la primera tarjeta ya está al llegar a la sección
    const visible = how.getBoundingClientRect().top < vh() * 0.7;
    // la primera tarjeta también aparece con el scroll (no está desde el inicio)
    setHowStage(visible ? Math.min(howSteps.length - 1, Math.floor(p * 5.2) - 1) : -1);
  });

  // Galería de Sobre mí (skiper30): cada columna se desplaza según el avance del scroll por la galería,
  // con su propia velocidad y sentido (data-k), sin pasarse del alto que le sobra para no mostrar huecos.
  const gallery = $('#gallery'), gcols = $$('#gallery .gcol');
  if (gallery) scrollFx.push(() => {
    const g = gallery.getBoundingClientRect();
    if (g.bottom < -vh() || g.top > vh() * 2) return;
    const p = progress(gallery) - 0.5;
    const scale = innerWidth < 761 ? 0.5 : 1;
    gcols.forEach((c) => {
      const slack = Math.max(0, (c.offsetHeight - g.height) / 2 - 12);
      const y = Math.max(-slack, Math.min(slack, p * Number(c.dataset.k) * vh() * 1.6 * scale));
      c.style.setProperty('--gy', `${y.toFixed(1)}px`);
    });
  });

  // Parallax de las columnas de reseñas (Alive)
  const plx = $$('#rcols .rcol');
  if (matchMedia('(min-width: 761px)').matches) {
    scrollFx.push(() => plx.forEach((c) => {
      const box = c.parentElement.getBoundingClientRect();
      const d = (box.top + box.height / 2) - vh() / 2;
      if (Math.abs(d) > vh() * 1.6) return; // fuera de pantalla: no se mueve
      c.style.transform = `translate3d(0,${(d * Number(c.dataset.s || 0)).toFixed(1)}px,0)`;
    }));
  }

  // Reseñas: el texto de fondo sube inclinado (skiper28)
  const crawl = $('#crawl'), reviews = $('#resenas');
  if (crawl) scrollFx.push(() => crawl.style.setProperty('--cy', `${(45 - progress(reviews) * 110).toFixed(2)}%`));

  if (!reduce) {
    let tick = false;
    const run = () => { tick = false; scrollFx.forEach((f) => f()); };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    addEventListener('resize', run);
    run();
  }

  /* Método A·U·R·A: el bloque que está en el centro activa la letra y el índice (Emily Skye) */
  const mbs = $$('#methodBlocks .mb'), idxLis = $$('#methodIdx li'), giant = $$('#methodGiant span');
  const giantBox = $('.method-giant');
  if (mbs.length) {
    let cur = -1;
    // posición continua (0 a 3) según dónde está el centro de la pantalla entre los centros de los bloques
    const methodCheck = () => {
      if (innerWidth < 761) return; // en mobile el método es un carril con pestañas (ver más abajo)
      const mid = innerHeight / 2;
      const c = mbs.map((m) => { const r = m.getBoundingClientRect(); return r.top + r.height / 2; });
      let mp = 0;
      if (mid <= c[0]) mp = 0;
      else if (mid >= c[c.length - 1]) mp = c.length - 1;
      else for (let j = 0; j < c.length - 1; j++) if (mid >= c[j] && mid < c[j + 1]) { const t = (mid - c[j]) / (c[j + 1] - c[j]); mp = j + Math.min(1, Math.max(0, (t - 0.3) / 0.4)); break; }
      if (giantBox) giantBox.style.setProperty('--mp', mp.toFixed(3));
      const idx = Math.round(mp);
      if (idx === cur) return;
      cur = idx;
      idxLis.forEach((l, j) => l.classList.toggle('on', j === cur));
    };
    addEventListener('scroll', methodCheck, { passive: true });
    methodCheck();
  }

  /* Etapas: paneles expandibles (skiper76). Hover en desktop, click o Enter en cualquier lado. */
  const panels = $$('#panels .panel');
  const activate = (p) => {
    panels.forEach((x) => x.classList.toggle('on', x === p));
    if (innerWidth < 761) setTimeout(() => p.scrollIntoView({ inline: 'start', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), 80);
    setTimeout(() => $$('.blur-list', p).forEach((l) => l.dispatchEvent(new Event('scroll'))), 350);
  };
  panels.forEach((p) => {
    p.addEventListener('click', () => activate(p));
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(p); } });
    if (matchMedia('(hover: hover) and (min-width: 1001px)').matches) p.addEventListener('mouseenter', () => activate(p));
  });
  // lista con blur progresivo (skiper41): se apaga el blur del borde al llegar arriba/abajo
  $$('[data-blur]').forEach((w) => {
    const l = $('.blur-list, .ident-list', w);
    const items = $$('li', l);
    const upd = () => {
      // si la lista no tiene scroll propio (p. ej. "Esto es para vos si" en desktop) no se desenfoca nada
      if (l.scrollHeight <= l.clientHeight + 2) { items.forEach((li) => { li.style.filter = ''; li.style.opacity = ''; }); w.classList.add('at-top', 'at-end'); return; }
      w.classList.toggle('at-top', l.scrollTop < 4);
      w.classList.toggle('at-end', l.scrollTop + l.clientHeight >= l.scrollHeight - 4);
      // cada línea se desenfoca y se apaga según qué tan lejos está del centro visible
      const box = l.getBoundingClientRect(), mid = box.top + box.height / 2;
      items.forEach((li) => {
        const r = li.getBoundingClientRect();
        const off = r.top + r.height / 2 - mid;
        const atEdge = (off < 0 && w.classList.contains('at-top')) || (off > 0 && w.classList.contains('at-end'));
        const d = Math.min(1, Math.abs(off) / (box.height / 2));
        const k = atEdge ? 0 : Math.max(0, (d - 0.45) / 0.55);
        li.style.filter = k > 0.02 ? `blur(${(k * 3.5).toFixed(2)}px)` : '';
        li.style.opacity = (1 - k * 0.55).toFixed(2);
      });
    };
    l.addEventListener('scroll', upd, { passive: true });
    upd();
  });

  /* Encontrá tu AURA: 4 preguntas → plan recomendado → popup con las respuestas ya cargadas */
  const finder = $('#finder');
  if (finder) {
    const fqs = $$('.fq', finder), fbars = $$('#fbars i'), fBack = $('#fBack'), fReset = $('#fReset');
    const ans = {};
    let fi = 0;
    const PLAN_INFO = {
      Progress: ['progress', 'Querés una planificación clara y avanzar a tu ritmo, sin depender de horarios.'],
      Hybrid: ['hybrid', 'Querés libertad en la semana, pero con encuentros para corregir y ajustar.'],
      Pro: ['pro', 'Querés entrenar conmigo en vivo, desde donde estés.'],
      Élite: ['elite', 'Querés la experiencia más personalizada: cada sesión conmigo, en persona.'],
    };
    const recommend = () => {
      if (ans.acomp === 'solo') return 'Progress';
      if (ans.acomp === 'medio') return 'Hybrid';
      return ans.lugar === 'presencial con vos' ? 'Élite' : 'Pro';
    };
    const fshow = () => {
      fqs.forEach((q, j) => q.classList.toggle('on', j === fi));
      fbars.forEach((b, j) => b.classList.toggle('on', j <= fi));
      fBack.hidden = fi === 0 || fi === 4;
      fReset.hidden = fi !== 4;
      if (fi === 4) {
        const plan = recommend();
        const name = $('#fName');
        name.textContent = `AURA ${plan}`;
        fixDia(name);
        $('#fWhy').textContent = PLAN_INFO[plan][1];
        $('#fNote').hidden = ans.objetivo !== 'entrenar en el embarazo o el postparto';
        $('#fSee').href = `#plan-${PLAN_INFO[plan][0]}`;
        finder.dataset.plan = plan;
      }
    };
    $$('.fq .opt', finder).forEach((o) => o.addEventListener('click', () => {
      const q = o.closest('.fq');
      $$('.opt', q).forEach((x) => x.setAttribute('aria-pressed', String(x === o)));
      ans[q.dataset.key] = o.dataset.v;
      setTimeout(() => { fi++; fshow(); }, 220);
    }));
    fBack.addEventListener('click', () => { if (fi > 0) { fi--; fshow(); } });
    fReset.addEventListener('click', () => { fi = 0; $$('.opt', finder).forEach((x) => x.setAttribute('aria-pressed', 'false')); fshow(); });
    fshow();
    $('#fGo').addEventListener('click', () => open({ plan: finder.dataset.plan, preset: { lugar: ans.lugar, dias: ans.dias, objetivo: ans.objetivo } }));
  }

  /* Video a sangre: botón "Ver" que sigue al cursor (skiper67) y video completo en un modal */
  const vframe = $('#vframe'), vfollow = $('#vfollow'), vmodal = $('#vmodal'), vfull = $('#vfull');
  if (vframe) {
    vframe.addEventListener('pointermove', (e) => {
      const r = vframe.getBoundingClientRect();
      vfollow.style.left = `${e.clientX - r.left}px`;
      vfollow.style.top = `${e.clientY - r.top}px`;
      vframe.classList.add('hov');
    });
    vframe.addEventListener('pointerleave', () => vframe.classList.remove('hov'));
    const openV = () => {
      vfull.src = $('video', vframe).getAttribute('src');
      vmodal.classList.add('on'); vmodal.setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = 'hidden';
      vfull.play().catch(() => {});
    };
    const closeV = () => { vfull.pause(); vmodal.classList.remove('on'); vmodal.setAttribute('aria-hidden', 'true'); document.documentElement.style.overflow = ''; vframe.focus({ preventScroll: true }); };
    vframe.addEventListener('click', openV);
    vframe.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openV(); } });
    $('#vx').addEventListener('click', closeV);
    vmodal.addEventListener('click', (e) => { if (e.target === vmodal) closeV(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && vmodal.classList.contains('on')) closeV(); });
  }

  /* Gratis: la tarjeta pasa de foto a video al hover (en celular, al verla) */
  $$('.fcard').forEach((c) => {
    const v = $('video', c);
    const on = () => { v.preload = 'auto'; c.classList.add('play'); v.play().catch(() => {}); };
    const off = () => { c.classList.remove('play'); v.pause(); };
    if (matchMedia('(hover: hover)').matches) { c.addEventListener('mouseenter', on); c.addEventListener('mouseleave', off); }
    else if (!reduce && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => (e.isIntersecting ? on() : off()), { threshold: 0.6 }).observe(c);
  });

  /* Antes/después con manito (skiper50) */
  const cmp = $('#cmp'), cmpRange = $('#cmpRange');
  if (cmp && cmpRange) {
    const set = () => cmp.style.setProperty('--pos', `${cmpRange.value}%`);
    cmpRange.addEventListener('input', set);
    cmpRange.addEventListener('pointerdown', () => cmp.classList.add('drag'));
    addEventListener('pointerup', () => cmp.classList.remove('drag'));
    set();
  }

  /* ============ MOBILE: carriles horizontales con contador ============
     Planes, Método, Gratis y Reseñas se deslizan de costado. Debajo: flechas, barra y "1 / 4".
     En el Método, las letras A·U·R·A funcionan como pestañas del carril. */
  const ARROW = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h11M11 5l5 5-5 5"/></svg>';
  $$('[data-rail]').forEach((rail) => {
    const items = rail.id === 'rcols' ? $$('.rev', rail) : [...rail.children];
    const n = items.length;
    const ui = document.createElement('div');
    ui.className = 'rail-ui';
    ui.innerHTML = `<button type="button" aria-label="Anterior" style="transform:scaleX(-1)">${ARROW}</button><span class="bar"><i style="width:${100 / n}%"></i></span><span class="n">1 / ${n}</span><button type="button" aria-label="Siguiente">${ARROW}</button>`;
    rail.after(ui);
    const [prev, next] = $$('button', ui), bar = $('.bar i', ui), num = $('.n', ui);
    const tabs = rail.id === 'methodBlocks' ? idxLis : [];
    let current = -1;
    const at = () => {
      const x = rail.scrollLeft + rail.clientWidth * 0.3;
      let k = 0;
      const r0 = rail.getBoundingClientRect().left - rail.scrollLeft;
      items.forEach((it, j) => { if (it.getBoundingClientRect().left - r0 <= x) k = j; });
      if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) k = n - 1; // última, aunque no llegue a alinearse
      return k;
    };
    const paint = () => {
      const k = at();
      if (k === current) return;
      current = k;
      bar.style.transform = `translateX(${k * 100}%)`;
      num.textContent = `${k + 1} / ${n}`;
      prev.disabled = k === 0;
      next.disabled = k === n - 1;
      tabs.forEach((t, j) => t.classList.toggle('on', j === k));
    };
    const go = (k) => {
      const it = items[Math.max(0, Math.min(n - 1, k))];
      const r0 = rail.getBoundingClientRect().left - rail.scrollLeft;
      rail.scrollTo({ left: it.getBoundingClientRect().left - r0 - parseFloat(getComputedStyle(rail).paddingLeft || 0), behavior: reduce ? 'auto' : 'smooth' });
    };
    rail.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
    prev.addEventListener('click', () => go(current - 1));
    next.addEventListener('click', () => go(current + 1));
    tabs.forEach((t, j) => t.addEventListener('click', () => { if (innerWidth < 761) go(j); }));
    paint();
  });

  /* Sobre mí en mobile: se ve el primer párrafo y "Leer mi historia" despliega el resto */
  const aboutMore = $('#aboutMore'), aboutTxt = $('.about-txt');
  if (aboutMore && aboutTxt) {
    aboutMore.hidden = false; // el CSS solo lo muestra en mobile
    aboutMore.addEventListener('click', () => {
      const open = aboutTxt.classList.toggle('open');
      aboutMore.textContent = open ? 'Leer menos' : 'Leer mi historia';
    });
  }

  /* Hero desktop: la figura y la palabra AURA se mueven apenas siguiendo el mouse */
  const heroCut = $('.hero-cut'), heroSec = $('#inicio');
  // Sentadilla: secuencia de 50 cuadros (media/squat/s-00..49.webp, sacados del GIF de Kling).
  // El cuadro que se dibuja en el canvas depende de cuánto bajaste mientras el hero está fijo; con suavizado.
  const squatBox = $('#squatV'), squatCanvas = $('#squatCanvas');
  if (squatBox && squatCanvas && heroSec && innerWidth > 760) {
    const N = Number(squatBox.dataset.frames) || 50, S = squatCanvas.width, ctx = squatCanvas.getContext('2d');
    const imgs = [];
    let target = 0, cur = 0, shown = -1, raf = 0;
    const ready = (i) => imgs[i] && imgs[i].complete && imgs[i].naturalWidth;
    // recorte del fondo blanco: cada cuadro se procesa una vez (lo casi blanco pasa a transparente, con borde suave)
    const cuts = [];
    const cut = (i) => {
      if (cuts[i]) return cuts[i];
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(imgs[i], 0, 0, S, S);
      const px = g.getImageData(0, 0, S, S), d = px.data;
      // solo el blanco conectado con el borde es fondo (así el top y las zapatillas blancas no se vuelven transparentes)
      const dist = (p) => 255 - Math.min(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
      const bg = new Uint8Array(S * S), stack = [];
      const push = (p) => { if (!bg[p] && dist(p) < 12) { bg[p] = 1; stack.push(p); } }; // fondo ≈ 4-7; el top blanco arranca en ~17
      for (let x = 0; x < S; x++) { push(x); push((S - 1) * S + x); }
      for (let y = 0; y < S; y++) { push(y * S); push(y * S + S - 1); }
      while (stack.length) {
        const p = stack.pop(), x = p % S;
        if (x > 0) push(p - 1); if (x < S - 1) push(p + 1);
        if (p >= S) push(p - S); if (p < S * (S - 1)) push(p + S);
      }
      for (let p = 0; p < S * S; p++) if (bg[p]) { const t = dist(p); d[p * 4 + 3] = t <= 7 ? 0 : Math.round(((t - 7) / 5) * 255); }
      g.putImageData(px, 0, 0);
      return (cuts[i] = c);
    };
    const paint = () => {
      raf = 0;
      cur += (target - cur) * (reduce ? 1 : 0.22);
      if (Math.abs(target - cur) < 0.05) cur = target;
      let f = Math.round(cur);
      if (!ready(f)) for (let d = 1; d < N; d++) { if (ready(f - d)) { f -= d; break; } if (ready(f + d)) { f += d; break; } } // el más cercano ya cargado
      if (ready(f) && f !== shown) {
        ctx.clearRect(0, 0, S, S); ctx.drawImage(cut(f), 0, 0, S, S); shown = f;
        squatBox.classList.add('live');
      }
      if (cur !== target) raf = requestAnimationFrame(paint);
    };
    // dibuja ya (sin esperar al próximo cuadro de animación) y, si hay rAF, suaviza el resto
    const kick = () => { if (raf) return; paint(); if (cur !== target && !raf) raf = requestAnimationFrame(paint); };
    for (let i = 0; i < N; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { if (Math.abs(i - Math.round(target)) < 2) { shown = -1; cur = target; paint(); } };
      im.src = `media/squat/s-${String(i).padStart(2, '0')}.webp`;
      imgs[i] = im;
    }
    // listener propio: no depende del resto de los efectos ni de "reducir movimiento"
    const onScrollSquat = () => {
      const r = heroSec.getBoundingClientRect();
      const range = Math.max(1, heroSec.offsetHeight - $('.hero-grid').offsetHeight); // tramo en que el hero queda fijo
      const p = Math.min(1, Math.max(0, ($('#nav').offsetHeight - r.top) / (range * 0.9)));
      target = p * (N - 1);
      if (Math.abs(target - cur) > 6) cur = target - Math.sign(target - cur) * 6; // si saltaste mucho, no tarda en alcanzarlo
      kick();
    };
    addEventListener('scroll', onScrollSquat, { passive: true });
    addEventListener('resize', onScrollSquat);
    onScrollSquat();
  }
  // AURA de fondo: sube inclinada a medida que scrolleás (como el texto detrás de las reseñas)
  if (heroCut && heroSec && !reduce) scrollFx.push(() => {
    const r = heroSec.getBoundingClientRect();
    if (r.bottom < 0) return;
    heroCut.style.setProperty('--hy', `${(Math.min(r.height, -r.top) * -0.45).toFixed(1)}px`);
  });
  if (heroCut && heroSec && !reduce && matchMedia('(hover: hover) and (min-width: 761px)').matches) {
    heroSec.addEventListener('mousemove', (e) => {
      const r = heroSec.getBoundingClientRect();
      heroCut.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      heroCut.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  }

  /* CTA fijo inferior (mobile): aparece al salir del hero */
  const sticky = $('#stickyCta'), hero = $('#inicio');
  if (sticky && hero) {
    const stickyCheck = () => sticky.classList.toggle('on', hero.getBoundingClientRect().bottom < 0);
    addEventListener('scroll', stickyCheck, { passive: true });
    stickyCheck();
  }
})();
