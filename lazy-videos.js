(function () {
  const lazyVideos = document.querySelectorAll("video[data-lazy-src]");

  if (!lazyVideos.length) {
    return;
  }

  function loadVideo(video) {
    const source = video.getAttribute("data-lazy-src");
    if (!source || video.getAttribute("src")) {
      return;
    }

    video.setAttribute("src", source);
    video.removeAttribute("data-lazy-src");

    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    video.load();

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function loadHeroVideo() {
    const heroVideo = document.querySelector("video.lazy-video-hero[data-lazy-src]");
    if (heroVideo) {
      loadVideo(heroVideo);
    }
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadVideo(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "240px 0px", threshold: 0.01 }
  );

  lazyVideos.forEach(function (video) {
    if (video.classList.contains("lazy-video-hero")) {
      return;
    }
    observer.observe(video);
  });

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadHeroVideo, { timeout: 1800 });
  } else {
    window.setTimeout(loadHeroVideo, 1200);
  }
})();
