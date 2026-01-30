// login.js — Innlogging/bruker-kontoer med Supabase
// Hovedidé: 
// 1) Sørge for at Supabase-biblioteket er lastet
// 2) Lage en Supabase-klient som resten av siden kan bruke
// 3) Håndtere logg inn / registrer / logg ut
// 4) Oppdatere UI (vise riktig knapp/tekst) ut fra om du er innlogget


// ============================
// DEL 1: Laste inn Supabase-script hvis det mangler
// ============================

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed loading script: ' + src));
    document.head.appendChild(s);
  });
}


// ============================
// DEL 2: Sørge for at Supabase-klient finnes (window.supabaseClient)
// ============================

async function ensureSupabaseClient() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    // ok
  } else {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
    } catch (err) {
      console.error('Failed to load Supabase UMD script:', err);
      throw err;
    }
  }

  const client = window.supabase.createClient(
    'https://wrnrzuqftbzajeeavxjr.supabase.co',
    'sb_publishable_H2Ih9F-avhk-wDMHqCcfYw_NXDmI4yD'
  );

  window.supabaseClient = client;
  console.log('login.js initialized supabaseClient');
  return client;
}


// ============================
// DEL 3: Starte alt når siden er lastet ferdig
// ============================

document.addEventListener('DOMContentLoaded', async () => {

  let supabaseClient;
  try {
    supabaseClient = await ensureSupabaseClient();
  } catch (err) {
    console.error('Supabase initialization failed — auth disabled', err);
    return;
  }


  // ============================
  // DEL 4: Hente HTML-elementer
  // ============================

  const panel = document.getElementById('authPanel');
  const openBtn = document.getElementById('authOpenBtn');
  const closeBtn = document.getElementById('authCloseBtn');
  const userBadge = document.getElementById('authUserBadge');

  const navbarUser = document.getElementById('navbarUser');

  const loggedOut = document.getElementById('authLoggedOut');
  const loggedIn = document.getElementById('authLoggedIn');

  const whoami = document.getElementById('whoami');
  const roleBadge = document.getElementById('roleBadge');

  const tabButtons = document.querySelectorAll('[data-tab]');

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginMsg = document.getElementById('loginMsg');
  const signupMsg = document.getElementById('signupMsg');

  if (!loginForm || !signupForm) {
    console.warn('Login/signup forms not found — aborting auth init');
    return;
  }


  // ============================
  // DEL 5: Bytte mellom login / signup
  // ============================

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      loginForm.style.display = tab === 'login' ? '' : 'none';
      signupForm.style.display = tab === 'signup' ? '' : 'none';
    });
  });


  // ============================
  // DEL 6: Oppdatere UI basert på login-status
  // ============================

  let _refreshing = false;

  async function refreshAuthUI() {
    if (_refreshing) return;
    _refreshing = true;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();

      if (!user) {
        loggedOut.style.display = '';
        loggedIn.style.display = 'none';
        if (userBadge) userBadge.textContent = '';
        if (navbarUser) navbarUser.textContent = '';
        return;
      }

      let role = 'user';
      let profile = null;

      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('role, username')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          profile = data;
          role = data.role ?? 'user';
        }
      } catch (err) {
        console.warn('profiles query failed', err.message || err);
      }

      if (navbarUser) {
        const name =
          profile?.username ||
          user.user_metadata?.display_name ||
          user.email;

        navbarUser.textContent = name;
      }

      loggedOut.style.display = 'none';
      loggedIn.style.display = '';

      if (whoami) whoami.textContent = `Logged in as ${user.email}`;
      if (roleBadge) roleBadge.textContent = `Role: ${role}`;
      if (userBadge) userBadge.textContent = role === 'admin' ? 'Admin' : 'Logged in';

      if (typeof window.allowOffcanvasClose === 'function') {
        window.allowOffcanvasClose();
      }

    } catch (err) {
      console.error('refreshAuthUI error', err);
    } finally {
      _refreshing = false;
    }
  }


  // ============================
  // DEL 7: Login
  // ============================

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (loginMsg) loginMsg.textContent = 'Logging in...';

    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        if (loginMsg) loginMsg.textContent = 'Error: ' + error.message;
        return;
      }

      if (loginMsg) loginMsg.textContent = 'Logged in';
      await refreshAuthUI();

      if (typeof window.allowOffcanvasClose === 'function') {
        window.allowOffcanvasClose();
      } else {
        setTimeout(() => panel?.classList.remove('show'), 400);
      }

    } catch (err) {
      if (loginMsg) loginMsg.textContent = 'Unexpected error';
    }
  });


  // ============================
  // DEL 8: Signup
  // ============================

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (signupMsg) signupMsg.textContent = 'Creating account...';

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const pass = document.getElementById('signupPass').value;

    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password: pass,
        options: { data: { display_name: name } },
      });

      if (error) {
        if (signupMsg) signupMsg.textContent = 'Error: ' + error.message;
        return;
      }

      if (signupMsg) signupMsg.textContent = 'Account created';

    } catch (err) {
      if (signupMsg) signupMsg.textContent = 'Unexpected error';
    }
  });


  // ============================
  // DEL 9: Logout
  // ============================

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      await refreshAuthUI();
    });
  }


  // ============================
  // DEL 10: Holde UI oppdatert
  // ============================

  try {
    supabaseClient.auth.onAuthStateChange(() => refreshAuthUI());
  } catch (err) {
    console.warn('onAuthStateChange not available', err);
  }

  refreshAuthUI();
});
