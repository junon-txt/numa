// Preview popover for [data-preview] links.
// Desktop (hover-capable): hover shows a card near the cursor.
// Touch / no-hover: first tap shows a bottom-sheet card with a "Leer más"
// action; tap outside, Escape, or a second tap on the link dismisses.

(() => {
  const cache = new Map();
  let popover = null;
  let activeLink = null;
  let hideTimer = null;

  const isCoarse = () =>
    window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const ensurePopover = () => {
    if (popover) return popover;
    popover = document.createElement('div');
    popover.className = 'numa-preview';
    popover.setAttribute('role', 'tooltip');
    popover.innerHTML = `
      <div class="numa-preview__title"></div>
      <div class="numa-preview__body"></div>
      <a class="numa-preview__more" href="#">Leer más →</a>
    `;
    document.body.appendChild(popover);
    popover.addEventListener('mouseenter', clearHide);
    popover.addEventListener('mouseleave', () => scheduleHide(120));

    const more = popover.querySelector('.numa-preview__more');
    more.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      const href = more.getAttribute('href');
      hide();
      if (href) window.location.assign(href);
      e.preventDefault();
    });
    return popover;
  };

  const clearHide = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const scheduleHide = (delay = 150) => {
    clearHide();
    hideTimer = setTimeout(hide, delay);
  };

  const hide = () => {
    clearHide();
    if (!popover) return;
    popover.classList.remove('is-visible', 'is-anchored');
    activeLink = null;
  };

  const fetchPreview = async (href) => {
    if (cache.has(href)) return cache.get(href);
    try {
      const res = await fetch(href);
      if (!res.ok) return null;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const targetId = (href.split('#')[1] || '').trim();
      const target =
        (targetId && doc.getElementById(targetId)) ||
        doc.querySelector('article h1, .md-content h1, h1');
      if (!target) return null;

      const parts = [];
      let node = target.nextElementSibling;
      while (node && !/^H[1-6]$/.test(node.tagName)) {
        const txt = node.textContent.trim();
        if (txt) parts.push(txt);
        if (parts.join(' ').length > 320) break;
        node = node.nextElementSibling;
      }
      const body = parts.join(' ').trim().slice(0, 280);
      const result = { title: target.textContent.trim(), body };
      cache.set(href, result);
      return result;
    } catch {
      return null;
    }
  };

  const positionAt = (event) => {
    const el = ensurePopover();
    if (isCoarse()) {
      el.classList.add('is-anchored');
      el.style.left = '';
      el.style.top = '';
      return;
    }
    el.classList.remove('is-anchored');
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offset = 14;
    let x = event.clientX + offset;
    let y = event.clientY + offset;
    if (x + rect.width > vw - 8) x = event.clientX - rect.width - offset;
    if (y + rect.height > vh - 8) y = event.clientY - rect.height - offset;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };

  const show = async (link, event) => {
    activeLink = link;
    const href = link.href;
    const data = await fetchPreview(href);
    if (!data || activeLink !== link) return;

    const el = ensurePopover();
    el.querySelector('.numa-preview__title').textContent = data.title;
    el.querySelector('.numa-preview__body').textContent =
      data.body || '(sin descripción)';
    el.querySelector('.numa-preview__more').href = href;
    el.classList.add('is-visible');
    positionAt(event);
  };

  // Hover (fine pointer) — delegated through mouseover/mouseout.
  document.addEventListener('mouseover', (e) => {
    if (isCoarse()) return;
    const link = e.target.closest('a[data-preview]');
    if (!link) return;
    if (e.relatedTarget && link.contains(e.relatedTarget)) return;
    clearHide();
    show(link, e);
  });

  document.addEventListener('mouseout', (e) => {
    if (isCoarse()) return;
    const link = e.target.closest('a[data-preview]');
    if (!link) return;
    if (e.relatedTarget && link.contains(e.relatedTarget)) return;
    scheduleHide();
  });

  document.addEventListener(
    'mousemove',
    (e) => {
      if (isCoarse()) return;
      if (!popover || !popover.classList.contains('is-visible')) return;
      if (e.target.closest('.numa-preview')) return;
      positionAt(e);
    },
    { passive: true }
  );

  // Tap (coarse pointer) — first tap previews, second tap navigates.
  // Use capture + stopImmediatePropagation so Material's instant-navigation
  // handler doesn't route away before we get a chance to intercept.
  document.addEventListener(
    'click',
    (e) => {
      if (e.target.closest('.numa-preview__more')) return; // let it navigate
      const link = e.target.closest('a[data-preview]');
      if (!link) return;
      if (!isCoarse()) return;

      const opened =
        activeLink === link &&
        popover &&
        popover.classList.contains('is-visible');
      if (opened) {
        hide();
        return; // proceed with default navigation
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      show(link, e);
    },
    true
  );

  // Dismiss on outside tap / Escape / scroll.
  document.addEventListener(
    'click',
    (e) => {
      if (!popover || !popover.classList.contains('is-visible')) return;
      if (e.target.closest('.numa-preview')) return;
      if (e.target.closest('a[data-preview]')) return;
      hide();
    },
    true
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });

  window.addEventListener('scroll', () => hide(), { passive: true });

  // Material for MkDocs instant navigation: hide on page change.
  document.addEventListener('navigation.instant', hide);
  document.addEventListener('navigation', hide);
})();
