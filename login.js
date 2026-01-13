// login.js — En login løsning laget med hjelp av Supabase.

// Denne passer på at supabase fungerer, hvis ikke så sier den ifra i console.
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(new Error('Failed loading script: ' + src));
    document.head.appendChild(s);
  });
}

async function ensureSupabaseClient() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    // UMD already available
  } else {
    // Try a more reliable CDN fallback
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
    } catch (err) {
      console.error('Failed to load Supabase UMD script:', err);
      throw err;
    }
  }

  // Create client and expose globally for other scripts
  const client = window.supabase.createClient(
    'https://wrnrzuqftbzajeeavxjr.supabase.co',
    'sb_publishable_H2Ih9F-avhk-wDMHqCcfYw_NXDmI4yD'
  );
  window.supabaseClient = client;
  console.log('login.js initialized supabaseClient');
  return client;
}

document.addEventListener('DOMContentLoaded', async () => {
  let supabaseClient;
  try {
    supabaseClient = await ensureSupabaseClient();
  } catch (err) {
    console.error('Supabase initialization failed — auth disabled', err);
    return; // abort auth setup
  }
  // Elements
  const panel = document.getElementById('authPanel');
  const openBtn = document.getElementById('authOpenBtn');
  const closeBtn = document.getElementById('authCloseBtn');
  const userBadge = document.getElementById('authUserBadge');

  const loggedOut = document.getElementById('authLoggedOut');
  const loggedIn = document.getElementById('authLoggedIn');
  const whoami = document.getElementById('whoami');
  const roleBadge = document.getElementById('roleBadge');

  const tabButtons = document.querySelectorAll('[data-tab]');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginMsg = document.getElementById('loginMsg');
  const signupMsg = document.getElementById('signupMsg');

  console.log('Auth elements:', { panel, openBtn, closeBtn, loginForm, signupForm });

  // Guard: if essential elements missing, abort
  if (!loginForm || !signupForm) {
    console.warn('Login/signup forms not found — aborting auth init');
    return;
  }

  // Open/close handlers (optional)
  if (openBtn && panel) openBtn.addEventListener('click', () => panel.classList.add('show'));
  if (closeBtn && panel) closeBtn.addEventListener('click', () => panel.classList.remove('show'));

  // Bytter imellom opprett bruker og logg inn.
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (loginForm) loginForm.style.display = tab === 'login' ? '' : 'none';
      if (signupForm) signupForm.style.display = tab === 'signup' ? '' : 'none';
    });
  });

  // Refresh UI (with simple re-entrancy guard)
  let _refreshing = false;
  async function refreshAuthUI() {
    if (_refreshing) return;
    _refreshing = true;
    console.log('refreshAuthUI start');
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      console.log('getUser ->', user);

      if (!user) {
        if (loggedOut) loggedOut.style.display = '';
        if (loggedIn) loggedIn.style.display = 'none';
        if (userBadge) userBadge.textContent = '';
        return;
      }

      // Try reading `profiles` table for role (optional)
      let role = 'user';
      try {
        const { data: profile, error } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && profile) role = profile.role ?? 'user';
        console.log('profile query', profile, error);
      } catch (err) {
        console.warn('profiles query failed', err.message || err);
      }

      if (loggedOut) loggedOut.style.display = 'none';
      if (loggedIn) loggedIn.style.display = '';
      if (whoami) whoami.textContent = `Innlogget som ${user.email}`;
      if (roleBadge) roleBadge.textContent = `Rolle: ${role}`;
      if (userBadge) userBadge.textContent = role === 'admin' ? 'Admin' : 'Innlogget';
      // If page provides the offcanvas helper, allow closing (useful after a reload)
      if (typeof window.allowOffcanvasClose === 'function') {
        try { window.allowOffcanvasClose(); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('refreshAuthUI error', err);
    } finally {
      _refreshing = false;
    }
  }

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginMsg) loginMsg.textContent = 'Logger inn...';
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
      if (error) {
        console.error('signIn error', error);
        if (loginMsg) loginMsg.textContent = 'Feil: ' + error.message;
        return;
      }
      if (loginMsg) loginMsg.textContent = 'Innlogget ✅';
      await refreshAuthUI();
      // Prefer using the page-level helper to close offcanvas when available
      if (typeof window.allowOffcanvasClose === 'function') {
        window.allowOffcanvasClose();
      } else {
        setTimeout(() => {
          if (panel) panel.classList.remove('show');
        }, 400);
      }
      console.log('signIn success', data);
    } catch (err) {
      console.error('Unexpected signIn error', err);
      if (loginMsg) loginMsg.textContent = 'Uventet feil';
    }
  });

  // Signup
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (signupMsg) signupMsg.textContent = 'Oppretter...';
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const pass = document.getElementById('signupPass').value;
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: pass,
        options: { data: { display_name: name } },
      });
      if (error) {
        console.error('signUp error', error);
        if (signupMsg) signupMsg.textContent = 'Feil: ' + error.message;
        return;
      }
      if (signupMsg) signupMsg.textContent = 'Konto opprettet ✅';
      console.log('signUp success', data);
    } catch (err) {
      console.error('Unexpected signUp error', err);
      if (signupMsg) signupMsg.textContent = 'Uventet feil';
    }
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      await refreshAuthUI();
    });
  }

  // Keep UI in sync
  try {
    supabaseClient.auth.onAuthStateChange(() => refreshAuthUI());
  } catch (err) {
    console.warn('onAuthStateChange not available', err);
  }

  // Initial UI update
  refreshAuthUI();
});
