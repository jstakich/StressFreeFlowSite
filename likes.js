(function () {
  const LIKES_URL = "./data/likes.json";
  const STORAGE_KEY = "stressfreeflow-supported";

  const listEl = document.getElementById("supporter-names");
  const countEl = document.getElementById("supporter-count");
  const form = document.getElementById("supporter-form");
  const nameInput = document.getElementById("supporter-name");
  const statusEl = document.getElementById("supporter-status");
  const submitBtn = document.getElementById("supporter-submit");

  let supporters = [];

  if (!listEl || !form) {
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

  function dedupeSupporters(entries) {
    const seen = new Set();
    const result = [];

    entries.forEach(function (entry) {
      const name = cleanName(entry && entry.name ? entry.name : "");
      if (!name) {
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      result.push({ name: name });
    });

    return result;
  }

  function renderSupporters(entries) {
    supporters = dedupeSupporters(entries);

    if (!supporters.length) {
      listEl.innerHTML = '<p class="supporter-empty">Be the first to show your support.</p>';
      if (countEl) {
        countEl.textContent = "0 supporters so far";
      }
      return;
    }

    listEl.innerHTML = supporters
      .map(function (entry) {
        return '<span class="supporter-chip">' + escapeHtml(entry.name) + "</span>";
      })
      .join("");

    if (countEl) {
      countEl.textContent =
        supporters.length + " supporter" + (supporters.length === 1 ? "" : "s") + " so far";
    }
  }

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  async function loadSupporters() {
    try {
      const response = await fetch(LIKES_URL + "?t=" + Date.now());
      if (!response.ok) {
        throw new Error("Could not load supporters");
      }

      const data = await response.json();
      let loaded = dedupeSupporters(Array.isArray(data.supporters) ? data.supporters : []);

      const savedName = localStorage.getItem(STORAGE_KEY);
      if (savedName) {
        loaded = dedupeSupporters(loaded.concat([{ name: savedName }]));
      }

      renderSupporters(loaded);
    } catch (error) {
      listEl.innerHTML = '<p class="supporter-empty">Supporter names will appear here.</p>';
    }
  }

  form.addEventListener("submit", function (event) {
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

    localStorage.setItem(STORAGE_KEY, name);
    renderSupporters(supporters.concat([{ name: name }]));
    setStatus("Thank you, " + name + ". Your name is on the page.", false);
    nameInput.value = "";

    if (submitBtn) {
      submitBtn.disabled = true;
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
