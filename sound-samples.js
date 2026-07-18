(function () {
  var SAMPLE_SECONDS = 7;
  var SAMPLE_BASE = "/assets/sound-samples/";
  var SAMPLE_VERSION = "6";
  var buttons = document.querySelectorAll("[data-sound-sample]");

  if (!buttons.length) {
    return;
  }

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var useWebAudio = typeof AudioCtx === "function" && typeof window.fetch === "function";

  var audioContext = null;
  var bufferCache = Object.create(null);
  var bufferLoading = Object.create(null);
  var htmlAudioCache = Object.create(null);

  var activeButton = null;
  var activeSource = null;
  var activeHtmlAudio = null;
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

  function setLoading(button, loading) {
    button.classList.toggle("is-loading", loading);
    if (loading) {
      button.textContent = "…";
    }
  }

  function clearStopTimer() {
    if (stopTimer) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
  }

  function getAudioContext() {
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

    if (activeHtmlAudio) {
      try {
        activeHtmlAudio.pause();
        activeHtmlAudio.currentTime = 0;
      } catch (err) {
        // Ignore.
      }
      activeHtmlAudio = null;
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

  function loadBuffer(slug) {
    if (bufferCache[slug]) {
      return Promise.resolve(bufferCache[slug]);
    }
    if (bufferLoading[slug]) {
      return bufferLoading[slug];
    }

    bufferLoading[slug] = fetch(sampleUrl(slug), { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load sample");
        }
        return response.arrayBuffer();
      })
      .then(function (data) {
        return getAudioContext().decodeAudioData(data.slice(0));
      })
      .then(function (buffer) {
        bufferCache[slug] = buffer;
        delete bufferLoading[slug];
        return buffer;
      })
      .catch(function (err) {
        delete bufferLoading[slug];
        throw err;
      });

    return bufferLoading[slug];
  }

  function playBuffer(button, slug, buffer, token) {
    if (token !== playToken || activeButton !== button) {
      return;
    }

    var context = getAudioContext();
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    activeSource = source;

    source.onended = function () {
      if (token === playToken && activeSource === source) {
        stopActive();
      }
    };

    source.start(0);
    armStopTimer(token);
    setPlaying(button, true);
  }

  function ensureHtmlAudio(slug) {
    if (htmlAudioCache[slug]) {
      return htmlAudioCache[slug];
    }
    var audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    audio.src = sampleUrl(slug);
    htmlAudioCache[slug] = audio;
    return audio;
  }

  function startHtmlSample(button, slug, token) {
    var audio = ensureHtmlAudio(slug);
    activeHtmlAudio = audio;
    setPlaying(button, true);

    try {
      audio.currentTime = 0;
    } catch (err) {
      // Ignore until metadata is ready.
    }

    var playPromise = audio.play();
    if (!playPromise || typeof playPromise.then !== "function") {
      armStopTimer(token);
      return;
    }

    playPromise
      .then(function () {
        if (token !== playToken || activeHtmlAudio !== audio) {
          return;
        }
        armStopTimer(token);
      })
      .catch(function (err) {
        if (token !== playToken || activeHtmlAudio !== audio) {
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
    setPlaying(button, true);

    if (!useWebAudio) {
      startHtmlSample(button, slug, token);
      return;
    }

    getAudioContext();

    if (bufferCache[slug]) {
      playBuffer(button, slug, bufferCache[slug], token);
      return;
    }

    setLoading(button, true);
    loadBuffer(slug)
      .then(function (buffer) {
        playBuffer(button, slug, buffer, token);
      })
      .catch(function () {
        if (token !== playToken || activeButton !== button) {
          return;
        }
        // Fall back to HTMLAudio if decode/fetch fails.
        startHtmlSample(button, slug, token);
      });
  }

  function warmSlug(slug) {
    if (!slug) {
      return;
    }
    if (useWebAudio) {
      loadBuffer(slug).catch(function () {
        ensureHtmlAudio(slug);
      });
      return;
    }
    ensureHtmlAudio(slug);
  }

  // Limit background warm-up so sample fetches don't saturate the connection.
  var warmQueue = [];
  var warmActive = 0;
  var WARM_CONCURRENCY = 2;

  function drainWarmQueue() {
    while (warmActive < WARM_CONCURRENCY && warmQueue.length) {
      var slug = warmQueue.shift();
      warmActive += 1;
      var done = function () {
        warmActive = Math.max(0, warmActive - 1);
        drainWarmQueue();
      };
      if (useWebAudio) {
        loadBuffer(slug).then(done, done);
      } else {
        ensureHtmlAudio(slug);
        done();
      }
    }
  }

  function enqueueWarm(slug) {
    if (!slug || bufferCache[slug] || bufferLoading[slug] || htmlAudioCache[slug]) {
      return;
    }
    if (warmQueue.indexOf(slug) !== -1) {
      return;
    }
    warmQueue.push(slug);
    drainWarmQueue();
  }

  buttons.forEach(function (button) {
    var slug = button.getAttribute("data-sound-sample");
    if (!slug) {
      return;
    }

    button.addEventListener("pointerenter", function () {
      warmSlug(slug);
    });
    button.addEventListener("focus", function () {
      warmSlug(slug);
    });

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (activeButton === button && (activeSource || (activeHtmlAudio && !activeHtmlAudio.paused))) {
        stopActive();
        return;
      }

      startSample(button, slug);
    });
  });

  // Warm free samples near the section; Pro samples warm on hover/focus to keep the page snappy.
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

        buttons.forEach(function (button) {
          if (!button.closest(".sound-list-free")) {
            return;
          }
          var slug = button.getAttribute("data-sound-sample");
          if (slug) {
            enqueueWarm(slug);
          }
        });
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(section);
  }
})();
