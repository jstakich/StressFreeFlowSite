(function () {
  /**
   * Research-backed sample player:
   * - HTMLAudio only (Web Audio after async decode loses the Safari user-gesture)
   * - Silent WAV unlock so later play()/retries work on iOS
   * - Blob cache for instant replay after first successful fetch
   * - No network warm during initial page load (keeps PageSpeed / LCP clean)
   */
  var SAMPLE_SECONDS = 7;
  var SAMPLE_BASE = "/assets/sound-samples/";
  var SAMPLE_VERSION = "7";
  var SILENT_WAV =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

  var buttons = document.querySelectorAll("[data-sound-sample]");
  if (!buttons.length) {
    return;
  }

  var player = new Audio();
  player.preload = "auto";
  player.volume = 1;
  try {
    player.setAttribute("playsinline", "");
    player.playsInline = true;
  } catch (err) {
    // Older browsers.
  }

  var blobCache = Object.create(null);
  var blobLoading = Object.create(null);
  var unlocked = false;
  var activeButton = null;
  var activeSlug = null;
  var stopTimer = null;
  var playToken = 0;
  var unlockPromise = null;

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
    if (playing && button.getAttribute("data-sound-tier") === "pro") {
      showProSampleCta(label);
    }
  }

  function showProSampleCta(label) {
    var cta = document.getElementById("pro-sample-cta");
    var copy = document.getElementById("pro-sample-cta-copy");
    if (!cta) {
      return;
    }
    if (copy) {
      copy.textContent =
        (label || "This Pro sound") +
        " is Pro — unlock everything for a $4.99 one-time fee.";
    }
    cta.hidden = false;
    cta.classList.add("is-visible");
  }

  function setLoading(button, loading) {
    button.classList.toggle("is-loading", !!loading);
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

  function stopActive() {
    clearStopTimer();
    playToken += 1;
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

  function unlockAudio() {
    if (unlocked) {
      return Promise.resolve();
    }
    if (unlockPromise) {
      return unlockPromise;
    }

    // Do not interrupt a real sample already assigned to the element.
    if (player.src && player.src.indexOf("data:audio/wav") !== 0 && player.src !== "") {
      var current = player.getAttribute("src") || player.src;
      if (current && current.indexOf("data:") !== 0 && current.indexOf(SAMPLE_BASE) !== -1) {
        unlocked = true;
        return Promise.resolve();
      }
    }

    player.src = SILENT_WAV;
    player.muted = true;
    unlockPromise = player
      .play()
      .then(function () {
        if ((player.getAttribute("src") || player.src).indexOf("data:audio/wav") === 0) {
          player.pause();
          player.currentTime = 0;
        }
        player.muted = false;
        unlocked = true;
        unlockPromise = null;
      })
      .catch(function () {
        player.muted = false;
        unlockPromise = null;
        // Leave unlocked=false so the next gesture retries.
      });

    return unlockPromise;
  }

  function fetchBlob(slug, attempt) {
    attempt = attempt || 0;
    if (blobCache[slug]) {
      return Promise.resolve(blobCache[slug]);
    }
    if (blobLoading[slug] && attempt === 0) {
      return blobLoading[slug];
    }

    var request = fetch(sampleUrl(slug), { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        blobCache[slug] = url;
        delete blobLoading[slug];
        return url;
      })
      .catch(function (err) {
        delete blobLoading[slug];
        if (attempt < 2) {
          return new Promise(function (resolve, reject) {
            window.setTimeout(function () {
              fetchBlob(slug, attempt + 1).then(resolve, reject);
            }, 300 * (attempt + 1));
          });
        }
        throw err;
      });

    if (attempt === 0) {
      blobLoading[slug] = request;
    }
    return request;
  }

  function playUrl(button, slug, url, token) {
    if (token !== playToken || activeButton !== button) {
      return;
    }

    activeSlug = slug;
    player.muted = false;
    player.src = url;

    try {
      player.currentTime = 0;
    } catch (err) {
      // Ignore until metadata arrives.
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

        // After unlock, a delayed retry is allowed (Safari gesture already spent).
        setLoading(button, true);
        window.setTimeout(function () {
          if (token !== playToken || activeButton !== button) {
            return;
          }
          var retry = player.play();
          if (retry && typeof retry.then === "function") {
            retry
              .then(function () {
                if (token === playToken && activeButton === button) {
                  setPlaying(button, true);
                  armStopTimer(token);
                }
              })
              .catch(function () {
                if (token === playToken && activeButton === button) {
                  stopActive();
                }
              });
          }
        }, 350);
      });
  }

  function startSample(button, slug) {
    stopActive();

    var token = playToken;
    activeButton = button;
    activeSlug = slug;
    setPlaying(button, true);

    // Unlock must happen inside this click/touch gesture (Safari).
    unlockAudio();

    if (blobCache[slug]) {
      playUrl(button, slug, blobCache[slug], token);
      return;
    }

    // Start network playback immediately in the gesture, then cache for next time.
    playUrl(button, slug, sampleUrl(slug), token);
    fetchBlob(slug).catch(function () {});
  }

  var warmQueue = [];
  var warmActive = 0;
  var WARM_CONCURRENCY = 2;

  function drainWarmQueue() {
    while (warmActive < WARM_CONCURRENCY && warmQueue.length) {
      var slug = warmQueue.shift();
      warmActive += 1;
      fetchBlob(slug).then(
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
    if (!slug || blobCache[slug] || blobLoading[slug]) {
      return;
    }
    if (warmQueue.indexOf(slug) !== -1) {
      return;
    }
    warmQueue.push(slug);
    drainWarmQueue();
  }

  player.addEventListener("ended", function () {
    stopActive();
  });

  player.addEventListener("error", function () {
    if (!activeButton || !activeSlug) {
      return;
    }
    var button = activeButton;
    var slug = activeSlug;
    var token = playToken;

    // One automatic recovery path for flaky CDN responses.
    fetchBlob(slug)
      .then(function (url) {
        if (token === playToken && activeButton === button) {
          playUrl(button, slug, url, token);
        }
      })
      .catch(function () {
        if (token === playToken && activeButton === button) {
          stopActive();
        }
      });
  });

  buttons.forEach(function (button) {
    var slug = button.getAttribute("data-sound-sample");
    if (!slug) {
      return;
    }

    function warm() {
      enqueueWarm(slug);
    }

    // Hover/focus warm is intent-based and does not run on first paint.
    button.addEventListener("pointerenter", warm);
    button.addEventListener("focus", warm);

    // Unlock as early as possible on a real gesture (research: click/touchend/mouseup).
    button.addEventListener("touchend", unlockAudio, { passive: true });
    button.addEventListener("mouseup", unlockAudio);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      unlockAudio();

      if (activeButton === button && activeSlug === slug && !player.paused) {
        stopActive();
        return;
      }

      startSample(button, slug);
    });
  });

  // Warm free samples only once the section is actually on screen (after scroll),
  // so PageSpeed's above-the-fold lab run does not download audio.
  var section = document.getElementById("background-sounds");
  if (section && "IntersectionObserver" in window) {
    var warmed = false;
    var observer = new IntersectionObserver(
      function (entries) {
        if (warmed) {
          return;
        }
        var visible = entries.some(function (entry) {
          return entry.isIntersecting && entry.intersectionRatio > 0;
        });
        if (!visible) {
          return;
        }
        warmed = true;
        observer.disconnect();

        var start = function () {
          buttons.forEach(function (button) {
            if (!button.closest(".sound-list-free")) {
              return;
            }
            var slug = button.getAttribute("data-sound-sample");
            if (slug) {
              enqueueWarm(slug);
            }
          });
        };

        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(start, { timeout: 1500 });
        } else {
          window.setTimeout(start, 600);
        }
      },
      { rootMargin: "0px 0px", threshold: 0.15 }
    );
    observer.observe(section);
  }
})();
