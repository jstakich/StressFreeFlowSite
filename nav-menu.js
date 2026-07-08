(function () {
  const topbar = document.querySelector(".topbar");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  const explore = document.querySelector(".nav-explore");
  const exploreToggle = document.querySelector(".nav-explore-toggle");
  const explorePanel = document.getElementById("nav-explore-panel");

  if (!topbar || !toggle || !nav) {
    return;
  }

  function setOpen(open) {
    topbar.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

    if (!open) {
      setExploreOpen(false);
    }
  }

  function setExploreOpen(open) {
    if (!explore || !exploreToggle) {
      return;
    }

    explore.classList.toggle("is-open", open);
    exploreToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  toggle.addEventListener("click", () => {
    setOpen(!topbar.classList.contains("is-open"));
  });

  if (exploreToggle) {
    exploreToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setExploreOpen(!explore.classList.contains("is-open"));
    });
  }

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (explore && !explore.contains(event.target)) {
      setExploreOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setExploreOpen(false);
      setOpen(false);
    }
  });

  window.matchMedia("(min-width: 1201px)").addEventListener("change", (event) => {
    if (event.matches) {
      setOpen(false);
      setExploreOpen(false);
    }
  });
})();
