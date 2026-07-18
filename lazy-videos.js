(function () {
  var lazyVideos = document.querySelectorAll("video[data-lazy-src]");

  if (!lazyVideos.length) {
    return;
  }

  var loadingCount = 0;
  var MAX_CONCURRENT = 2;
  var queue = [];

  function startPlayback(video) {
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function finishLoading(video) {
    delete video.dataset.loading;
    loadingCount = Math.max(0, loadingCount - 1);
    drainQueue();
  }

  function loadVideo(video) {
    var source = video.getAttribute("data-lazy-src");
    if (!source || video.getAttribute("src") || video.dataset.loading === "true") {
      return;
    }

    video.dataset.loading = "true";
    video.setAttribute("src", source);
    video.removeAttribute("data-lazy-src");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("muted", "");
    video.muted = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");

    video.addEventListener(
      "error",
      function () {
        // Keep the poster frame visible if the video cannot decode.
        video.removeAttribute("src");
        video.load();
        finishLoading(video);
      },
      { once: true }
    );

    video.addEventListener(
      "loadeddata",
      function () {
        video.classList.add("is-ready");
        finishLoading(video);
        startPlayback(video);
      },
      { once: true }
    );

    video.load();

    if (video.readyState >= 2) {
      video.classList.add("is-ready");
      finishLoading(video);
      startPlayback(video);
    }
  }

  function drainQueue() {
    while (loadingCount < MAX_CONCURRENT && queue.length) {
      loadingCount += 1;
      loadVideo(queue.shift());
    }
  }

  function enqueue(video) {
    if (video.getAttribute("src") || video.dataset.loading === "true") {
      return;
    }
    if (queue.indexOf(video) !== -1) {
      return;
    }
    // Hero first so below-fold videos do not steal bandwidth.
    if (video.classList.contains("lazy-video-hero")) {
      queue.unshift(video);
    } else {
      queue.push(video);
    }
    drainQueue();
  }

  var hero = document.querySelector("video.lazy-video-hero[data-lazy-src]");
  var others = [];
  lazyVideos.forEach(function (video) {
    if (video !== hero) {
      others.push(video);
    }
  });

  // Let the first paint (poster + text) happen, then start the hero video.
  function startHero() {
    if (hero) {
      enqueue(hero);
    }
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(startHero, { timeout: 900 });
  } else {
    window.setTimeout(startHero, 200);
  }

  if (!("IntersectionObserver" in window)) {
    others.forEach(enqueue);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          enqueue(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "400px 0px", threshold: 0.01 }
  );

  others.forEach(function (video) {
    observer.observe(video);
  });
})();
