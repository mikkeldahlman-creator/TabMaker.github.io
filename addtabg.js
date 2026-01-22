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
}
