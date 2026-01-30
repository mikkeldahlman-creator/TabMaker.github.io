// savedtabs.js — viser dine egne lagrede tabs
// Du kan: Open / Share / Delete
// Hovedidé:
// 1) Vente til Supabase er klar
// 2) Finne hvem som er innlogget
// 3) Hente bare tabs som DU eier
// 4) Vise dem i liste
// 5) Koble knapper til Delete og Share


// ============================
// DEL 1: Vente på Supabase-klienten
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
        reject(new Error("Timed out waiting for supabaseClient"));
      }
    }, 50);
  });
}


// ============================
// DEL 2: Hente Supabase-klienten (kobling til database)
// ============================

function getSB() {
  if (!window.supabaseClient) throw new Error("supabaseClient not ready");
  return window.supabaseClient;
}


// ============================
// DEL 3: Gjøre tekst trygg i HTML
// ============================
// Hvis tab-tittel har rare tegn, kan det ødelegge HTML-en.
// esc() gjør at tittelen vises riktig og trygt.
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}


// ============================
// DEL 4: Hente bare dine tabs fra databasen
// ============================

async function listMyTabs() {
  const sb = getSB();

  // Henter innlogget bruker
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  // Viktigste linje her:
  // .eq("user_id", user.id) gjør at du bare ser tabs som DU eier.
  const { data, error } = await sb
    .from("tabs")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}


// ============================
// DEL 5: Vise tabsene på siden (HTML + knapper)
// ============================

function renderTabsList(tabs) {
  const list = document.getElementById("savedTabsList");
  const msg = document.getElementById("savedTabsMsg");
  if (!list) return;

  // Hvis du ikke har lagret noe ennå
  if (!tabs.length) {
    if (msg) msg.textContent = "No saved tabs yet.";
    list.innerHTML = "";
    return;
  }

  // Viser antall tabs
  if (msg) msg.textContent = `Found ${tabs.length} tab(s).`;

  // Lager et "kort" for hver tab
  list.innerHTML = tabs.map(t => {
    const date = t.created_at ? new Date(t.created_at).toLocaleString() : "";
    return `
      <div class="border rounded p-3 d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">${esc(t.title || "Untitled")}</div>
          <div class="small text-muted">${esc(date)} • ${esc(t.id)}</div>
        </div>

        <div class="d-flex gap-2">
          <!-- Open: åpner tabben i edit-siden med ?tab=ID -->
          <a class="btn btn-sm btn-outline-dark"
             href="./Createtab.html?tab=${encodeURIComponent(t.id)}">
            Open
          </a>

          <!-- Share: deler tabben med en annen bruker -->
          <button class="btn btn-sm btn-outline-primary"
                  type="button"
                  data-share="${esc(t.id)}">
            Share
          </button>

          <!-- Delete: sletter tabben fra databasen -->
          <button class="btn btn-sm btn-outline-danger"
                  type="button"
                  data-del="${esc(t.id)}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Etter at HTML er laget, må vi koble knappene til funksjonene
  hookDeleteButtons();
  hookShareButtons();
}


// ============================
// DEL 6: Delete-funksjon (sletter tabben)
// ============================

function hookDeleteButtons() {
  document.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      if (!id) return;

      // Spør først så man ikke sletter ved uhell
      if (!confirm("Delete this tab?")) return;

      try {
        const sb = getSB();

        // Sletter raden i "tabs"-tabellen
        const { error } = await sb.from("tabs").delete().eq("id", id);
        if (error) throw error;

        // Fjerner kortet fra listen med en gang
        btn.closest(".border")?.remove();
      } catch (e) {
        alert("Delete failed: " + (e.message || e));
      }
    });
  });
}


// ============================
// DEL 7: Share-funksjon (deler tab med andre)
// ============================

function hookShareButtons() {
  document.querySelectorAll("[data-share]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tabId = btn.dataset.share;
      if (!tabId) return;

      // Spør hvem du vil dele med (brukernavn)
      const username = prompt("Share with username:");
      if (!username) return;

      // Spør om rettighet: read eller write
      const perm = (prompt("Permission: read or write", "read") || "")
        .trim()
        .toLowerCase();

      // Sjekker at brukeren skrev riktig
      if (!["read", "write"].includes(perm)) {
        alert("Permission must be 'read' or 'write'");
        return;
      }

      try {
        const sb = getSB();

        // 1) Finn bruker-id ved å slå opp username i "profiles"
        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("id")
          .eq("username", username)
          .single();

        if (profErr) throw profErr;

        // 2) Lag en ny "deling" i tab_shares
        // tab_id = hvilken tab som deles
        // shared_with = hvem som får den
        // permission = read eller write
        const { error } = await sb
          .from("tab_shares")
          .insert([{ tab_id: tabId, shared_with: prof.id, permission: perm }]);

        if (error) throw error;

        alert(`Shared ✅ with ${username} (${perm})`);
      } catch (e) {
        alert("Share failed: " + (e.message || e));
      }
    });
  });
}


// ============================
// DEL 8: Starte alt når siden åpner
// ============================

async function initSavedTabs() {
  const msg = document.getElementById("savedTabsMsg");
  try {
    if (msg) msg.textContent = "Loading...";

    // Venter på at login.js skal lage supabaseClient
    await waitForSupabaseClient();

    // Henter dine tabs
    const tabs = await listMyTabs();

    // Viser dem på siden
    renderTabsList(tabs);

  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Could not load tabs: " + (e.message || e);
  }
}

document.addEventListener("DOMContentLoaded", initSavedTabs);
