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

  function loadAllVideos() {
    lazyVideos.forEach(function (video) {
      loadVideo(video);
    });
  }

  if (!("IntersectionObserver" in window)) {
    loadAllVideos();
    return;
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
    observer.observe(video);
  });
})();
