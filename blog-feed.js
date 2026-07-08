(function () {
  var feedRoots = document.querySelectorAll("[data-blog-feed]");

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

  function renderFeed(root, posts) {
    var limit = root.getAttribute("data-blog-limit");
    var visiblePosts = posts;

    if (limit) {
      visiblePosts = posts.slice(0, Number(limit));
    }

    if (!visiblePosts.length) {
      root.innerHTML = '<p class="blog-feed-status">No articles yet.</p>';
      return;
    }

    root.innerHTML = visiblePosts.map(renderPost).join("");
  }

  fetch("./blogs.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load blog posts.");
      }
      return response.json();
    })
    .then(function (posts) {
      var sorted = posts.slice().sort(function (a, b) {
        return b.date.localeCompare(a.date);
      });

      feedRoots.forEach(function (root) {
        renderFeed(root, sorted);
      });
    })
    .catch(function () {
      feedRoots.forEach(function (root) {
        root.innerHTML =
          '<p class="blog-feed-status">Could not load articles. Please refresh the page.</p>';
      });
    });
})();
