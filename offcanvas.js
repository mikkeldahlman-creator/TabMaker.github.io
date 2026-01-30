// offcanvas.js — styrer login-panelet (authPanel)
// Hovedidé:
// - Hvis du IKKE er logget inn → login-panelet åpnes automatisk og kan ikke lukkes
// - Hvis du ER logget inn → panelet er lukket og kan lukkes normalt


document.addEventListener('DOMContentLoaded', function () {

  // ============================
  // DEL 1: Hente HTML-elementene
  // ============================

  const offEl = document.getElementById('authPanel');
  const closeBtn = document.getElementById('authCloseBtn');

  if (!offEl) return;

  // Denne bestemmer om brukeren får lov til å lukke panelet
  let allowClose = false;


  // ============================
  // DEL 2: Hente Bootstrap Offcanvas-instansen
  // ============================

  function offcanvasInstance() {
    // Sjekker at Bootstrap finnes før vi bruker det
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


  // ============================
  // DEL 3: Hindre lukking hvis brukeren ikke er logget inn
  // ============================

  function preventHideIfNeeded(e) {
    // Hvis allowClose er false, blokkerer vi lukking
    if (!allowClose) e.preventDefault();
  }

  // Denne kjører hver gang noen prøver å lukke offcanvas
  offEl.addEventListener('hide.bs.offcanvas', preventHideIfNeeded);


  // ============================
  // DEL 4: Lukkeknappen fungerer kun etter login
  // ============================

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      // Lukkeknappen gjør ingenting før allowClose = true
      if (allowClose) hideOffcanvas();
    });
  }


  // ============================
  // DEL 5: Funksjon login.js kan kalle etter innlogging
  // ============================

  // Når brukeren har logget inn, kaller login.js denne funksjonen.
  // Da tillater vi lukking og skjuler panelet.
  window.allowOffcanvasClose = function () {
    allowClose = true;
    hideOffcanvas();
  };


  // ============================
  // DEL 6: Vente på Supabase-klienten
  // ============================

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


  // ============================
  // DEL 7: Bestemme om panelet skal åpnes eller ikke
  // ============================

  (async function init() {
    try {
      // Venter på Supabase (fra login.js)
      const sb = await waitForSupabaseClient(4000).catch(() => null);

      // Hvis Supabase ikke finnes → åpne panelet for sikkerhets skyld
      if (!sb) {
        showOffcanvas();
        return;
      }

      // Spør Supabase: er det en innlogget bruker?
      const { data: { user }, error } = await sb.auth.getUser();
      if (error) console.warn('auth.getUser error', error);

      if (user) {
        // Hvis innlogget:
        // - ikke tving panelet åpent
        // - tillat lukking
        allowClose = true;
        hideOffcanvas();
      } else {
        // Hvis IKKE innlogget:
        // - åpne panelet automatisk
        // - ikke la brukeren lukke det
        allowClose = false;
        showOffcanvas();
      }

    } catch (e) {
      // Hvis noe feiler, spiller vi safe og åpner login-panelet
      console.warn('offcanvas init failed, opening auth panel as fallback', e);
      allowClose = false;
      showOffcanvas();
    }
  })();
});
