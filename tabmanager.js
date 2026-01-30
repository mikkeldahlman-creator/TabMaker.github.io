// Denne filen handler om:
// 1) Legge til og fjerne tab-rader (taktene)
// 2) Auto-scroll slik at man kan spille mens siden ruller
// 3) "Back to top"-knapp for bedre brukervennlighet


// ============================
// DEL 1: Legge til en ny tab / takt
// ============================

function addtabg() {
  const measures = document.getElementById("measures");

  // Lager en ny "GitarTab" (én takt)
  const wrapper = document.createElement("div");
  wrapper.className = "GitarTab";

  // HTML-en for én tab:
  // - bilde av gitar-tab
  // - overlay med 24 input-felt (6 strenger x 4 slag)
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

  // Legger den nye tabben nederst på siden
  measures.appendChild(wrapper);

  // Hvis auto-scroll er på, scroller siden automatisk ned til den nye tabben
  if (autoScrollEnabled) {
    wrapper.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


// ============================
// DEL 2: Fjerne en tab / takt
// ============================

function removetabg() {
  const measures = document.getElementById("measures");
  if (!measures) return;

  // Henter alle tabs som finnes
  const tabs = measures.querySelectorAll(".GitarTab");

  // Vi tillater ikke å fjerne den aller første tabben
  // (så brukeren alltid har minst én)
  if (tabs.length <= 1) return;

  // Fjerner den siste tabben brukeren la til
  tabs[tabs.length - 1].remove();
}


// ============================
// DEL 3: Variabler for auto-scroll
// ============================

// Om auto-scroll er på eller av
let autoScrollRunning = false;

// Hvor fort siden scroller (piksler per sekund)
let autoScrollSpeed = 120;

// Brukes for å styre animasjonen
let rafId = null;
let lastTs = null;


// ============================
// DEL 4: Endre scroll-hastighet mens siden kjører
// ============================

const speedInput = document.getElementById("autoScrollSpeed");
const speedLabel = document.getElementById("autoScrollSpeedLabel");

// Når brukeren drar i slideren, endres farten med én gang
speedInput.addEventListener("input", () => {
  autoScrollSpeed = Number(speedInput.value);
  speedLabel.textContent = `${autoScrollSpeed} px/sec`;
});


// ============================
// DEL 5: Start / stopp auto-scroll
// ============================

const toggleBtn = document.getElementById("autoScrollToggle");

toggleBtn.addEventListener("click", () => {
  autoScrollRunning ? stopAutoScroll() : startAutoScroll();
});

function startAutoScroll() {
  autoScrollRunning = true;
  toggleBtn.textContent = "⏸ Auto-scroll";

  // Nullstiller tid slik at scrollingen starter riktig
  lastTs = null;

  // Starter animasjonen
  rafId = requestAnimationFrame(tickAutoScroll);
}

function stopAutoScroll() {
  autoScrollRunning = false;
  toggleBtn.textContent = "▶ Auto-scroll";

  // Stopper animasjonen
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  lastTs = null;
}


// ============================
// DEL 6: Selve auto-scroll-logikken
// ============================

function tickAutoScroll(ts) {
  if (!autoScrollRunning) return;

  // ts = timestamp fra browseren
  if (lastTs == null) lastTs = ts;

  // Hvor lang tid som har gått siden forrige frame
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  // Hvor langt vi skal scrolle denne runden
  const dy = autoScrollSpeed * dt;

  // Scroller hele siden litt ned
  const before = window.scrollY;
  window.scrollTo(0, before + dy);

  // Hvis vi er nederst på siden, stopper auto-scroll automatisk
  const atBottom =
    (window.innerHeight + window.scrollY) >=
    (document.documentElement.scrollHeight - 2);

  if (atBottom) {
    stopAutoScroll();
    return;
  }

  // Fortsetter animasjonen
  rafId = requestAnimationFrame(tickAutoScroll);
}


// ============================
// DEL 7: "Back to top"-knapp
// ============================

let mybutton = document.getElementById("btn-back-to-top");

// Når brukeren scroller litt ned, vises knappen
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

// Når man klikker på knappen, scroller siden helt opp
mybutton.addEventListener("click", backToTop);

function backToTop() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}


// ============================
// DEL 8: Stoppe auto-scroll hvis brukeren scroller selv
// ============================

// Hvis brukeren bruker mus eller touch, stopper auto-scroll
document.addEventListener("wheel", () => autoScrollRunning && stopAutoScroll(), { passive: true });
document.addEventListener("touchstart", () => autoScrollRunning && stopAutoScroll(), { passive: true });
