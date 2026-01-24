let currentTabId = null;

function getSB() {
  if (!window.supabaseClient) throw new Error("supabaseClient not ready (login.js not loaded?)");
  return window.supabaseClient;
}

function collectTabData() {
  const measuresEl = document.getElementById("measures");
  if (!measuresEl) throw new Error("#measures not found");

  const measureNodes = measuresEl.querySelectorAll(".GitarTab");

  const measures = Array.from(measureNodes).map(measure => {
    const inputs = Array.from(measure.querySelectorAll(".tab-grid input"));
    const rows = [];
    for (let r = 0; r < 6; r++) {
      rows.push(inputs.slice(r * 4, r * 4 + 4).map(i => (i.value || "").trim()));
    }
    return rows;
  });

  return { timeSignature: "4/4", measures };
}

function renderTabData(tabData) {
  const measuresEl = document.getElementById("measures");
  if (!measuresEl) throw new Error("#measures not found");

  measuresEl.innerHTML = "";

  const measures = tabData?.measures?.length
    ? tabData.measures
    : [Array.from({ length: 6 }, () => Array(4).fill(""))];

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

    const inputs = wrapper.querySelectorAll(".tab-grid input");
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        inputs[r * 4 + c].value = measureRows?.[r]?.[c] ?? "";
      }
    }

    measuresEl.appendChild(wrapper);
  }
}

async function saveNewTabToSupabase(title = "Untitled") {
  const sb = getSB();

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  const payload = collectTabData();

  const { data, error } = await sb
    .from("tabs")
    .insert([{ user_id: user.id, title, data: payload }])
    .select("id, title, data")
    .single();

  if (error) throw error;

  currentTabId = data.id;
  return data;
}

async function updateTabInSupabase(tabId, title = "Untitled") {
  const sb = getSB();
  const payload = collectTabData();

  const { data, error } = await sb
    .from("tabs")
    .update({ title, data: payload })   // ✅ removed updated_at
    .eq("id", tabId)
    .select("id, title, data")
    .single();

  if (error) throw error;
  return data;
}

async function saveTab(title = "Untitled") {
  if (!currentTabId) return await saveNewTabToSupabase(title);
  return await updateTabInSupabase(currentTabId, title);
}

async function loadTabById(tabId) {
  const sb = getSB();

  const { data, error } = await sb
    .from("tabs")
    .select("id, title, data")
    .eq("id", tabId)
    .single();

  if (error) throw error;

  currentTabId = data.id;
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("saveStatus");
  const titleInput = document.getElementById("tabTitle");

  const saveNewBtn = document.getElementById("saveNewBtn");
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const loadId = document.getElementById("loadId");

  function setStatus(msg) {
    if (status) status.textContent = msg;
  }

  if (saveNewBtn) {
    saveNewBtn.addEventListener("click", async () => {
      try {
        setStatus("Saving new...");
        const title = (titleInput?.value || "Untitled").trim() || "Untitled";
        const saved = await saveNewTabToSupabase(title);
        setStatus(`Saved new ✅ id: ${saved.id}`);
      } catch (e) {
        console.error(e);
        setStatus(`Save failed ❌ ${e.message || e}`);
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        setStatus(currentTabId ? "Saving..." : "Saving new...");
        const title = (titleInput?.value || "Untitled").trim() || "Untitled";
        const saved = await saveTab(title);
        setStatus(`Saved ✅ id: ${saved.id}`);
      } catch (e) {
        console.error(e);
        setStatus(`Save failed ❌ ${e.message || e}`);
      }
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", async () => {
      try {
        const id = (loadId?.value || "").trim();
        if (!id) return setStatus("Paste an id to load");
        setStatus("Loading...");
        const saved = await loadTabById(id);
        if (titleInput) titleInput.value = saved.title || "Untitled";
        renderTabData(saved.data);
        setStatus(`Loaded ✅ id: ${saved.id}`);
      } catch (e) {
        console.error(e);
        setStatus(`Load failed ❌ ${e.message || e}`);
      }
    });
  }
});

window.collectTabData = collectTabData;
window.renderTabData = renderTabData;
window.saveTab = saveTab;
window.saveNewTabToSupabase = saveNewTabToSupabase;
window.loadTabById = loadTabById;

function withTimeout(promise, ms = 8000, label = "request") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}