// offcanvas.js — open authPanel ONLY if NOT logged in (Supabase-aware)

document.addEventListener('DOMContentLoaded', function () {
  const offEl = document.getElementById('authPanel');
  const closeBtn = document.getElementById('authCloseBtn');

  if (!offEl) return;

  let allowClose = false;

  function offcanvasInstance() {
    return (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas)
      ? bootstrap.Offcanvas.getOrCreateInstance(offEl)
      : null;
  }

  function showOffcanvas() {
    const inst = offcanvasInstance();
    if (inst) inst.show();
  }

  function hideOffcanvas() {
    const inst = offcanvasInstance();
    if (inst) inst.hide();
  }

  function preventHideIfNeeded(e) {
    if (!allowClose) e.preventDefault();
  }

  // Block hiding unless allowClose = true
  offEl.addEventListener('hide.bs.offcanvas', preventHideIfNeeded);

  // Close button only works after login
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      if (allowClose) hideOffcanvas();
    });
  }

  // Public helper: login.js calls this after login
  window.allowOffcanvasClose = function () {
    allowClose = true;
    hideOffcanvas();
  };

  // Wait for Supabase client created by login.js
  function waitForSupabaseClient(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (window.supabaseClient) {
          clearInterval(t);
          resolve(window.supabaseClient);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          reject(new Error('Timed out waiting for supabaseClient'));
        }
      }, 50);
    });
  }

  // Decide whether to open based on REAL auth state
  (async function init() {
    try {
      // If login.js hasn't run / Supabase not available, fall back to opening
      const sb = await waitForSupabaseClient(4000).catch(() => null);
      if (!sb) {
        showOffcanvas();
        return;
      }

      const { data: { user }, error } = await sb.auth.getUser();
      if (error) console.warn('auth.getUser error', error);

      if (user) {
        // Logged in → don't force open; allow closing if it was open
        allowClose = true;
        hideOffcanvas();
      } else {
        // Not logged in → force open and block closing
        allowClose = false;
        showOffcanvas();
      }
    } catch (e) {
      console.warn('offcanvas init failed, opening auth panel as fallback', e);
      allowClose = false;
      showOffcanvas();
    }
  })();
});
