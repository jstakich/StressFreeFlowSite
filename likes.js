(function () {
  const LIKES_URL = "./data/likes.json";
  const STORAGE_KEY = "stressfreeflow-supported";
  const config = window.SFF_SUPPORTERS_CONFIG || {};

  const section = document.getElementById("supporters");
  const listEl = document.getElementById("supporter-names");
  const countEl = document.getElementById("supporter-count");
  const form = document.getElementById("supporter-form");
  const nameInput = document.getElementById("supporter-name");
  const statusEl = document.getElementById("supporter-status");
  const submitBtn = document.getElementById("supporter-submit");

  let supporters = [];

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

  async function loadSupportersFromJson() {
    const response = await fetch(LIKES_URL + "?t=" + Date.now());
    if (!response.ok) {
      throw new Error("Could not load supporters");
    }
    const data = await response.json();
    return dedupeSupporters(Array.isArray(data.supporters) ? data.supporters : []);
  }

  async function loadSupporters() {
    try {
      let loaded = [];

      if (config.apiUrl) {
        try {
          const response = await fetch(config.apiUrl, { method: "GET" });
          if (response.ok) {
            const data = await response.json();
            loaded = dedupeSupporters(data.supporters || []);
          }
        } catch (apiError) {
          // Fall back to the JSON file on GitHub Pages.
        }
      }

      if (!loaded.length) {
        loaded = await loadSupportersFromJson();
      }

      const savedName = localStorage.getItem(STORAGE_KEY);
      if (savedName) {
        loaded = dedupeSupporters(loaded.concat([{ name: savedName }]));
      }

      renderSupporters(loaded);
    } catch (error) {
      listEl.innerHTML = '<p class="supporter-empty">Supporter names will appear here.</p>';
    }
  }

  async function saveSupporter(name) {
    if (!config.apiUrl) {
      throw new Error("Supporter API is not configured");
    }

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        secret: config.submitSecret || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Could not save supporter");
    }

    const data = await response.json();
    return dedupeSupporters(data.supporters || []);
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
    setStatus("Adding your name…", false);

    const alreadyListed = supporters.some(function (entry) {
      return entry.name.toLowerCase() === name.toLowerCase();
    });

    if (!alreadyListed) {
      renderSupporters(supporters.concat([{ name: name }]));
    }

    try {
      const updated = await saveSupporter(name);
      renderSupporters(updated);
      localStorage.setItem(STORAGE_KEY, name);
      setStatus("Thank you, " + name + ". Your name is now on the page.", false);
      nameInput.value = "";
    } catch (error) {
      localStorage.setItem(STORAGE_KEY, name);
      setStatus("Thank you, " + name + ". Your name is now on the page.", false);
      nameInput.value = "";
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
