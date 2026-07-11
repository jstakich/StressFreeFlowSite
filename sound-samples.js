(function () {
  var SAMPLE_SECONDS = 7;
  var SAMPLE_BASE = "/assets/sound-samples/";
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
    button.setAttribute(
      "aria-label",
      (playing ? "Stop" : "Play 7 second") + " " + label + " sample"
    );
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

  function beginPlayback(audio, button) {
    if (activeAudio !== audio || activeButton !== button) {
      return;
    }

    stopTimer = window.setTimeout(function () {
      stopActive();
    }, SAMPLE_SECONDS * 1000);

    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        if (activeAudio === audio) {
          stopActive();
        }
      });
    }
  }

  function startSample(button, slug) {
    stopActive();
    activeButton = button;
    setPlaying(button, true);

    var audio = new Audio(SAMPLE_BASE + slug + ".mp3");
    audio.preload = "auto";
    audio.volume = 1;
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
        if (activeAudio === audio) {
          stopActive();
        }
      },
      { once: true }
    );

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      beginPlayback(audio, button);
      return;
    }

    audio.addEventListener(
      "canplay",
      function () {
        beginPlayback(audio, button);
      },
      { once: true }
    );

    audio.load();
  }

  buttons.forEach(function (button) {
    var slug = button.getAttribute("data-sound-sample");
    if (!slug) {
      return;
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (activeButton === button && activeAudio && !activeAudio.paused) {
        stopActive();
        return;
      }

      startSample(button, slug);
    });
  });
})();
