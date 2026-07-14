(function () {
  const topbar = document.querySelector(".topbar");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));

  if (!topbar || !toggle || !nav) {
    return;
  }

  function setDropdownOpen(dropdown, open) {
    const button = dropdown.querySelector(".nav-dropdown-toggle");
    if (!button) {
      return;
    }

    dropdown.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeAllDropdowns(except) {
    dropdowns.forEach((dropdown) => {
      if (dropdown !== except) {
        setDropdownOpen(dropdown, false);
      }
    });
  }

  function setOpen(open) {
    topbar.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

    if (!open) {
      closeAllDropdowns();
    }
  }

  toggle.addEventListener("click", () => {
    setOpen(!topbar.classList.contains("is-open"));
  });

  dropdowns.forEach((dropdown) => {
    const button = dropdown.querySelector(".nav-dropdown-toggle");
    if (!button) {
      return;
    }

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextOpen = !dropdown.classList.contains("is-open");
      closeAllDropdowns(dropdown);
      setDropdownOpen(dropdown, nextOpen);
    });
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(event.target)) {
        setDropdownOpen(dropdown, false);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllDropdowns();
      setOpen(false);
    }
  });

  window.matchMedia("(min-width: 1201px)").addEventListener("change", (event) => {
    if (event.matches) {
      setOpen(false);
      closeAllDropdowns();
    }
  });
})();
