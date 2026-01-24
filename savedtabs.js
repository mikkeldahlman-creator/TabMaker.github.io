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


function getSB() {
  if (!window.supabaseClient) throw new Error("supabaseClient not ready");
  return window.supabaseClient;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

async function listMyTabs() {
  const sb = getSB();

  // must be logged in
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  // RLS should already limit rows to user_id = auth.uid(),
  // but we can filter too
  const { data, error } = await sb
    .from("tabs")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function renderTabsList(tabs) {
  const list = document.getElementById("savedTabsList");
  const msg = document.getElementById("savedTabsMsg");
  if (!list) return;

  if (!tabs.length) {
    if (msg) msg.textContent = "No saved tabs yet.";
    list.innerHTML = "";
    return;
  }

  if (msg) msg.textContent = `Found ${tabs.length} tab(s).`;

  list.innerHTML = tabs.map(t => {
    const date = t.created_at ? new Date(t.created_at).toLocaleString() : "";
    return `
      <div class="border rounded p-3 d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">${esc(t.title || "Untitled")}</div>
          <div class="small text-muted">${esc(date)} • ${esc(t.id)}</div>
        </div>

        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-outline-dark" href="Createtab.html?tab=${encodeURIComponent(t.id)}">
            Open
          </a>
          <button class="btn btn-sm btn-outline-danger" data-del="${esc(t.id)}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join("");

  // hook delete buttons
  list.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!id) return;
      const ok = confirm("Delete this tab?");
      if (!ok) return;

      try {
        const sb = getSB();
        const { error } = await sb.from("tabs").delete().eq("id", id);
        if (error) throw error;
        btn.closest("div.border")?.remove();
      } catch (e) {
        alert("Delete failed: " + (e.message || e));
      }
    });
  });
}

async function initSavedTabs() {
  const msg = document.getElementById("savedTabsMsg");
  try {
    if (msg) msg.textContent = "Loading...";
    const tabs = await listMyTabs();
    renderTabsList(tabs);
  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Could not load tabs: " + (e.message || e);
  }
}

document.addEventListener("DOMContentLoaded", initSavedTabs);
