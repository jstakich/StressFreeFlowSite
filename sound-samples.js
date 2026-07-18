(function () {
  var SAMPLE_SECONDS = 7;
  var SAMPLE_BASE = "/assets/sound-samples/";
  var SAMPLE_VERSION = "6";
  var buttons = document.querySelectorAll("[data-sound-sample]");

  if (!buttons.length) {
    return;
  }

  // One shared media element avoids browser caps on many concurrent Audio() objects.
  var player = new Audio();
  player.preload = "auto";
  player.volume = 1;

  var blobCache = Object.create(null);
  var blobLoading = Object.create(null);
  var activeButton = null;
  var activeSlug = null;
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

  function loadBlob(slug, attempt) {
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
          throw new Error("Failed to load sample");
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
              loadBlob(slug, attempt + 1).then(resolve, reject);
            }, 250 * (attempt + 1));
          });
        }
        throw err;
      });

    if (attempt === 0) {
      blobLoading[slug] = request;
    }
    return request;
  }

  function playFromUrl(button, slug, url, token) {
    if (token !== playToken || activeButton !== button) {
      return;
    }

    activeSlug = slug;
    player.src = url;

    try {
      player.currentTime = 0;
    } catch (err) {
      // Ignore until metadata is ready.
    }

    var playPromise = player.play();
    if (!playPromise || typeof playPromise.then !== "function") {
      armStopTimer(token);
      setPlaying(button, true);
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
        // Last resort: try the network URL directly once.
        if (url.indexOf("blob:") === 0) {
          playFromUrl(button, slug, sampleUrl(slug), token);
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

    // Prefer a warm blob for instant start; otherwise play the network URL
    // immediately inside the user gesture, then upgrade the cache in background.
    if (blobCache[slug]) {
      playFromUrl(button, slug, blobCache[slug], token);
      return;
    }

    playFromUrl(button, slug, sampleUrl(slug), token);
    loadBlob(slug).catch(function () {});
  }

  function warmSlug(slug) {
    if (!slug) {
      return;
    }
    loadBlob(slug).catch(function () {});
  }

  var warmQueue = [];
  var warmActive = 0;
  var WARM_CONCURRENCY = 3;

  function drainWarmQueue() {
    while (warmActive < WARM_CONCURRENCY && warmQueue.length) {
      var slug = warmQueue.shift();
      warmActive += 1;
      loadBlob(slug).then(
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
    if (activeButton) {
      stopActive();
    }
  });

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

      if (activeButton === button && activeSlug === slug && !player.paused) {
        stopActive();
        return;
      }

      startSample(button, slug);
    });
  });

  function warmCatalog() {
    var free = [];
    var pro = [];
    buttons.forEach(function (button) {
      var slug = button.getAttribute("data-sound-sample");
      if (!slug) {
        return;
      }
      if (button.closest(".sound-list-free")) {
        free.push(slug);
      } else {
        pro.push(slug);
      }
    });
    free.concat(pro).forEach(enqueueWarm);
  }

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

        function startWarm() {
          window.setTimeout(warmCatalog, 400);
        }

        if (document.readyState === "complete") {
          startWarm();
        } else {
          window.addEventListener("load", startWarm, { once: true });
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(section);
  }
})();
