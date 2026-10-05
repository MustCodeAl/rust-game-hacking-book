// Reading progress: the lessons this reader has marked done, kept in this
// browser only, under localStorage "gha-done" as a list of lesson URL ids such
// as "pages/1/10". A lesson keeps its URL when the book reorders lessons, so
// saved progress survives a new reading order. A chapter is done when every
// one of its lessons is.
//
// Every display reads the same list:
//   [data-done-toggle="<id>"]  one lesson's button; data-state is "done" or "todo"
//   [data-chapter-done]        marks every id in data-lessons done, or clears them
//   [data-chapter-progress]    a meter over data-lessons: --progress and data-progress-text
//   [data-progress-clear]      clears all progress after asking
//   [data-progress-status]     a polite live region that reports each change
//   the lesson list            a tick on each finished lesson, "3/9" or "✓ Done" per chapter
(function () {
  "use strict";

  var KEY = "gha-done";
  var ID = /^pages\/\d+\/\d+$/;
  var done = load();

  function isId(value) {
    return typeof value === "string" && ID.test(value);
  }

  function load() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(KEY) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter(isId) : []);
    } catch (error) {
      return new Set();
    }
  }

  function save() {
    try {
      if (done.size) window.localStorage.setItem(KEY, JSON.stringify(Array.from(done).sort()));
      else window.localStorage.removeItem(KEY);
    } catch (error) {
      // Private browsing can refuse storage; progress then lasts for this page.
    }
  }

  // "/rust-game-hacking-book/pages/1/10/#heading" -> "pages/1/10"
  function idOf(href) {
    if (!href) return null;
    try {
      var match = /\/(pages\/\d+\/\d+)\/?$/.exec(new URL(href, document.baseURI).pathname);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  function idsOf(element) {
    return (element.getAttribute("data-lessons") || "").split(/\s+/).filter(isId);
  }

  function countDone(ids) {
    var finished = 0;
    ids.forEach(function (id) {
      if (done.has(id)) finished += 1;
    });
    return finished;
  }

  function progressText(finished, total, short) {
    if (short) return finished === total ? "✓ all done" : finished + " done";
    if (finished === 0) return total + " lessons, none marked done yet";
    if (finished === total) return "all " + total + " lessons done";
    return finished + " of " + total + " lessons done";
  }

  // ------------------------------------------------------------------
  // Drawing the saved progress
  // ------------------------------------------------------------------

  function renderMeter(meter) {
    var ids = idsOf(meter);
    var finished = countDone(ids);
    meter.style.setProperty("--progress", ids.length ? String(finished / ids.length) : "0");
    meter.classList.toggle("has-progress", finished > 0);
    meter.classList.toggle("is-complete", ids.length > 0 && finished === ids.length);
    var section = meter.closest("[data-chapter-section]");
    if (section) section.classList.toggle("is-complete", ids.length > 0 && finished === ids.length);
    var text = meter.querySelector("[data-progress-text]");
    if (text) text.textContent = progressText(finished, ids.length, meter.classList.contains("course-card__progress"));
  }

  // A tick after each finished lesson, and the chapter's count on its label:
  // "3/9" while it is under way, "✓ Done" once every lesson is. Screen readers
  // hear "(done)" and "3 of 9 lessons done" instead of the symbols.
  function renderLessonList() {
    var sidebar = document.getElementById("starlight__sidebar");
    if (!sidebar) return;
    sidebar.querySelectorAll("ul.top-level > li").forEach(function (group) {
      var links = group.querySelectorAll("a[data-chapter]");
      if (!links.length) return;
      var finished = 0;
      links.forEach(function (link) {
        var isDone = done.has(idOf(link.getAttribute("href")));
        if (isDone) finished += 1;
        link.classList.toggle("is-done", isDone);
        var note = link.querySelector(".lesson-done-note");
        if (isDone && !note) {
          note = document.createElement("span");
          note.className = "lesson-done-note sr-only";
          note.textContent = " (done)";
          link.appendChild(note);
        } else if (!isDone && note) {
          note.remove();
        }
      });

      var complete = finished === links.length;
      group.classList.toggle("has-progress", finished > 0);
      group.classList.toggle("is-complete", complete);
      group.style.setProperty("--chapter-progress", String(finished / links.length));

      var label = group.querySelector("summary .group-label");
      if (!label) return;
      var chip = label.querySelector(".chapter-progress");
      if (!chip) {
        chip = document.createElement("span");
        chip.className = "chapter-progress";
        label.appendChild(chip);
      }
      chip.hidden = finished === 0;
      var shown = document.createElement("span");
      shown.setAttribute("aria-hidden", "true");
      shown.textContent = complete ? "✓ Done" : finished + "/" + links.length;
      var spoken = document.createElement("span");
      spoken.className = "sr-only";
      spoken.textContent = complete ? ", all lessons done" : ", " + finished + " of " + links.length + " lessons done";
      chip.replaceChildren(shown, spoken);
    });
  }

  function render() {
    document.querySelectorAll("[data-done-toggle]").forEach(function (button) {
      button.dataset.state = done.has(button.getAttribute("data-done-toggle")) ? "done" : "todo";
      button.setAttribute("aria-pressed", String(button.dataset.state === "done"));
    });
    document.querySelectorAll("[data-chapter-done]").forEach(function (button) {
      var ids = idsOf(button);
      button.dataset.state = ids.length && countDone(ids) === ids.length ? "done" : "todo";
      button.setAttribute("aria-pressed", String(button.dataset.state === "done"));
    });
    document.querySelectorAll("[data-chapter-progress]").forEach(renderMeter);
    renderLessonList();
  }

  // ------------------------------------------------------------------
  // Changing it
  // ------------------------------------------------------------------

  function setDone(ids, value) {
    ids.forEach(function (id) {
      if (value) done.add(id);
      else done.delete(id);
    });
    save();
    render();
  }

  function announce(message) {
    document.querySelectorAll("[data-progress-status]").forEach(function (region) {
      region.textContent = message;
    });
  }

  function chapterIdsFor(id) {
    var groups = document.querySelectorAll("[data-chapter-section], #starlight__sidebar ul.top-level > li");
    for (var group of groups) {
      var ids = group.hasAttribute("data-chapter-section")
        ? idsOf(group)
        : Array.from(group.querySelectorAll("a[data-chapter]")).map(function (link) {
          return idOf(link.getAttribute("href"));
        }).filter(isId);
      if (ids.includes(id)) return ids;
    }
    return [];
  }

  function completion(kind) {
    document.dispatchEvent(new CustomEvent("academy:completed", { detail: { kind: kind } }));
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest && event.target.closest("[data-done-toggle], [data-chapter-done], [data-progress-clear]");
    if (!target) return;

    if (target.hasAttribute("data-done-toggle")) {
      var id = target.getAttribute("data-done-toggle");
      if (!isId(id)) return;
      var nowDone = !done.has(id);
      var chapterIds = chapterIdsFor(id);
      setDone([id], nowDone);
      announce(nowDone ? "Lesson marked done." : "Lesson marked not done.");
      if (nowDone) completion(chapterIds.length && countDone(chapterIds) === chapterIds.length ? "chapter" : "lesson");
      return;
    }

    if (target.hasAttribute("data-chapter-done")) {
      var ids = idsOf(target);
      if (!ids.length) return;
      var allDone = countDone(ids) === ids.length;
      setDone(ids, !allDone);
      announce(allDone ? "Chapter marked not done." : "All " + ids.length + " lessons in this chapter marked done.");
      if (!allDone) completion("chapter");
      return;
    }

    if (!done.size) return;
    if (window.confirm("Clear every lesson you have marked done in this browser?")) {
      done.clear();
      save();
      render();
      announce("All progress cleared.");
    }
  });

  // Another tab, or a page restored by the Back button, may hold an older list.
  window.addEventListener("storage", function (event) {
    if (event.key !== KEY && event.key !== null) return;
    done = load();
    render();
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    done = load();
    render();
  });

  // Read by hover-cards.js, so a lesson's card can say whether it is done.
  window.AcademyProgress = {
    idOf: idOf,
    isDone: function (id) {
      return done.has(id);
    },
    countDone: function (ids) {
      return countDone(ids.filter(isId));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
})();
