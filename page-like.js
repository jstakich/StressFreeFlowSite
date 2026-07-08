(function () {
  const STORAGE_KEY = "stressfreeflow-page-like";
  const options = window.SFF_LIKE_OPTIONS || { names: [], comments: [] };
  const config = window.SFF_LIKES_CONFIG || {};

  const form = document.getElementById("page-like-form");
  const nameSelect = document.getElementById("page-like-name");
  const commentSelect = document.getElementById("page-like-comment");
  const statusEl = document.getElementById("page-like-status");
  const submitBtn = document.getElementById("page-like-submit");
  const feedEl = document.getElementById("page-like-feed");
  const countEl = document.getElementById("page-like-count");

  if (!form || !nameSelect || !commentSelect || !feedEl) {
    return;
  }

  const nameSet = new Set(options.names.map(function (name) {
    return name.toLowerCase();
  }));
  const commentSet = new Set(options.comments.map(function (comment) {
    return comment.toLowerCase();
  }));

  function getSupabaseConfig() {
    const url = String(config.supabaseUrl || "").trim().replace(/\/+$/, "");
    const key = String(config.supabaseAnonKey || "").trim();
    return { url: url, key: key };
  }

  function isConfigured() {
    const settings = getSupabaseConfig();
    return Boolean(settings.url && settings.key);
  }

  function fillSelect(select, items, placeholder) {
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    first.disabled = true;
    first.selected = true;
    select.appendChild(first);

    items.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function formatWhen(value) {
    if (!value) {
      return "";
    }

    try {
      return new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "";
    }
  }

  function renderFeed(entries) {
    if (!entries.length) {
      feedEl.innerHTML = '<p class="page-like-feed-empty">No comments yet. Be the first to like this page.</p>';
      if (countEl) {
        countEl.textContent = "0 comments so far";
      }
      return;
    }

    feedEl.innerHTML = entries
      .map(function (entry) {
        const when = formatWhen(entry.created_at);
        return (
          '<article class="page-like-entry">' +
          '<p class="page-like-entry-name">' +
          escapeHtml(entry.name) +
          "</p>" +
          '<p class="page-like-entry-comment">“' +
          escapeHtml(entry.comment) +
          "”</p>" +
          (when ? '<p class="page-like-entry-when">' + escapeHtml(when) + "</p>" : "") +
          "</article>"
        );
      })
      .join("");

    if (countEl) {
      countEl.textContent =
        entries.length + " comment" + (entries.length === 1 ? "" : "s") + " from supporters";
    }
  }

  async function supabaseRequest(path, init) {
    const settings = getSupabaseConfig();
    const headers = Object.assign(
      {
        apikey: settings.key,
        Authorization: "Bearer " + settings.key,
      },
      init && init.headers ? init.headers : {}
    );

    const response = await fetch(settings.url + path, Object.assign({}, init, { headers: headers }));
    if (!response.ok) {
      throw new Error("Could not reach comments service");
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function loadFeed() {
    if (!isConfigured()) {
      feedEl.innerHTML =
        '<p class="page-like-feed-empty">Shared comments will appear here once the free database is connected.</p>';
      if (countEl) {
        countEl.textContent = "Waiting for setup";
      }
      return;
    }

    feedEl.innerHTML = '<p class="page-like-feed-empty">Loading comments…</p>';

    try {
      const entries = await supabaseRequest(
        "/rest/v1/page_likes?select=name,comment,created_at&order=created_at.desc&limit=500"
      );
      renderFeed(Array.isArray(entries) ? entries : []);
    } catch (error) {
      feedEl.innerHTML =
        '<p class="page-like-feed-empty">Could not load comments right now. Please try again in a moment.</p>';
      if (countEl) {
        countEl.textContent = "Comments unavailable";
      }
    }
  }

  function disableForm() {
    if (submitBtn) {
      submitBtn.disabled = true;
    }
  }

  function restoreSavedLike() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const data = JSON.parse(saved);
      if (data && data.name && data.comment) {
        disableForm();
        setStatus("You already liked this page from this browser. Thank you.", false);
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  fillSelect(nameSelect, options.names, "Choose your first name");
  fillSelect(commentSelect, options.comments, "Choose a comment");
  restoreSavedLike();
  loadFeed();

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = nameSelect.value.trim();
    const comment = commentSelect.value.trim();

    if (!name || !comment) {
      setStatus("Pick a name and a comment, then tap Like.", true);
      return;
    }

    if (!nameSet.has(name.toLowerCase()) || !commentSet.has(comment.toLowerCase())) {
      setStatus("Please choose a name and comment from the lists.", true);
      return;
    }

    if (localStorage.getItem(STORAGE_KEY)) {
      setStatus("You already liked this page from this browser. Thank you.", false);
      return;
    }

    if (!isConfigured()) {
      setStatus("Shared comments are not connected yet.", true);
      return;
    }

    disableForm();
    setStatus("Saving your comment…", false);

    try {
      await supabaseRequest("/rest/v1/page_likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name: name,
          comment: comment,
        }),
      });

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: name,
          comment: comment,
        })
      );

      setStatus("Thank you, " + name + ". Your comment is on the page.", false);
      await loadFeed();
      feedEl.scrollTop = 0;
    } catch (error) {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
      setStatus("Could not save your comment. Please try again.", true);
    }
  });
})();
