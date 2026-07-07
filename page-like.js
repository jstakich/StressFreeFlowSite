(function () {
  const STORAGE_KEY = "stressfreeflow-page-like";
  const options = window.SFF_LIKE_OPTIONS || { names: [], comments: [] };

  const form = document.getElementById("page-like-form");
  const nameSelect = document.getElementById("page-like-name");
  const commentSelect = document.getElementById("page-like-comment");
  const statusEl = document.getElementById("page-like-status");
  const resultEl = document.getElementById("page-like-result");
  const submitBtn = document.getElementById("page-like-submit");

  if (!form || !nameSelect || !commentSelect) {
    return;
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

  function showThanks(name, comment) {
    if (resultEl) {
      resultEl.hidden = false;
      resultEl.innerHTML =
        '<p class="page-like-thanks">Thanks, <strong>' +
        escapeHtml(name) +
        "</strong>.</p>" +
        '<p class="page-like-note">“' +
        escapeHtml(comment) +
        "”</p>";
    }

    if (statusEl) {
      statusEl.textContent = "You liked this page. Thank you.";
    }

    form.hidden = true;
  }

  fillSelect(nameSelect, options.names, "Choose your first name");
  fillSelect(commentSelect, options.comments, "Choose a comment");

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data && data.name && data.comment) {
        showThanks(data.name, data.comment);
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = nameSelect.value.trim();
    const comment = commentSelect.value.trim();

    if (!name || !comment) {
      if (statusEl) {
        statusEl.textContent = "Pick a name and a comment, then tap Like.";
      }
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        name: name,
        comment: comment,
      })
    );

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    showThanks(name, comment);
  });
})();
