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
  ['https://calendly.com', 'https://assets.calendly.com'].forEach(href => {
    const hint = document.createElement('link');
    hint.rel = 'preconnect';
    hint.href = href;
    hint.crossOrigin = '';
    document.head.append(hint);
  });
  let dialog, frame;
  const seen = new Set();
  function prepareBooking(link) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.setAttribute('aria-label', 'Book a free 15-minute consultation');
      dialog.className = 'booking-dialog';
      const layout = document.createElement('style');
      layout.textContent = `
        .booking-dialog {width:min(960px,96vw);max-width:96vw;padding:16px;border:0;border-radius:16px;background:#fff;color:#25303b;box-sizing:border-box;}
        .booking-dialog .booking-controls {display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;flex-shrink:0;}
        .booking-dialog .booking-frame {display:block;width:100%;height:70vh;min-height:360px;border:0;margin-top:12px;}
        .booking-dialog .booking-loading {margin:24px 0 0;text-align:center;color:#5b6670;}
        .booking-dialog.booking-preparing:not([open]) {display:flex;flex-direction:column;position:fixed;left:0;top:0;width:100vw;max-width:640px;height:100dvh;max-height:100dvh;margin:0;opacity:0;z-index:-1;pointer-events:none;}
        @media(max-width:640px) {
          .booking-dialog[open] {position:fixed;inset:0;display:flex;flex-direction:column;width:100%;max-width:100%;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;margin:0;padding:12px;border-radius:0;overflow:hidden;}
          .booking-dialog .booking-controls {font-size:14px;line-height:1.5;}
          .booking-dialog .booking-controls button {min-height:44px;}
          .booking-dialog .booking-frame {flex:1 1 0;min-height:0;height:auto;margin-top:8px;}
          .booking-dialog .booking-loading {font-size:14px;margin:12px 0;}
        }
      `;
      document.head.append(layout);
      const close = document.createElement('button');
      close.textContent = 'Close booking';
      close.style.cssText = 'padding:10px 16px;cursor:pointer;';
      close.addEventListener('click', () => dialog.close());
      const fallback = document.createElement('a');
      fallback.href = link.href;
      fallback.target = '_blank';
      fallback.rel = 'noopener';
      fallback.dataset.bookingExternal = 'true';
      fallback.textContent = 'Open Calendly in a new tab';
      const controls = document.createElement('div');
      controls.className = 'booking-controls';
      controls.append(close, fallback);
      frame = document.createElement('iframe');
      frame.title = 'Schedule your free consultation with Ali Rafie';
      frame.className = 'booking-frame';
      const loading = document.createElement('p');
      loading.className = 'booking-loading';
      loading.setAttribute('role', 'status');
      loading.textContent = 'Loading available times…';
      frame.addEventListener('load', () => loading.remove(), { once: true });
      const url = new URL(link.href);
      const externalUrl = new URL(link.href);
      url.searchParams.set('embed_domain', window.location.hostname);
      url.searchParams.set('embed_type', 'Inline');
      if (window.matchMedia('(max-width: 640px)').matches) url.searchParams.set('hide_event_type_details', '1');
      for (const [key, value] of new URLSearchParams(window.location.search)) {
        if (/^utm_(source|medium|campaign|content|term)$/.test(key)) {
          url.searchParams.set(key, value);
          externalUrl.searchParams.set(key, value);
        }
      }
      frame.src = url.href;
      fallback.href = externalUrl.href;
      dialog.append(controls, loading, frame);
      document.body.append(dialog);
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="https://calendly.com/alirafie-berkeley/new-meeting"]');
    if (!link || link.dataset.bookingExternal === 'true' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof HTMLDialogElement === 'undefined') return;
    event.preventDefault();
    prepareBooking(link);
    dialog.classList.remove('booking-preparing');
    dialog.removeAttribute('aria-hidden');
    dialog.removeAttribute('inert');
    dialog.showModal();
  });
  // Prepare once while phone visitors read; the same frame retains booking tracking.
  // The dialog stays closed and Calendly's own cookie choices remain available.
  if (window.matchMedia('(max-width: 640px)').matches && document.body.classList.contains('practice-page') && typeof HTMLDialogElement !== 'undefined') {
    window.setTimeout(() => {
      const link = document.querySelector('.practice-hero a[href^="https://calendly.com/alirafie-berkeley/new-meeting"]');
      if (link && !dialog) {
        prepareBooking(link);
        dialog.classList.add('booking-preparing');
        dialog.setAttribute('aria-hidden', 'true');
        dialog.setAttribute('inert', '');
      }
    }, 1500);
  }
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
