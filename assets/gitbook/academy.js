(function () {
  "use strict";

  function updateReadingProgress() {
    var body = document.querySelector(".body-inner");
    var bar = document.querySelector(".reading-progress span");
    if (!body || !bar) return;

    var remaining = body.scrollHeight - body.clientHeight;
    var percent = remaining > 0 ? (body.scrollTop / remaining) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, percent)) + "%";
  }

  function labelCodeBlocks() {
    document.querySelectorAll(".markdown-section pre code").forEach(function (code) {
      var pre = code.parentElement;
      if (!pre || pre.dataset.enhanced === "true") return;

      var language = Array.from(code.classList)
        .find(function (name) { return name.indexOf("language-") === 0; });

      if (language) {
        pre.dataset.language = language.replace("language-", "");
      }
      pre.dataset.enhanced = "true";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var body = document.querySelector(".body-inner");
    if (body) {
      body.addEventListener("scroll", updateReadingProgress, { passive: true });
      updateReadingProgress();
    }
    labelCodeBlocks();
  });
})();
