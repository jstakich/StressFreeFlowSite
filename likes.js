(function () {
  const LIKES_URL = "./data/likes.json";
  const STORAGE_KEY = "stressfreeflow-supported";
  const NOTIFY_EMAIL = "";

  const section = document.getElementById("supporters");
  const listEl = document.getElementById("supporter-names");
  const countEl = document.getElementById("supporter-count");
  const form = document.getElementById("supporter-form");
  const nameInput = document.getElementById("supporter-name");
  const statusEl = document.getElementById("supporter-status");
  const submitBtn = document.getElementById("supporter-submit");

  if (!section || !listEl || !form) {
    return;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cleanName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);
  }

  function renderSupporters(supporters) {
    if (!supporters.length) {
      listEl.innerHTML = '<p class="supporter-empty">Be the first to show your support.</p>';
      if (countEl) {
        countEl.textContent = "0 supporters so far";
      }
      return;
    }

    listEl.innerHTML = supporters
      .map(function (entry) {
        const name = escapeHtml(entry.name || "Supporter");
        return '<span class="supporter-chip">' + name + "</span>";
      })
      .join("");

    if (countEl) {
      countEl.textContent =
        supporters.length + " supporter" + (supporters.length === 1 ? "" : "s") + " so far";
    }
  }

  async function loadSupporters() {
    try {
      const response = await fetch(LIKES_URL + "?t=" + Date.now());
      if (!response.ok) {
        throw new Error("Could not load supporters");
      }
      const data = await response.json();
      const supporters = Array.isArray(data.supporters) ? data.supporters : [];
      renderSupporters(supporters);
    } catch (error) {
      listEl.innerHTML = '<p class="supporter-empty">Supporter names will appear here.</p>';
    }
  }

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  async function notifyByEmail(name) {
    if (!NOTIFY_EMAIL) {
      return true;
    }

    const body = new FormData();
    body.append("name", name);
    body.append("_subject", "New Stress Free Flow supporter: " + name);
    body.append("_template", "table");
    body.append("_captcha", "false");

    const response = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(NOTIFY_EMAIL), {
      method: "POST",
      body: body,
    });

    return response.ok;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = cleanName(nameInput.value);
    if (!name) {
      setStatus("Please enter your first name.", true);
      nameInput.focus();
      return;
    }

    if (localStorage.getItem(STORAGE_KEY)) {
      setStatus("You already sent your support from this browser. Thank you.", false);
      return;
    }

    submitBtn.disabled = true;
    setStatus("Sending your support…", false);

    try {
      await notifyByEmail(name);
      localStorage.setItem(STORAGE_KEY, name);
      setStatus(
        "Thank you, " +
          name +
          ". Your name will appear on the site after a quick review.",
        false
      );
      nameInput.value = "";
    } catch (error) {
      setStatus("Could not send right now. Please try again in a moment.", true);
      submitBtn.disabled = false;
    }
  });

  if (localStorage.getItem(STORAGE_KEY)) {
    setStatus("Thank you for supporting Stress Free Flow.", false);
    if (submitBtn) {
      submitBtn.disabled = true;
    }
  }

  loadSupporters();
})();
