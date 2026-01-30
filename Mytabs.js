// Mytabs.js (eller lignende)
// Hovedidé:
// - Leser tabben du skriver inn på nettsiden (input-feltene)
// - Lagrer tabben i Supabase databasen
// - Laster inn en tab fra databasen og fyller inn feltene igjen


// ============================
// DEL 0: Husker hvilken tab vi jobber med akkurat nå
// ============================

let currentTabId = null;
// Når du lagrer første gang får du en ID fra databasen.
// Vi lagrer den her så "Save" kan oppdatere samme tab senere.


// ============================
// DEL 1: Hente Supabase-klienten (koblingen til databasen)
// ============================

function getSB() {
  // Dette sjekker at login.js faktisk har laget window.supabaseClient
  if (!window.supabaseClient) throw new Error("supabaseClient not ready (login.js not loaded?)");
  return window.supabaseClient;
}


// ============================
// DEL 2: Samle inn all tab-data fra nettsiden (input-feltene)
// ============================

function collectTabData() {
  const measuresEl = document.getElementById("measures");
  if (!measuresEl) throw new Error("#measures not found");

  // Hver "GitarTab" er en takt / boks med 24 input-felt (6 strenger x 4 slag)
  const measureNodes = measuresEl.querySelectorAll(".GitarTab");

  const measures = Array.from(measureNodes).map(measure => {
    const inputs = Array.from(measure.querySelectorAll(".tab-grid input"));

    // Vi bygger opp data som 6 rader (strenger), der hver rad har 4 felt (slag)
    const rows = [];
    for (let r = 0; r < 6; r++) {
      // slice tar ut 4 og 4 felter om gangen
      rows.push(
        inputs
          .slice(r * 4, r * 4 + 4)
          .map(i => (i.value || "").trim())
      );
    }
    return rows;
  });

  // Dette er "pakken" vi lagrer i databasen
  return { timeSignature: "4/4", measures };
}


// ============================
// DEL 3: Tegne (vise) en tab på siden, basert på data fra databasen
// ============================

function renderTabData(tabData) {
  const measuresEl = document.getElementById("measures");
  if (!measuresEl) throw new Error("#measures not found");

  // Tømmer siden først (så vi ikke får dobbelt innhold)
  measuresEl.innerHTML = "";

  // Hvis vi ikke fikk noe tabData, lager vi en tom tab som standard
  const measures = tabData?.measures?.length
    ? tabData.measures
    : [Array.from({ length: 6 }, () => Array(4).fill(""))];

  // Lager HTML for hver takt/boks og fyller inn verdiene
  for (const measureRows of measures) {
    const wrapper = document.createElement("div");
    wrapper.className = "GitarTab";
    wrapper.innerHTML = `
      <img src="../Tab.jpg" class="GitarTabImg" alt="GitarTab">
      <div class="tab-overlay">
        <form class="tab-form" onsubmit="return false;">
          <div class="tab-grid">
            ${Array.from({ length: 24 }, () => `<input type="text" size="1" maxlength="2" inputmode="numeric">`).join("")}
          </div>
        </form>
      </div>
    `;

    // Fyller inn riktig verdi i riktig input
    const inputs = wrapper.querySelectorAll(".tab-grid input");
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        inputs[r * 4 + c].value = measureRows?.[r]?.[c] ?? "";
      }
    }

    measuresEl.appendChild(wrapper);
  }
}


// ============================
// DEL 4: Lagring – lage en NY rad i databasen (første gang)
// ============================

async function saveNewTabToSupabase(title = "Untitled") {
  const sb = getSB();

  // Sjekker at det finnes en innlogget bruker
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  // Henter tabben fra input-feltene
  const payload = collectTabData();

  // Lager ny rad i "tabs"-tabellen med: eier, tittel og data
  const { data, error } = await sb
    .from("tabs")
    .insert([{ user_id: user.id, title, data: payload }])
    .select("id, title, data")
    .single();

  if (error) throw error;

  // Viktig: nå husker vi id-en, så vi kan oppdatere samme tab senere
  currentTabId = data.id;
  return data;
}


// ============================
// DEL 5: Lagring – oppdatere en eksisterende tab i databasen
// ============================

async function updateTabInSupabase(tabId, title = "Untitled") {
  const sb = getSB();
  const payload = collectTabData();

  const { data, error } = await sb
    .from("tabs")
    .update({ title, data: payload })
    .eq("id", tabId) // oppdaterer riktig tab
    .select("id, title, data")
    .single();

  if (error) throw error;
  return data;
}


// ============================
// DEL 6: Smart "Save" – velger ny eller oppdater basert på currentTabId
// ============================

async function saveTab(title = "Untitled") {
  // Hvis currentTabId ikke finnes -> lag ny
  if (!currentTabId) return await saveNewTabToSupabase(title);

  // Hvis den finnes -> oppdater samme tab
  return await updateTabInSupabase(currentTabId, title);
}


// ============================
// DEL 7: Laste inn en tab fra databasen ved ID
// ============================

async function loadTabById(tabId) {
  const sb = getSB();

  const { data, error } = await sb
    .from("tabs")
    .select("id, title, data")
    .eq("id", tabId)
    .single();

  if (error) throw error;

  // Når vi laster inn en tab, setter vi currentTabId = den tabben
  currentTabId = data.id;
  return data;
}


// ============================
// DEL 8: Knapper på siden (Save, Save New, Load)
// ============================

document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("saveStatus");
  const titleInput = document.getElementById("tabTitle");

  const saveNewBtn = document.getElementById("saveNewBtn");
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const loadId = document.getElementById("loadId");

  // Hvis URL-en har ?tab=ID så prøver vi å auto-laste den tabben
  const params = new URLSearchParams(window.location.search);
  const tabId = params.get("tab");

  if (tabId) {
    try {
      if (status) status.textContent = "Loading tab...";

      const saved = await loadTabById(tabId);
      if (titleInput) titleInput.value = saved.title || "Untitled";
      renderTabData(saved.data);

      if (status) status.textContent = `Loaded id: ${saved.id}`;
    } catch (e) {
      if (status) status.textContent = `Load failed: ${e.message || e}`;
    }
  }

  function setStatus(msg) {
    if (status) status.textContent = msg;
  }

  // "Save New" -> lager en helt ny tab i databasen (ny ID)
  if (saveNewBtn) {
    saveNewBtn.addEventListener("click", async () => {
      try {
        setStatus("Saving new...");
        const title = (titleInput?.value || "Untitled").trim() || "Untitled";
        const saved = await saveNewTabToSupabase(title);
        setStatus(`Saved new id: ${saved.id}`);
      } catch (e) {
        setStatus(`Save failed: ${e.message || e}`);
      }
    });
  }

  // "Save" -> enten ny eller oppdater (basert på om vi har currentTabId)
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        setStatus(currentTabId ? "Saving..." : "Saving new...");
        const title = (titleInput?.value || "Untitled").trim() || "Untitled";
        const saved = await saveTab(title);
        setStatus(`Saved id: ${saved.id}`);
      } catch (e) {
        setStatus(`Save failed: ${e.message || e}`);
      }
    });
  }

  // "Load" -> skriv inn ID og hent tab fra databasen
  if (loadBtn) {
    loadBtn.addEventListener("click", async () => {
      try {
        const id = (loadId?.value || "").trim();
        if (!id) return setStatus("Paste an id to load");

        setStatus("Loading...");
        const saved = await loadTabById(id);

        if (titleInput) titleInput.value = saved.title || "Untitled";
        renderTabData(saved.data);

        setStatus(`Loaded id: ${saved.id}`);
      } catch (e) {
        setStatus(`Load failed: ${e.message || e}`);
      }
    });
  }
});


// ============================
// DEL 9: Gjøre noen funksjoner tilgjengelig globalt
// ============================
// (Så andre scripts eller knapper kan bruke dem om du vil)

window.collectTabData = collectTabData;
window.renderTabData = renderTabData;
window.saveTab = saveTab;
window.saveNewTabToSupabase = saveNewTabToSupabase;
window.loadTabById = loadTabById;


// ============================
// DEL 10: Timeout helper (ikke brukt her, men kan brukes hvis man vil)
// ============================

function withTimeout(promise, ms = 8000, label = "request") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}
