(function () {
  var SAMPLE_SECONDS = 7;
  var buttons = document.querySelectorAll("[data-sound-sample]");
  if (!buttons.length) {
    return;
  }

  var activeButton = null;
  var activeAudio = null;
  var stopTimer = null;

  function setPlaying(button, playing) {
    button.classList.toggle("is-playing", playing);
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    var label = button.getAttribute("data-sound-label") || "sound";
    button.textContent = playing ? "■ Stop" : "▶ Sample";
    button.setAttribute("aria-label", (playing ? "Stop" : "Play 7 second") + " " + label + " sample");
  }

  function stopActive() {
    if (stopTimer) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.removeAttribute("src");
      activeAudio.load();
      activeAudio = null;
    }
    if (activeButton) {
      setPlaying(activeButton, false);
      activeButton = null;
    }
  }

  buttons.forEach(function (button) {
    var slug = button.getAttribute("data-sound-sample");
    if (!slug) {
      return;
    }

    button.addEventListener("click", function () {
      if (activeButton === button && activeAudio && !activeAudio.paused) {
        stopActive();
        return;
      }

      stopActive();
      activeButton = button;
      setPlaying(button, true);

      var audio = new Audio("./assets/sound-samples/" + slug + ".mp3");
      audio.preload = "none";
      activeAudio = audio;

      audio.addEventListener(
        "ended",
        function () {
          stopActive();
        },
        { once: true }
      );

      audio.addEventListener(
        "error",
        function () {
          stopActive();
        },
        { once: true }
      );

      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          stopActive();
        });
      }

      stopTimer = window.setTimeout(function () {
        stopActive();
      }, SAMPLE_SECONDS * 1000);
    });
  });
})();
