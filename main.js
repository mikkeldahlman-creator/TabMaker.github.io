// main.js — simplified and commented
document.addEventListener('DOMContentLoaded', function () {
  const offEl = document.getElementById('authPanel');
  const authLoggedIn = document.getElementById('authLoggedIn');
  const authLoggedOut = document.getElementById('authLoggedOut');
  const authUserBadge = document.getElementById('authUserBadge');
  const closeBtn = document.getElementById('authCloseBtn');

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

  function preventHideIfNeeded(e) {
    if (!allowClose) e.preventDefault();
  }

  // Block programmatic hiding unless `allowClose` is true
  if (offEl) offEl.addEventListener('hide.bs.offcanvas', preventHideIfNeeded);

  // Close button only works after login
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      if (allowClose) {
        const inst = offcanvasInstance();
        if (inst) inst.hide();
      }
    });
  }

  // Public helper: call after a successful login to allow closing
  window.allowOffcanvasClose = function () {
    allowClose = true;
    const inst = offcanvasInstance();
    if (inst) inst.hide();
  };

  // If Supabase is present, the auth flow is handled in `login.js`.
  // Only attach the fallback local login handler when Supabase isn't loaded.
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    if (typeof window.supabase !== 'undefined' || typeof window.supabaseClient !== 'undefined') {
      console.log('Supabase detected — skipping main.js fallback login handler');
    } else {
      loginForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        const email = (document.getElementById('loginEmail') || {}).value || '';

        // Mark user as logged in in the UI
        if (authUserBadge) authUserBadge.textContent = email;
        if (authLoggedOut) authLoggedOut.style.display = 'none';
        if (authLoggedIn) authLoggedIn.style.display = 'block';
        if (document.getElementById('whoami')) document.getElementById('whoami').textContent = email;

        // Allow and trigger closing the offcanvas
        window.allowOffcanvasClose();
      });
    }
  }

  // Auto-open the offcanvas if the page appears unauthenticated
  const isLoggedIn = function () {
    if (authLoggedIn) {
      const st = window.getComputedStyle(authLoggedIn);
      if (st && st.display !== 'none' && authLoggedIn.offsetHeight > 0) return true;
    }
    if (authUserBadge && authUserBadge.textContent && authUserBadge.textContent.trim().length) return true;
    return false;
  };

  if (!isLoggedIn()) showOffcanvas();
});
