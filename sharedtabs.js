// sharedtabs.js — list tabs shared WITH the logged-in user

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

async function listSharedTabs() {
  const sb = getSB();

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  // expects: tab_shares(tab_id, shared_with, permission, created_at)
  // and FK tab_shares.tab_id -> tabs.id
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

function renderSharedTabs(items) {
  const list = document.getElementById("sharedTabsList");
  const msg = document.getElementById("sharedTabsMsg");
  if (!list) return;

  if (!items.length) {
    if (msg) msg.textContent = "No tabs have been shared with you yet.";
    list.innerHTML = "";
    return;
  }

  if (msg) msg.textContent = `Found ${items.length} shared tab(s).`;

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
          <a class="btn btn-sm btn-outline-dark"
             href="Createtab.html?tab=${encodeURIComponent(row.tab_id)}">
            Open
          </a>

          <button class="btn btn-sm btn-outline-danger" type="button" data-remove="${esc(row.id)}">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Remove = delete the share row (does NOT delete the tab)
  list.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const shareId = btn.getAttribute("data-remove");
      if (!shareId) return;

      if (!confirm("Remove this shared tab from your list?")) return;

      try {
        const sb = getSB();
        const { error } = await sb.from("tab_shares").delete().eq("id", shareId);
        if (error) throw error;
        btn.closest(".border")?.remove();
      } catch (e) {
        alert("Remove failed: " + (e.message || e));
      }
    });
  });
}

async function initSharedTabs() {
  const msg = document.getElementById("sharedTabsMsg");
  try {
    if (msg) msg.textContent = "Loading...";
    await waitForSupabaseClient();
    const items = await listSharedTabs();
    renderSharedTabs(items);
  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Could not load shared tabs: " + (e.message || e);
  }
}

document.addEventListener("DOMContentLoaded", initSharedTabs);