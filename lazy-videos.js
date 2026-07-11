(function () {
  var lazyVideos = document.querySelectorAll("video[data-lazy-src]");

  if (!lazyVideos.length) {
    return;
  }

  var loadingCount = 0;
  var MAX_CONCURRENT = 3;
  var queue = [];

  function startPlayback(video) {
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
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
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");
    video.load();

    if (video.readyState >= 2) {
      video.classList.add("is-ready");
      delete video.dataset.loading;
      loadingCount = Math.max(0, loadingCount - 1);
      startPlayback(video);
      drainQueue();
      return;
    }

    video.addEventListener(
      "loadeddata",
      function () {
        video.classList.add("is-ready");
        delete video.dataset.loading;
        loadingCount = Math.max(0, loadingCount - 1);
        startPlayback(video);
        drainQueue();
      },
      { once: true }
    );
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
    queue.push(video);
    drainQueue();
  }

  if (!("IntersectionObserver" in window)) {
    lazyVideos.forEach(enqueue);
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
    { rootMargin: "700px 0px", threshold: 0.01 }
  );

  lazyVideos.forEach(function (video) {
    observer.observe(video);
  });
})();
