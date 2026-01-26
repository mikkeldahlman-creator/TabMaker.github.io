// savedtabs.js — Saved Tabs with Open / Share / Delete

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
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

// ---------- LOAD MY TABS ----------
async function listMyTabs() {
  const sb = getSB();

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  const { data, error } = await sb
    .from("tabs")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ---------- RENDER ----------
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
          <a class="btn btn-sm btn-outline-dark"
             href="./Createtab.html?tab=${encodeURIComponent(t.id)}">
            Open
          </a>

          <button class="btn btn-sm btn-outline-primary"
                  type="button"
                  data-share="${esc(t.id)}">
            Share
          </button>

          <button class="btn btn-sm btn-outline-danger"
                  type="button"
                  data-del="${esc(t.id)}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join("");

  hookDeleteButtons();
  hookShareButtons();
}

// ---------- DELETE ----------
function hookDeleteButtons() {
  document.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      if (!id) return;

      if (!confirm("Delete this tab?")) return;

      try {
        const sb = getSB();
        const { error } = await sb.from("tabs").delete().eq("id", id);
        if (error) throw error;
        btn.closest(".border")?.remove();
      } catch (e) {
        alert("Delete failed: " + (e.message || e));
      }
    });
  });
}

// ---------- SHARE ----------
function hookShareButtons() {
  document.querySelectorAll("[data-share]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tabId = btn.dataset.share;
      if (!tabId) return;

      const username = prompt("Share with username:");
      if (!username) return;

      const perm = (prompt("Permission: read or write", "read") || "")
        .trim()
        .toLowerCase();

      if (!["read", "write"].includes(perm)) {
        alert("Permission must be 'read' or 'write'");
        return;
      }

      try {
        const sb = getSB();

        // find user
        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("id")
          .eq("username", username)
          .single();

        if (profErr) throw profErr;

        // create share
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

// ---------- INIT ----------
async function initSavedTabs() {
  const msg = document.getElementById("savedTabsMsg");
  try {
    if (msg) msg.textContent = "Loading...";
    await waitForSupabaseClient();
    const tabs = await listMyTabs();
    renderTabsList(tabs);
  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Could not load tabs: " + (e.message || e);
  }
}

document.addEventListener("DOMContentLoaded", initSavedTabs);
