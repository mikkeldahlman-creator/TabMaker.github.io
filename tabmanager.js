function addtabg() {
  const measures = document.getElementById("measures");

  const wrapper = document.createElement("div");
  wrapper.className = "GitarTab";
  wrapper.innerHTML = `
    <img src="../Tab.jpg" class="GitarTabImg" alt="GitarTab">

    <div class="tab-overlay">
      <form class="tab-form" onsubmit="return false;">
        <div class="tab-grid">
          ${Array.from({ length: 24 }, () => `<input type="text" size="1" maxlength="2">`).join("")}
        </div>
      </form>
    </div>
  `;

  measures.appendChild(wrapper);

   if (autoScrollEnabled) {
    wrapper.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function removetabg() {
  const measures = document.getElementById("measures");
  if (!measures) return;

  // Only remove if there's more than one tab (keep the first forever)
  const tabs = measures.querySelectorAll(".GitarTab");
  if (tabs.length <= 1) return;

  // Remove the most recently added tab (the last one)
  tabs[tabs.length - 1].remove();
}

  

let autoScrollRunning = false;
let autoScrollSpeed = 120; // px per second
let rafId = null;
let lastTs = null;

// Change speed live
const speedInput = document.getElementById("autoScrollSpeed");
const speedLabel = document.getElementById("autoScrollSpeedLabel");
speedInput.addEventListener("input", () => {
  autoScrollSpeed = Number(speedInput.value);
  speedLabel.textContent = `${autoScrollSpeed} px/sec`;
});

// Start/Stop button
const toggleBtn = document.getElementById("autoScrollToggle");
toggleBtn.addEventListener("click", () => {
  autoScrollRunning ? stopAutoScroll() : startAutoScroll();
});

function startAutoScroll() {
  autoScrollRunning = true;
  toggleBtn.textContent = "⏸ Auto-scroll";
  lastTs = null;
  rafId = requestAnimationFrame(tickAutoScroll);
}

function stopAutoScroll() {
  autoScrollRunning = false;
  toggleBtn.textContent = "▶ Auto-scroll";
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  lastTs = null;
}

function tickAutoScroll(ts) {
  if (!autoScrollRunning) return;

  if (lastTs == null) lastTs = ts;
  const dt = (ts - lastTs) / 1000; // seconds
  lastTs = ts;

  const dy = autoScrollSpeed * dt;

  // Scroll the PAGE
  const before = window.scrollY;
  window.scrollTo(0, before + dy);

  // Stop automatically if we can't scroll further (bottom reached)
  const atBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 2);
  if (atBottom) {
    stopAutoScroll();
    return;
  }

  rafId = requestAnimationFrame(tickAutoScroll);
}

//Get the button
let mybutton = document.getElementById("btn-back-to-top");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function () {
scrollFunction();
};

function scrollFunction() {
if (
document.body.scrollTop > 20 ||
document.documentElement.scrollTop > 20
) {
mybutton.style.display = "block";
} else {
mybutton.style.display = "none";
}
}
// When the user clicks on the button, scroll to the top of the document
mybutton.addEventListener("click", backToTop);

function backToTop() {
document.body.scrollTop = 0;
document.documentElement.scrollTop = 0;
}

document.addEventListener("wheel", () => autoScrollRunning && stopAutoScroll(), { passive: true });
document.addEventListener("touchstart", () => autoScrollRunning && stopAutoScroll(), { passive: true });