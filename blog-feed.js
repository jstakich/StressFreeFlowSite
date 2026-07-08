(function () {
  var feedRoots = document.querySelectorAll("[data-blog-feed]");
  var searchInput = document.querySelector("[data-blog-search]");
  var searchStatus = document.getElementById("blog-search-status");
  var allPosts = [];

  if (!feedRoots.length) {
    return;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function postTimestamp(isoDate) {
    var parts = String(isoDate).split("-");
    if (parts.length !== 3) {
      return 0;
    }

    return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function sortPostsNewestFirst(posts) {
    return posts.slice().sort(function (a, b) {
      var dateDiff = postTimestamp(b.date) - postTimestamp(a.date);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return String(b.title).localeCompare(String(a.title));
    });
  }

  function formatDate(isoDate) {
    var parts = isoDate.split("-");
    if (parts.length !== 3) {
      return isoDate;
    }

    var year = Number(parts[0]);
    var month = Number(parts[1]) - 1;
    var day = Number(parts[2]);
    var date = new Date(Date.UTC(year, month, day));

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function postSearchText(post) {
    return [
      post.title,
      post.excerpt,
      post.date,
      formatDate(post.date),
      (post.tags || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
  }

  function filterPosts(posts, query) {
    var normalized = String(query || "")
      .trim()
      .toLowerCase();

    if (!normalized) {
      return posts;
    }

    return posts.filter(function (post) {
      return postSearchText(post).indexOf(normalized) !== -1;
    });
  }

  function renderPost(post) {
    var tags = (post.tags || [])
      .map(function (tag) {
        return '<span class="blog-tag">' + escapeHtml(tag) + "</span>";
      })
      .join("");

    return (
      '<article class="blog-feed-item card">' +
      '<div class="blog-feed-date-col">' +
      '<time class="blog-feed-date" datetime="' +
      escapeHtml(post.date) +
      '">' +
      escapeHtml(formatDate(post.date)) +
      "</time>" +
      "</div>" +
      '<div class="blog-feed-body">' +
      '<div class="blog-meta">' +
      tags +
      "</div>" +
      "<h3><a href=\"" +
      escapeHtml(post.url) +
      '">' +
      escapeHtml(post.title) +
      "</a></h3>" +
      "<p>" +
      escapeHtml(post.excerpt) +
      "</p>" +
      '<a class="blog-read-link" href="' +
      escapeHtml(post.url) +
      '">Read article →</a>' +
      "</div>" +
      "</article>"
    );
  }

  function renderFeed(root, posts, query) {
    var limit = root.getAttribute("data-blog-limit");
    var searchable = root.hasAttribute("data-blog-searchable");
    var visiblePosts = posts;

    if (searchable && searchInput && String(query || "").trim()) {
      visiblePosts = filterPosts(posts, query);
    } else if (limit) {
      visiblePosts = posts.slice(0, Number(limit));
    }

    if (!visiblePosts.length) {
      root.innerHTML =
        '<p class="blog-feed-status">' +
        (String(query || "").trim()
          ? "No articles match your search."
          : "No articles yet.") +
        "</p>";
      return;
    }

    root.innerHTML = visiblePosts.map(renderPost).join("");
  }

  function updateSearchStatus(query, count) {
    if (!searchStatus) {
      return;
    }

    var normalized = String(query || "").trim();

    if (!normalized) {
      searchStatus.textContent = "";
      return;
    }

    searchStatus.textContent =
      count === 1 ? "1 article found" : count + " articles found";
  }

  function renderAllFeeds(query) {
    feedRoots.forEach(function (root) {
      renderFeed(root, allPosts, root.hasAttribute("data-blog-searchable") ? query : "");
    });

    if (searchStatus && searchInput) {
      updateSearchStatus(query, filterPosts(allPosts, query).length);
    }
  }

  fetch("./blogs.json?v=3")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load blog posts.");
      }
      return response.json();
    })
    .then(function (posts) {
      allPosts = sortPostsNewestFirst(posts);
      renderAllFeeds("");

      if (searchInput) {
        searchInput.addEventListener("input", function () {
          renderAllFeeds(searchInput.value);
        });
      }
    })
    .catch(function () {
      feedRoots.forEach(function (root) {
        root.innerHTML =
          '<p class="blog-feed-status">Could not load articles. Please refresh the page.</p>';
      });
    });
})();
