// Game Hacking Academy page features for the Starlight site: the colour
// palette picker, the projection playground, and glossary links. Ported from
// the Jekyll theme's academy.js; the GitBook-specific parts stayed behind.
(function () {
  "use strict";

  var PALETTES = ["paper", "purple", "midnight", "forest", "contrast"];
  var BACKGROUNDS = ["theme", "warm", "cool", "rose", "neutral"];

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
  }

  function applyPalette(id) {
    var palette = PALETTES.indexOf(id) >= 0 ? id : "paper";
    document.documentElement.dataset.academyTheme = palette;
    storageSet("gha-theme", palette);
    document.querySelectorAll("[data-academy-palette]").forEach(function (select) { select.value = palette; });
  }

  function applyBackground(id) {
    var tone = BACKGROUNDS.indexOf(id) >= 0 ? id : "theme";
    if (tone === "theme") delete document.documentElement.dataset.academyBackground;
    else document.documentElement.dataset.academyBackground = tone;
    storageSet("gha-background", tone);
    document.querySelectorAll("[data-academy-background]").forEach(function (select) { select.value = tone; });
  }

  function initPalettePickers() {
    document.querySelectorAll("[data-academy-palette]").forEach(function (select) {
      select.value = document.documentElement.dataset.academyTheme || "paper";
      if (select.dataset.bound) return;
      select.dataset.bound = "true";
      select.addEventListener("change", function () { applyPalette(select.value); });
    });
    document.querySelectorAll("[data-academy-background]").forEach(function (select) {
      select.value = document.documentElement.dataset.academyBackground || "theme";
      if (select.dataset.bound) return;
      select.dataset.bound = "true";
      select.addEventListener("change", function () { applyBackground(select.value); });
    });
  }

  function initProjectionPlaygrounds() {
    document.querySelectorAll("[data-projection-lab]").forEach(function (lab) {
      if (lab.dataset.projectionReady === "true") return;

      var inputs = {};
      var outputs = {};
      lab.querySelectorAll("[data-projection-input]").forEach(function (input) {
        inputs[input.dataset.projectionInput] = input;
      });
      lab.querySelectorAll("[data-projection-output]").forEach(function (output) {
        outputs[output.dataset.projectionOutput] = output;
      });

      var requiredInputs = ["x", "y", "z", "fov"];
      if (!requiredInputs.every(function (name) { return inputs[name] && outputs[name]; })) {
        return;
      }

      var frustumTop = lab.querySelector('[data-frustum-edge="top"]');
      var frustumBottom = lab.querySelector('[data-frustum-edge="bottom"]');
      var frustumPoint = lab.querySelector("[data-frustum-point]");
      var frustumLabel = lab.querySelector("[data-frustum-point-label]");
      var screenPoint = lab.querySelector("[data-screen-point]");
      var screenLabel = lab.querySelector("[data-screen-point-label]");
      var status = lab.querySelector("[data-projection-status]");
      var math = lab.querySelector("[data-projection-math]");

      if (!frustumTop || !frustumBottom || !frustumPoint || !frustumLabel
          || !screenPoint || !screenLabel || !status || !math) {
        return;
      }

      function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
      }

      function updateProjection() {
        var x = Number(inputs.x.value);
        var y = Number(inputs.y.value);
        var z = Number(inputs.z.value);
        var fovDegrees = Number(inputs.fov.value);
        var aspect = 1280 / 720;
        var tangent = Math.tan((fovDegrees * Math.PI / 180) / 2);
        var halfWidth = z * tangent * aspect;
        var halfHeight = z * tangent;
        var ndcX = x / halfWidth;
        var ndcY = y / halfHeight;
        var inside = z > 0.1 && Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1;
        var screenX = (ndcX + 1) * 640;
        var screenY = (1 - ndcY) * 360;

        outputs.x.textContent = x.toFixed(1);
        outputs.y.textContent = y.toFixed(1);
        outputs.z.textContent = z.toFixed(1);
        outputs.fov.textContent = fovDegrees.toFixed(0) + "°";

        var farHalfWidth = 20 * tangent * aspect;
        var worldScale = 85 / Math.max(farHalfWidth, 10);
        frustumTop.setAttribute("y2", String(115 - farHalfWidth * worldScale));
        frustumBottom.setAttribute("y2", String(115 + farHalfWidth * worldScale));

        var frustumX = 44 + clamp(z / 20, 0, 1) * 368;
        var frustumY = clamp(115 - x * worldScale, 16, 214);
        frustumPoint.setAttribute("cx", frustumX.toFixed(1));
        frustumPoint.setAttribute("cy", frustumY.toFixed(1));
        frustumPoint.classList.toggle("is-outside", !inside);
        frustumLabel.setAttribute("x", (frustumX > 350 ? frustumX - 11 : frustumX + 11).toFixed(1));
        frustumLabel.setAttribute("y", clamp(frustumY - 10, 18, 214).toFixed(1));
        frustumLabel.setAttribute("text-anchor", frustumX > 350 ? "end" : "start");

        var viewportX = clamp(26 + ((ndcX + 1) / 2) * 348, 26, 374);
        var viewportY = clamp(12 + ((1 - ndcY) / 2) * 196, 12, 208);
        screenPoint.setAttribute("cx", viewportX.toFixed(1));
        screenPoint.setAttribute("cy", viewportY.toFixed(1));
        screenPoint.classList.toggle("is-outside", !inside);
        screenLabel.setAttribute("x", (viewportX > 300 ? viewportX - 12 : viewportX + 12).toFixed(1));
        screenLabel.setAttribute("y", clamp(viewportY - 10, 26, 204).toFixed(1));
        screenLabel.setAttribute("text-anchor", viewportX > 300 ? "end" : "start");
        screenLabel.textContent = inside
          ? "(" + Math.round(screenX) + ", " + Math.round(screenY) + ")"
          : "outside viewport";

        status.textContent = inside ? "Inside the view" : "Outside the view";
        math.textContent = "w = " + z.toFixed(1)
          + " · NDC (" + ndcX.toFixed(2) + ", " + ndcY.toFixed(2) + ")"
          + (inside ? " · screen (" + Math.round(screenX) + ", " + Math.round(screenY) + ")" : "");
      }

      requiredInputs.forEach(function (name) {
        inputs[name].addEventListener("input", updateProjection);
      });
      lab.dataset.projectionReady = "true";
      updateProjection();
    });
  }

  // Glossary term -> anchor, fetched once per visit and reused across pages.
  var glossaryIndexPromise = null;

  function loadGlossaryIndex() {
    if (glossaryIndexPromise) return glossaryIndexPromise;
    var link = document.querySelector('link[rel="glossary-index"]');
    if (!link || typeof fetch !== "function") {
      glossaryIndexPromise = Promise.resolve(null);
      return glossaryIndexPromise;
    }
    glossaryIndexPromise = fetch(link.href)
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (entries) {
        if (!Array.isArray(entries)) return null;
        var byTerm = new Map();
        entries.forEach(function (entry) {
          if (!entry || !entry.t || !entry.a) return;
          byTerm.set(normalizeTerm(entry.t), entry.a);
        });
        return byTerm;
      })
      .catch(function () {
        // A missing index must never break the lesson text.
        return null;
      });
    return glossaryIndexPromise;
  }

  function normalizeTerm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/’/g, "'")
      .replace(/\s+/g, " ")
      .replace(/^[^a-z0-9]+|[^a-z0-9)*+]+$/g, "")
      .trim();
  }

  // The book bolds a term where it defines it. Turning that first bold into a
  // link gives a beginner a definition one click away without peppering the
  // prose with links on every later mention.
  function linkGlossaryTerms() {
    var section = document.querySelector(".sl-markdown-content");
    if (!section || document.querySelector(".academy-glossary")) return;
    if (section.dataset.glossaryLinked === "true") return;
    section.dataset.glossaryLinked = "true";

    var glossaryLink = document.querySelector('link[rel="glossary"]');
    if (!glossaryLink) return;

    loadGlossaryIndex().then(function (byTerm) {
      if (!byTerm || !byTerm.size) return;
      var used = new Set();

      Array.prototype.forEach.call(section.querySelectorAll("strong"), function (node) {
        if (node.closest("a, pre, h1, h2, h3, h4, .academy-quiz")) return;

        var direct = normalizeTerm(node.textContent);
        var anchor = byTerm.get(direct);
        // Lessons often define a term in the plural ("libraries", "console
        // variables") while the glossary lists the singular.
        if (!anchor && direct.length > 5 && direct.slice(-3) === "ies") {
          anchor = byTerm.get(direct.slice(0, -3) + "y");
        }
        if (!anchor && direct.length > 4 && direct.slice(-1) === "s") {
          anchor = byTerm.get(direct.slice(0, -1));
        }
        if (!anchor || used.has(anchor)) return;
        used.add(anchor);

        var link = document.createElement("a");
        link.className = "glossary-term-link";
        link.href = glossaryLink.href + "#" + anchor;
        link.title = "Definition of " + node.textContent.trim() + " in the glossary";
        link.setAttribute("data-glossary-term", "true");
        while (node.firstChild) link.appendChild(node.firstChild);
        node.appendChild(link);
      });
    });
  }

  // Highlight the glossary entry a reader just jumped to. Driven by a class
  // rather than :target so that following a link to the anchor you are already
  // on still flashes the entry instead of doing nothing visible.
  function highlightGlossaryTarget() {
    var list = document.querySelector(".academy-glossary");
    if (!list) return;

    var previous = list.querySelector("dt.is-glossary-highlight");
    if (previous) previous.classList.remove("is-glossary-highlight");

    var id = (window.location.hash || "").replace(/^#/, "");
    if (!id) return;

    var entry = document.getElementById(id);
    if (!entry || entry.tagName !== "DT") return;

    entry.classList.add("is-glossary-highlight");
    entry.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function bindGlossaryHighlight() {
    if (window.__academyGlossaryHighlightBound) return;
    window.__academyGlossaryHighlightBound = true;
    window.addEventListener("hashchange", highlightGlossaryTarget);
  }

  function initializePageFeatures() {
    initPalettePickers();
    initProjectionPlaygrounds();
    linkGlossaryTerms();
    highlightGlossaryTarget();
    bindGlossaryHighlight();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePageFeatures, { once: true });
  } else {
    initializePageFeatures();
  }
})();
