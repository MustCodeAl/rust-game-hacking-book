// Left and right arrow keys step to the previous and next lesson, using the two
// cards at the bottom of the lesson. There used to be a pair of floating
// chevron tabs fixed to the middle of each side margin; they cluttered the edges
// of the screen and collided with code blocks, so they are gone and only the
// keyboard shortcut and the cards at the bottom remain. Arrow keys are left
// alone wherever a reader types or steers with them.
(function () {
  "use strict";

  var KEEP_ARROWS = "input, textarea, select, [contenteditable], [role='tab'], [role='slider'], [role='radio'], pre, .expressive-code, [data-speedtype-active], .scene, .academy-quiz, .kit-tabs";

  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    var target = event.target;
    if (target && target.closest && target.closest(KEEP_ARROWS)) return;
    if (document.documentElement.dataset.typing) return;
    var link = document.querySelector('.pagination-links a[rel="' + (event.key === "ArrowLeft" ? "prev" : "next") + '"]');
    if (!link) return;
    event.preventDefault();
    window.location.assign(link.href);
  }

  document.addEventListener("keydown", onKey);
})();
