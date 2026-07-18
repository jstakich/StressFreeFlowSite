(function () {
  var SAMPLE_SECONDS = 7;
  var SAMPLE_BASE = "/assets/sound-samples/";
  var SAMPLE_VERSION = "5";
  var buttons = document.querySelectorAll("[data-sound-sample]");

  if (!buttons.length) {
    return;
  }

  var audioCache = Object.create(null);
  var activeButton = null;
  var activeAudio = null;
  var stopTimer = null;
  var playToken = 0;

  function sampleUrl(slug) {
    return SAMPLE_BASE + slug + ".mp3?v=" + SAMPLE_VERSION;
  }

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

  function ensureAudio(slug) {
    var cached = audioCache[slug];
    if (cached) {
      return cached;
    }

    var audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    audio.src = sampleUrl(slug);
    audioCache[slug] = audio;
    return audio;
  }

  function clearStopTimer() {
    if (stopTimer) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
  }

  function stopActive() {
    clearStopTimer();
    playToken += 1;

    if (activeAudio) {
      try {
        activeAudio.pause();
      } catch (err) {
        // Ignore pause errors from interrupted loads.
      }
      try {
        activeAudio.currentTime = 0;
      } catch (err) {
        // Ignore if metadata is not ready yet.
      }
      activeAudio = null;
    }

    if (activeButton) {
      setPlaying(activeButton, false);
      activeButton = null;
    }
  }

  function armStopTimer(token) {
    clearStopTimer();
    stopTimer = window.setTimeout(function () {
      if (token === playToken) {
        stopActive();
      }
    }, SAMPLE_SECONDS * 1000);
  }

  function startSample(button, slug) {
    stopActive();

    var token = playToken;
    var audio = ensureAudio(slug);

    activeButton = button;
    activeAudio = audio;
    setPlaying(button, true);

    try {
      audio.currentTime = 0;
    } catch (err) {
      // Ignore until the media element has metadata.
    }

    var playPromise = audio.play();
    if (!playPromise || typeof playPromise.then !== "function") {
      armStopTimer(token);
      return;
    }

    playPromise
      .then(function () {
        if (token !== playToken || activeAudio !== audio) {
          return;
        }
        armStopTimer(token);
      })
      .catch(function (err) {
        if (token !== playToken || activeAudio !== audio) {
          return;
        }
        // Switching samples aborts the previous play(); ignore that.
        if (err && err.name === "AbortError") {
          return;
        }
        stopActive();
      });

    audio.addEventListener(
      "ended",
      function onEnded() {
        if (token === playToken && activeAudio === audio) {
          stopActive();
        }
      },
      { once: true }
    );
  }

  buttons.forEach(function (button) {
    var slug = button.getAttribute("data-sound-sample");
    if (!slug) {
      return;
    }

    function warm() {
      ensureAudio(slug);
    }

    button.addEventListener("pointerenter", warm);
    button.addEventListener("focus", warm);

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

  // Warm the free-tier samples once the section is near view.
  var section = document.getElementById("background-sounds");
  if (section && "IntersectionObserver" in window) {
    var warmed = false;
    var observer = new IntersectionObserver(
      function (entries) {
        if (warmed) {
          return;
        }
        var visible = entries.some(function (entry) {
          return entry.isIntersecting;
        });
        if (!visible) {
          return;
        }
        warmed = true;
        observer.disconnect();
        document
          .querySelectorAll(".sound-list-free [data-sound-sample]")
          .forEach(function (button) {
            var slug = button.getAttribute("data-sound-sample");
            if (slug) {
              ensureAudio(slug);
            }
          });
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(section);
  }
})();
