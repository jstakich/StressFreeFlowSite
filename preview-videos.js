(function () {
  const videos = document.querySelectorAll(
    ".preview-frame video, .screen-card video, .iphone-mockup-video"
  );

  function enableSound(video) {
    video.removeAttribute("muted");
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    video.controls = true;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function restoreMutedPreview(video) {
    video.muted = true;
    video.controls = false;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function isVideoFullscreen(video) {
    const doc = document;
    return (
      doc.fullscreenElement === video ||
      doc.webkitFullscreenElement === video ||
      video.webkitDisplayingFullscreen === true
    );
  }

  function openVideoFullscreen(video) {
    enableSound(video);

    if (typeof video.webkitEnterFullscreen === "function") {
      video.webkitEnterFullscreen();
      return;
    }

    const requestFullscreen =
      video.requestFullscreen ||
      video.webkitRequestFullscreen ||
      video.msRequestFullscreen;

    if (requestFullscreen) {
      requestFullscreen.call(video).catch(function () {});
    }
  }

  videos.forEach(function (video) {
    if (video.readyState >= 2) {
      video.classList.add("is-ready");
    }

    video.addEventListener(
      "loadeddata",
      function () {
        video.classList.add("is-ready");
      },
      { once: true }
    );

    video.classList.add("preview-tap-video");
    video.setAttribute("tabindex", "0");

    const label = video.getAttribute("aria-label") || "App preview video";
    video.setAttribute("aria-label", label + ". Tap to view fullscreen with sound.");

    function activate(event) {
      event.preventDefault();
      openVideoFullscreen(video);
    }

    video.addEventListener("click", activate);
    video.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        activate(event);
      }
    });

    video.addEventListener("webkitendfullscreen", function () {
      restoreMutedPreview(video);
    });
  });

  function handleFullscreenChange() {
    videos.forEach(function (video) {
      if (!isVideoFullscreen(video)) {
        restoreMutedPreview(video);
      }
    });
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
})();
