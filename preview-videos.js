(function () {
  const videos = document.querySelectorAll(".preview-frame video, .screen-card video");

  function openVideoFullscreen(video) {
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
    video.classList.add("preview-tap-video");
    video.setAttribute("tabindex", "0");

    const label = video.getAttribute("aria-label") || "App preview video";
    video.setAttribute("aria-label", label + ". Tap to view fullscreen.");

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
  });
})();
