(function () {
  var SAMPLE_SECONDS = 7;
  var SAMPLE_BASE = "/assets/sound-samples/";
  var SAMPLE_VERSION = "7";
  var buttons = document.querySelectorAll("[data-sound-sample]");

  if (!buttons.length) {
    return;
  }

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var canWebAudio = typeof AudioCtx === "function";

  var player = new Audio();
  player.preload = "auto";
  player.volume = 1;

  var audioContext = null;
  var bufferCache = Object.create(null);
  var rawCache = Object.create(null);
  var bufferLoading = Object.create(null);
  var activeButton = null;
  var activeSlug = null;
  var activeSource = null;
  var stopTimer = null;
  var playToken = 0;

  function sampleUrl(slug) {
    return SAMPLE_BASE + slug + ".mp3?v=" + SAMPLE_VERSION;
  }

  function setPlaying(button, playing) {
    button.classList.toggle("is-playing", playing);
    button.classList.toggle("is-loading", false);
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    var label = button.getAttribute("data-sound-label") || "sound";
    button.textContent = playing ? "■ Stop" : "▶ Sample";
    button.setAttribute(
      "aria-label",
      (playing ? "Stop" : "Play 7 second") + " " + label + " sample"
    );
  }

  function clearStopTimer() {
    if (stopTimer) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
  }

  function getAudioContext() {
    if (!canWebAudio) {
      return null;
    }
    if (!audioContext) {
      audioContext = new AudioCtx();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function stopActive() {
    clearStopTimer();
    playToken += 1;

    if (activeSource) {
      try {
        activeSource.onended = null;
        activeSource.stop(0);
      } catch (err) {
        // Already stopped.
      }
      try {
        activeSource.disconnect();
      } catch (err) {
        // Already disconnected.
      }
      activeSource = null;
    }

    try {
      player.pause();
    } catch (err) {
      // Ignore.
    }

    if (activeButton) {
      setPlaying(activeButton, false);
      activeButton = null;
    }
    activeSlug = null;
  }

  function armStopTimer(token) {
    clearStopTimer();
    stopTimer = window.setTimeout(function () {
      if (token === playToken) {
        stopActive();
      }
    }, SAMPLE_SECONDS * 1000);
  }

  function fetchRaw(slug, attempt) {
    attempt = attempt || 0;
    if (rawCache[slug] || bufferCache[slug]) {
      return Promise.resolve(rawCache[slug] || null);
    }
    if (bufferLoading[slug] && attempt === 0) {
      return bufferLoading[slug];
    }

    var request = fetch(sampleUrl(slug), { credentials: "same-origin", cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load sample");
        }
        return response.arrayBuffer();
      })
      .then(function (data) {
        rawCache[slug] = data;
        delete bufferLoading[slug];
        return data;
      })
      .catch(function (err) {
        delete bufferLoading[slug];
        if (attempt < 2) {
          return new Promise(function (resolve, reject) {
            window.setTimeout(function () {
              fetchRaw(slug, attempt + 1).then(resolve, reject);
            }, 200 * (attempt + 1));
          });
        }
        throw err;
      });

    if (attempt === 0) {
      bufferLoading[slug] = request;
    }
    return request;
  }

  function decodeBuffer(slug) {
    if (bufferCache[slug]) {
      return Promise.resolve(bufferCache[slug]);
    }

    var context = getAudioContext();
    if (!context) {
      return Promise.reject(new Error("No Web Audio"));
    }

    return fetchRaw(slug).then(function (data) {
      if (bufferCache[slug]) {
        return bufferCache[slug];
      }
      if (!data) {
        throw new Error("Missing sample data");
      }
      return context.decodeAudioData(data.slice(0)).then(function (buffer) {
        bufferCache[slug] = buffer;
        return buffer;
      });
    });
  }

  function playBuffer(button, slug, buffer, token) {
    if (token !== playToken || activeButton !== button) {
      return;
    }

    var context = getAudioContext();
    if (!context) {
      playHtml(button, slug, token);
      return;
    }

    try {
      player.pause();
    } catch (err) {
      // Ignore.
    }

    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    activeSource = source;
    activeSlug = slug;

    source.onended = function () {
      if (token === playToken && activeSource === source) {
        stopActive();
      }
    };

    source.start(0);
    setPlaying(button, true);
    armStopTimer(token);
  }

  function playHtml(button, slug, token) {
    if (token !== playToken || activeButton !== button) {
      return;
    }

    activeSlug = slug;
    player.src = sampleUrl(slug);

    try {
      player.currentTime = 0;
    } catch (err) {
      // Ignore.
    }

    var playPromise = player.play();
    if (!playPromise || typeof playPromise.then !== "function") {
      setPlaying(button, true);
      armStopTimer(token);
      return;
    }

    playPromise
      .then(function () {
        if (token !== playToken || activeButton !== button) {
          return;
        }
        setPlaying(button, true);
        armStopTimer(token);
      })
      .catch(function (err) {
        if (token !== playToken || activeButton !== button) {
          return;
        }
        if (err && err.name === "AbortError") {
          return;
        }
        stopActive();
      });
  }

  function startSample(button, slug) {
    stopActive();

    var token = playToken;
    activeButton = button;
    activeSlug = slug;
    setPlaying(button, true);

    getAudioContext();

    if (bufferCache[slug]) {
      playBuffer(button, slug, bufferCache[slug], token);
      return;
    }

    if (rawCache[slug]) {
      decodeBuffer(slug).then(
        function (buffer) {
          playBuffer(button, slug, buffer, token);
        },
        function () {
          playHtml(button, slug, token);
        }
      );
      return;
    }

    playHtml(button, slug, token);
    fetchRaw(slug)
      .then(function () {
        return decodeBuffer(slug);
      })
      .catch(function () {});
  }

  var warmQueue = [];
  var warmActive = 0;
  var WARM_CONCURRENCY = 6;

  function drainWarmQueue() {
    while (warmActive < WARM_CONCURRENCY && warmQueue.length) {
      var slug = warmQueue.shift();
      warmActive += 1;
      fetchRaw(slug).then(
        function () {
          warmActive = Math.max(0, warmActive - 1);
          drainWarmQueue();
        },
        function () {
          warmActive = Math.max(0, warmActive - 1);
          drainWarmQueue();
        }
      );
    }
  }

  function enqueueWarm(slug) {
    if (!slug || rawCache[slug] || bufferCache[slug] || bufferLoading[slug]) {
      return;
    }
    if (warmQueue.indexOf(slug) !== -1) {
      return;
    }
    warmQueue.push(slug);
    drainWarmQueue();
  }

  player.addEventListener("ended", function () {
    if (!activeSource) {
      stopActive();
    }
  });

  buttons.forEach(function (button) {
    var slug = button.getAttribute("data-sound-sample");
    if (!slug) {
      return;
    }

    button.addEventListener("pointerenter", function () {
      enqueueWarm(slug);
    });
    button.addEventListener("focus", function () {
      enqueueWarm(slug);
    });

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      var isActive =
        activeButton === button &&
        activeSlug === slug &&
        (activeSource || !player.paused);

      if (isActive) {
        stopActive();
        return;
      }

      startSample(button, slug);
    });
  });

  // Warm free samples immediately; Pro follows as soon as the section is near.
  buttons.forEach(function (button) {
    if (!button.closest(".sound-list-free")) {
      return;
    }
    var slug = button.getAttribute("data-sound-sample");
    if (slug) {
      enqueueWarm(slug);
    }
  });

  var section = document.getElementById("background-sounds");
  if (section && "IntersectionObserver" in window) {
    var warmedPro = false;
    var observer = new IntersectionObserver(
      function (entries) {
        if (warmedPro) {
          return;
        }
        var visible = entries.some(function (entry) {
          return entry.isIntersecting;
        });
        if (!visible) {
          return;
        }
        warmedPro = true;
        observer.disconnect();
        buttons.forEach(function (button) {
          var slug = button.getAttribute("data-sound-sample");
          if (slug) {
            enqueueWarm(slug);
          }
        });
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(section);
  }
})();
