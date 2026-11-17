(() => {
  'use strict';
  const config = window.BOOKING_TRACKING || {};
  const enabled = /^AW-\d+$/.test(config.conversionId) && /^[\w-]+$/.test(config.conversionLabel);
  if (enabled) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', config.conversionId);
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.conversionId);
    document.head.append(tag);
  }
  const openaiEnabled = /^[A-Za-z0-9_-]{10,100}$/.test(config.openaiPixelId || '');
  if (openaiEnabled) {
    if (!window.oaiq) {
      const queue = function () { queue.q.push(arguments); };
      queue.q = [];
      window.oaiq = queue;
      const pixel = document.createElement('script');
      pixel.async = true;
      pixel.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
      document.head.append(pixel);
    }
    window.oaiq('init', { pixelId: config.openaiPixelId });
    window.oaiq('measure', 'page_viewed', { type: 'contents' });
  }
  let dialog, frame;
  const seen = new Set();
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="https://calendly.com/alirafie-berkeley/new-meeting"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof HTMLDialogElement === 'undefined') return;
    event.preventDefault();
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.setAttribute('aria-label', 'Book a free 15-minute consultation');
      dialog.style.cssText = 'width:min(960px,96vw);max-width:96vw;padding:16px;border:0;border-radius:16px;background:#fff;color:#25303b;';
      const close = document.createElement('button');
      close.textContent = 'Close booking';
      close.style.cssText = 'padding:10px 16px;cursor:pointer;';
      close.addEventListener('click', () => dialog.close());
      const fallback = document.createElement('a');
      fallback.href = link.href;
      fallback.target = '_blank';
      fallback.rel = 'noopener';
      fallback.textContent = 'Open Calendly in a new tab';
      fallback.style.marginLeft = '16px';
      frame = document.createElement('iframe');
      frame.title = 'Schedule your free consultation with Ali Rafie';
      frame.style.cssText = 'display:block;width:100%;height:70vh;min-height:360px;border:0;margin-top:12px;';
      const url = new URL(link.href);
      url.searchParams.set('embed_domain', window.location.hostname);
      url.searchParams.set('embed_type', 'Inline');
      for (const [key, value] of new URLSearchParams(window.location.search)) {
        if (/^utm_(source|medium|campaign|content|term)$/.test(key)) url.searchParams.set(key, value);
      }
      frame.src = url.href;
      dialog.append(close, fallback, frame);
      document.body.append(dialog);
    }
    dialog.showModal();
  });
  window.addEventListener('message', event => {
    if (event.origin !== 'https://calendly.com' || !frame || event.source !== frame.contentWindow || event.data?.event !== 'calendly.event_scheduled') return;
    const uri = event.data.payload?.event?.uri;
    if (typeof uri !== 'string' || !uri.startsWith('https://api.calendly.com/scheduled_events/')) return;
    const id = uri.split('/').pop();
    if (!id || seen.has(id)) return;
    seen.add(id);
    // Only a confirmed booking can trigger a conversion; clicks never do.
    if (openaiEnabled) window.oaiq('measure', 'appointment_scheduled', {
      type: 'customer_action'
    }, { event_id: 'calendly_' + id });
    if (enabled) window.gtag('event', 'conversion', {
      send_to: config.conversionId + '/' + config.conversionLabel,
      transaction_id: id
    });
  });
})();
