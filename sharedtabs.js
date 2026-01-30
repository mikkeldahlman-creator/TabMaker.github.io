// sharedtabs.js — viser tabs som ANDRE har delt med deg
// Hovedidé:
// 1) Vente til Supabase er klar
// 2) Finne hvem som er innlogget
// 3) Hente alle "delinger" fra databasen (tab_shares)
// 4) Vise dem i en liste med Open + Remove


// ============================
// DEL 1: Vente på at Supabase-klienten finnes
// ============================
// login.js lager window.supabaseClient. Denne funksjonen venter litt til den finnes.
// Hvis den aldri kommer: feilmelding etter timeout.
function waitForSupabaseClient(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(t);
        resolve(window.supabaseClient);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(t);
        reject(new Error("Timed out waiting for supabaseClient"));
      }
    }, 50);
  });
}


// ============================
// DEL 2: Hente Supabase-klienten enkelt
// ============================
// Dette er bare en liten “helper” så jeg slipper å skrive window.supabaseClient overalt.
function getSB() {
  if (!window.supabaseClient) throw new Error("supabaseClient not ready");
  return window.supabaseClient;
}


// ============================
// DEL 3: Sikker tekst (unngå at HTML ødelegges)
// ============================
// Hvis noen skriver rare tegn i en tittel, så kan det ødelegge HTML.
// esc() gjør teksten trygg å putte inn i HTML.
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}


// ============================
// DEL 4: Hente "Shared Tabs" fra databasen
// ============================
// Her henter jeg alle tabs som er delt med den innloggede brukeren.
// Tabellen tab_shares sier: hvilken tab, hvem den er delt med, og hvilken rettighet.
async function listSharedTabs() {
  const sb = getSB();

  // Sjekker hvem som er innlogget
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  // Henter rader fra tab_shares der "shared_with" = meg
  // Samtidig henter jeg litt info fra tabellen tabs (tittel, dato) via koblingen tab_id -> tabs.id
  const { data, error } = await sb
    .from("tab_shares")
    .select(`
      id,
      tab_id,
      permission,
      created_at,
      tabs:tab_id ( id, title, created_at )
    `)
    .eq("shared_with", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}


// ============================
// DEL 5: Vise shared tabs på nettsiden (HTML)
// ============================
// Dette tar data fra listSharedTabs() og lager en liste på siden.
function renderSharedTabs(items) {
  const list = document.getElementById("sharedTabsList");
  const msg = document.getElementById("sharedTabsMsg");
  if (!list) return;

  // Hvis ingen tabs er delt med deg
  if (!items.length) {
    if (msg) msg.textContent = "No tabs have been shared with you yet.";
    list.innerHTML = "";
    return;
  }

  // Hvis du har tabs: vis antall
  if (msg) msg.textContent = `Found ${items.length} shared tab(s).`;

  // Lager HTML for hver deling
  list.innerHTML = items.map(row => {
    const tab = row.tabs;
    const when = row.created_at ? new Date(row.created_at).toLocaleString() : "";

    return `
      <div class="border rounded p-3 d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">${esc(tab?.title || "Untitled")}</div>
          <div class="small text-muted">
            Shared: ${esc(when)} • Permission: ${esc(row.permission || "read")} • ${esc(row.tab_id)}
          </div>
        </div>

        <div class="d-flex gap-2">
          <!-- Open: åpner tabben i CreateTab-siden med ?tab=ID -->
          <a class="btn btn-sm btn-outline-dark"
             href="Createtab.html?tab=${encodeURIComponent(row.tab_id)}">
            Open
          </a>

          <!-- Remove: fjerner delingen fra MIN liste (sletter delingsraden) -->
          <button class="btn btn-sm btn-outline-danger" type="button" data-remove="${esc(row.id)}">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join("");


  // ============================
  // DEL 6: Remove-knapp (fjerner delingen)
  // ============================
  // Viktig: Remove sletter IKKE tabben. Den sletter bare "share"-koblingen i tab_shares.
  list.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const shareId = btn.getAttribute("data-remove");
      if (!shareId) return;

      // Ber om bekreftelse så man ikke klikker feil
      if (!confirm("Remove this shared tab from your list?")) return;

      try {
        const sb = getSB();

        // Sletter delingsraden (share) fra tab_shares-tabellen
        const { error } = await sb.from("tab_shares").delete().eq("id", shareId);
        if (error) throw error;

        // Fjerner kortet i UI etterpå
        btn.closest(".border")?.remove();
      } catch (e) {
        alert("Remove failed: " + (e.message || e));
      }
    });
  });
}


// ============================
// DEL 7: Starte alt når siden åpner
// ============================
// Dette er “main”-funksjonen: vis loading -> hent data -> render.
async function initSharedTabs() {
  const msg = document.getElementById("sharedTabsMsg");

  try {
    if (msg) msg.textContent = "Loading...";

    // Venter på supabaseClient (som login.js lager)
    await waitForSupabaseClient();

    // Henter shared tabs fra databasen
    const items = await listSharedTabs();

    // Viser dem på siden
    renderSharedTabs(items);

  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Could not load shared tabs: " + (e.message || e);
  }
}

// Kjør init når siden er ferdig lastet
document.addEventListener("DOMContentLoaded", initSharedTabs);
