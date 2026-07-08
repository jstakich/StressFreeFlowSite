(function () {
  const bar = document.getElementById("sticky-cta");
  if (!bar) {
    return;
  }

  const hero = document.querySelector(".hero");
  const ctaPanel = document.querySelector(".cta-panel");
  const mobileLayout = window.matchMedia("(max-width: 1200px)");

  function getThreshold() {
    if (hero) {
      return Math.max(hero.offsetHeight - 120, 180);
    }

    return 180;
  }

  function update() {
    if (!mobileLayout.matches) {
      bar.classList.remove("is-visible");
      bar.hidden = true;
      bar.setAttribute("aria-hidden", "true");
      document.body.classList.remove("has-sticky-cta");
      return;
    }

    let show = window.scrollY > getThreshold();

    if (ctaPanel && show) {
      const rect = ctaPanel.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        show = false;
      }
    }

    bar.classList.toggle("is-visible", show);
    bar.hidden = !show;
    bar.setAttribute("aria-hidden", show ? "false" : "true");
    document.body.classList.toggle("has-sticky-cta", show);
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  if (mobileLayout.addEventListener) {
    mobileLayout.addEventListener("change", update);
  } else if (mobileLayout.addListener) {
    mobileLayout.addListener(update);
  }

  update();
})();
