(function () {
  const bar = document.getElementById("sticky-cta");
  if (!bar) {
    return;
  }

  const hero = document.querySelector(".hero");
  const mobileLayout = window.matchMedia("(max-width: 1200px)");
  let threshold = 180;
  let ticking = false;

  function measureThreshold() {
    if (!hero) {
      threshold = 180;
      return;
    }

    threshold = Math.max(hero.offsetHeight - 120, 180);
  }

  function applyState(show) {
    bar.classList.toggle("is-visible", show);
    bar.hidden = !show;
    bar.setAttribute("aria-hidden", show ? "false" : "true");
    document.body.classList.toggle("has-sticky-cta", show);
  }

  function update() {
    ticking = false;

    if (!mobileLayout.matches) {
      applyState(false);
      return;
    }

    applyState(window.scrollY > threshold);
  }

  function scheduleUpdate() {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(update);
  }

  function handleResize() {
    measureThreshold();
    update();
  }

  if (mobileLayout.addEventListener) {
    mobileLayout.addEventListener("change", handleResize);
  } else if (mobileLayout.addListener) {
    mobileLayout.addListener(handleResize);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", handleResize);

  measureThreshold();
  update();
})();
