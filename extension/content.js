/**
 * LockBox Autofill — Content Script
 *
 * Responsibilities:
 *  1. Announce the extension ID to the page (so LockBox app can detect it)
 *  2. Listen for LOCKBOX_SYNC messages from the LockBox app page
 *  3. Detect login forms and inject autofill chip
 */

(function () {
  'use strict';

  // ─── 1. Announce extension presence to the page ──────────────────────────
  // The LockBox app listens for this and stores the ID so it can detect installation.
  try {
    window.postMessage({ type: 'LOCKBOX_EXT_PRESENT', extensionId: chrome.runtime.id }, window.location.origin || '*');
  } catch (_) {}

  // ─── 2. Relay LOCKBOX_SYNC from page → background ────────────────────────
  window.addEventListener('message', event => {
    // Only accept messages from same origin
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'LOCKBOX_SYNC' && Array.isArray(msg.entries)) {
      chrome.runtime.sendMessage({ type: 'LOCKBOX_SYNC', entries: msg.entries, token: msg.token || null },
        response => {
          // Relay result back to page
          window.postMessage({ type: 'LOCKBOX_SYNC_RESULT', ...response }, window.location.origin || '*');
        }
      );
    }
  });

  // ─── 3. Autofill chip ────────────────────────────────────────────────────

  /** Find the best username field near a password field. */
  function findUsernameField(passwordField) {
    const form = passwordField.closest('form');
    const candidates = form
      ? Array.from(form.querySelectorAll('input'))
      : Array.from(document.querySelectorAll('input'));
    const usernameTypes = new Set(['email', 'text', 'tel']);
    // Look backwards from the password field
    const pwIdx = candidates.indexOf(passwordField);
    for (let i = pwIdx - 1; i >= 0; i--) {
      const el = candidates[i];
      if (usernameTypes.has(el.type) && !el.hidden && el.offsetParent !== null) return el;
    }
    return null;
  }

  /** Create and inject the autofill suggestion chip. */
  function injectChip(passwordField, entries) {
    const existing = document.getElementById('__lockbox_chip__');
    if (existing) existing.remove();
    if (!entries.length) return;

    const chip = document.createElement('div');
    chip.id = '__lockbox_chip__';
    chip.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: #1e2235;
      border: 1px solid rgba(139,92,246,0.5);
      border-radius: 10px;
      padding: 6px 4px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      color: #e2e8f0;
      min-width: 220px;
      max-width: 320px;
      max-height: 240px;
      overflow-y: auto;
    `;

    const rect = passwordField.getBoundingClientRect();
    chip.style.top  = `${Math.min(rect.bottom + 6, window.innerHeight - 260)}px`;
    chip.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 330))}px`;

    entries.slice(0, 8).forEach(entry => {
      const row = document.createElement('button');
      row.style.cssText = `
        display: flex; flex-direction: column; width: 100%; text-align: left;
        padding: 7px 10px; border-radius: 7px; border: none; background: transparent;
        color: inherit; cursor: pointer; transition: background 0.15s;
      `;
      row.innerHTML = `
        <span style="font-weight:600;color:#c4b5fd;font-size:13px;">${escHtml(entry.name)}</span>
        <span style="font-size:11px;color:#94a3b8;margin-top:1px;">${escHtml(entry.username || entry.url || '')}</span>
      `;
      row.addEventListener('mouseenter', () => { row.style.background = 'rgba(139,92,246,0.18)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
      row.addEventListener('mousedown', e => {
        e.preventDefault();
        const userField = findUsernameField(passwordField);
        if (userField && entry.username) {
          setNativeValue(userField, entry.username);
        }
        setNativeValue(passwordField, entry.password);
        chip.remove();
      });
      chip.appendChild(row);
    });

    // Close when clicking outside
    const onClickOutside = (e) => {
      if (!chip.contains(e.target)) { chip.remove(); document.removeEventListener('mousedown', onClickOutside); }
    };
    setTimeout(() => document.addEventListener('mousedown', onClickOutside), 50);

    document.body.appendChild(chip);
  }

  /** Escape HTML entities to prevent XSS in innerHTML */
  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Set a React/Vue-controlled input value by dispatching native events.
   * This triggers React's synthetic event system so state updates correctly.
   */
  function setNativeValue(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) nativeInputValueSetter.call(el, value);
    el.value = value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Attach focus handler to password fields. */
  function attachToPasswordFields() {
    const fields = document.querySelectorAll('input[type="password"]:not([data-lockbox-attached])');
    fields.forEach(field => {
      field.setAttribute('data-lockbox-attached', '1');
      field.addEventListener('focus', () => {
        chrome.runtime.sendMessage(
          { type: 'GET_CREDENTIALS', url: window.location.href },
          response => {
            if (chrome.runtime.lastError) return;
            if (response?.entries?.length) injectChip(field, response.entries);
          }
        );
      });
      field.addEventListener('blur', () => {
        // Delay removal so click on chip registers first
        setTimeout(() => {
          const chip = document.getElementById('__lockbox_chip__');
          if (chip && !chip.matches(':focus-within')) chip.remove();
        }, 200);
      });
    });
  }

  // Run on DOM ready and watch for dynamic forms
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachToPasswordFields);
  } else {
    attachToPasswordFields();
  }

  const obs = new MutationObserver(() => attachToPasswordFields());
  obs.observe(document.body, { childList: true, subtree: true });
})();
