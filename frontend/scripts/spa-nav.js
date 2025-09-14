// scripts/spa-nav.js
// Soft navigation between .html pages with View Transitions + fallback
// - Intercepts internal links (sidebar/top tabs)
// - Fetches next page and swaps .main-content without full reload
// - Updates <title>, re-inits Lucide, preserves sidebar/top-nav active states
// - Works with back/forward via history API
// Requires: styles/transitions.css (already added), scripts/main.js (already on pages)

(function () {
  const CONTAINER_SEL = '.app-container';   // what we replace between pages
  const ENTER_CLASS = 'page-enter';
  const LEAVE_CLASS = 'page-leave';
  const DURATION = 280; // keep in sync with CSS

  // Prefetch on hover for snappier nav
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || !isInternalPage(a)) return;
    if (a.dataset.prefetched) return;
    a.dataset.prefetched = '1';
    fetch(a.href, { credentials: 'same-origin' }).catch(() => {});
  });

  // Intercept clicks
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || !isInternalPage(a)) return;

    // allow modifier-clicks to open in new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    navigateTo(a.href, true);
  });

  // Handle back/forward
  window.addEventListener('popstate', () => {
    navigateTo(location.href, false);
  });

  // Initial enter animation
  onNextFrame(() => {
    document.documentElement.classList.add(ENTER_CLASS);
    onNextFrame(() => document.documentElement.classList.remove(ENTER_CLASS));
  });

  async function navigateTo(url, push) {
    try {
      const html = await fetchHtml(url);
      const nextDoc = parseHtml(html);

      const nextTitle = nextDoc.querySelector('title')?.textContent?.trim() || document.title;
      const nextContainer = nextDoc.querySelector(CONTAINER_SEL);
      const currentContainer = document.querySelector(CONTAINER_SEL);

      if (!nextContainer || !currentContainer) {
        // Fallback: hard nav if structure differs
        window.location.href = url;
        return;
      }

      const swap = () => {
        // Swap main content
        currentContainer.replaceWith(nextContainer);

        // Update title
        document.title = nextTitle;

        // Re-run lucide icons (if present)
        if (typeof lucide !== 'undefined') {
          try { lucide.createIcons(); } catch (_) {}
        }

        // Re-apply active states using your existing helper
        try { initializeActiveNavigation(); } catch (_) {}

        // Re-run any page-specific bootstraps (chat.js/settings.js, etc.)
        dispatchSoftLoaded();
      };

      if (push) history.pushState({}, '', url);

      // View Transitions API if available (buttery smooth)
      if ('startViewTransition' in document) {
        document.startViewTransition(swap);
      } else {
        // Fallback fade: add leave, swap, then remove
        document.documentElement.classList.add(LEAVE_CLASS);
        setTimeout(() => {
          swap();
          document.documentElement.classList.remove(LEAVE_CLASS);
          // enter effect
          document.documentElement.classList.add(ENTER_CLASS);
          onNextFrame(() => document.documentElement.classList.remove(ENTER_CLASS));
        }, DURATION);
      }
    } catch (err) {
      console.error('Soft navigation failed, doing hard nav:', err);
      window.location.href = url;
    }
  }

  function isInternalPage(a) {
    const href = a.getAttribute('href');
    if (!href) return false;
    if (a.target === '_blank') return false;
    if (href.startsWith('#') || href.startsWith('javascript:')) return false;

    // Only internal http(s) or same-origin relative links
    const u = new URL(href, window.location.href);
    if (u.origin !== window.location.origin) return false;

    // Limit to .html documents (your site uses *.html pages)
    return /\.html(?:$|[?#])/i.test(u.pathname);
  }

  async function fetchHtml(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }

  function parseHtml(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  function onNextFrame(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  // Fire a custom event so per-page scripts can re-init after soft swap
  function dispatchSoftLoaded() {
    document.dispatchEvent(new CustomEvent('soft:navigated'));
    // If your pages rely on DOMContentLoaded for init, we can simulate a hook:
    if (typeof window.onSoftNavigated === 'function') {
      try { window.onSoftNavigated(); } catch (_) {}
    }
  }
})();
