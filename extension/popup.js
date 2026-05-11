/**
 * LockBox Autofill — Popup script
 */
(async function () {
  const LOCKBOX_URL_KEY = 'lockbox_app_url';

  // ── Load stored LockBox app URL ──────────────────────────────────────────
  const stored = await chrome.storage.local.get(LOCKBOX_URL_KEY);
  const lockboxUrl = stored[LOCKBOX_URL_KEY] || 'http://localhost:5173';

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const syncStatus    = document.getElementById('sync-status');
  const currentDomain = document.getElementById('current-domain');
  const entriesList   = document.getElementById('entries-list');
  const emptyState    = document.getElementById('empty-state');
  const noSyncState   = document.getElementById('no-sync-state');
  const btnLock       = document.getElementById('btn-lock');
  const btnOpen       = document.getElementById('btn-open-lockbox');

  // ── Fetch entries for active tab ─────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS_FOR_TAB' }, response => {
    if (chrome.runtime.lastError || !response) {
      syncStatus.textContent = 'Extension error — reload it.';
      return;
    }

    const { entries, domain, syncedAt } = response;

    // Update sync timestamp
    if (syncedAt) {
      syncStatus.textContent = `Last synced: ${new Date(syncedAt).toLocaleString()}`;
    } else {
      syncStatus.textContent = 'Not synced yet';
      noSyncState.classList.remove('hidden');
      entriesList.classList.add('hidden');
      return;
    }

    currentDomain.textContent = domain || window.location.hostname;

    if (!entries || entries.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    // Render entry cards
    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'entry-card';
      card.innerHTML = `
        <div class="entry-name">${escHtml(entry.name)}</div>
        <div class="entry-user">${escHtml(entry.username || entry.url || '')}</div>
        <div class="entry-actions">
          <button class="btn-copy" data-copy="username" title="Copy username">Copy Username</button>
          <button class="btn-copy" data-copy="password" title="Copy password">Copy Password</button>
        </div>
      `;
      const [btnUser, btnPass] = card.querySelectorAll('.btn-copy');
      btnUser.addEventListener('click', () => copyToClipboard(entry.username || '', btnUser));
      btnPass.addEventListener('click', () => copyToClipboard(entry.password || '', btnPass));
      entriesList.appendChild(card);
    });
  });

  // ── Sync Token generation ─────────────────────────────────────────────────
  const btnGenToken  = document.getElementById('btn-gen-token');
  const tokenDisplay = document.getElementById('token-display');
  const tokenValue   = document.getElementById('token-value');
  const btnCopyToken = document.getElementById('btn-copy-token');

  btnGenToken.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GENERATE_TOKEN' }, response => {
      if (chrome.runtime.lastError || !response?.token) return;
      tokenValue.value = response.token;
      tokenDisplay.classList.remove('hidden');
      btnGenToken.textContent = 'Regenerate Token';
    });
  });

  btnCopyToken.addEventListener('click', () => {
    navigator.clipboard.writeText(tokenValue.value).then(() => {
      const orig = btnCopyToken.textContent;
      btnCopyToken.textContent = 'Copied!';
      setTimeout(() => { btnCopyToken.textContent = orig; }, 1500);
    });
  });

  // ── Lock (clear) button ──────────────────────────────────────────────────
  btnLock.addEventListener('click', async () => {
    if (!confirm('Clear all stored credentials from the extension?')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR' }, () => window.close());
  });

  // ── Open LockBox button ──────────────────────────────────────────────────
  btnOpen.addEventListener('click', () => {
    chrome.tabs.create({ url: lockboxUrl });
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  async function copyToClipboard(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    } catch {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = btn.dataset.copy === 'username' ? 'Copy Username' : 'Copy Password'; }, 1500);
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
