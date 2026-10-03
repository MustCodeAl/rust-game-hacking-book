// Behaviour for the lesson components (src/components/kit): tabs, accordions in
// print, and the Prompt buttons. Every component is complete HTML without this
// file; it only makes them nicer to use on a lesson page. The listening
// editions do not load it, so there every tab panel stays visible, in order.
(function () {
  "use strict";

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
  }

  // ------------------------------------------------------------------
  // Tabs: the panels are already in the page; this adds the tab list
  // ------------------------------------------------------------------

  var tabCount = 0;

  function selectTab(group, index, focus) {
    var tabs = group.querySelectorAll(":scope > .kit-tabs__list > .kit-tabs__tab");
    var panels = group.querySelectorAll(":scope > .kit-tab");
    tabs.forEach(function (tab, i) {
      var selected = i === index;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach(function (panel, i) { panel.hidden = i !== index; });
  }

  function labelOf(panel) {
    return panel.getAttribute("data-label") || "";
  }

  function chooseByLabel(group, label) {
    var panels = Array.prototype.slice.call(group.querySelectorAll(":scope > .kit-tab"));
    var index = panels.findIndex(function (panel) { return labelOf(panel) === label; });
    if (index >= 0) selectTab(group, index, false);
  }

  function enhanceTabs(group) {
    var panels = Array.prototype.slice.call(group.querySelectorAll(":scope > .kit-tab"));
    if (panels.length < 2) return;
    var id = "kit-tabs-" + (++tabCount);
    var list = document.createElement("div");
    list.className = "kit-tabs__list";
    list.setAttribute("role", "tablist");

    panels.forEach(function (panel, i) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "kit-tabs__tab";
      tab.id = id + "-tab-" + i;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", id + "-panel-" + i);
      tab.textContent = labelOf(panel);
      tab.addEventListener("click", function () {
        selectTab(group, i, false);
        var key = group.getAttribute("data-sync");
        if (!key) return;
        storageSet("gha-tab-" + key, labelOf(panel));
        document.querySelectorAll('[data-kit-tabs][data-sync="' + key + '"]').forEach(function (other) {
          if (other !== group) chooseByLabel(other, labelOf(panel));
        });
      });
      tab.addEventListener("keydown", function (event) {
        var step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        var target = event.key === "Home" ? 0 : event.key === "End" ? panels.length - 1
          : step ? (i + step + panels.length) % panels.length : -1;
        if (target < 0) return;
        event.preventDefault();
        selectTab(group, target, true);
      });
      list.appendChild(tab);
      panel.id = id + "-panel-" + i;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
    });

    group.insertBefore(list, group.firstChild);
    group.classList.add("is-enhanced");
    var saved = group.getAttribute("data-sync") ? storageGet("gha-tab-" + group.getAttribute("data-sync")) : null;
    var start = panels.findIndex(function (panel) { return labelOf(panel) === saved; });
    selectTab(group, start >= 0 ? start : 0, false);
  }

  // ------------------------------------------------------------------
  // Printing: closed accordions would print as one line, so open them all
  // ------------------------------------------------------------------

  var closedBeforePrint = [];

  window.addEventListener("beforeprint", function () {
    closedBeforePrint = [];
    document.querySelectorAll("details.kit-accordion, details.kit-expandable").forEach(function (details) {
      if (!details.open) {
        closedBeforePrint.push(details);
        details.open = true;
      }
    });
  });

  window.addEventListener("afterprint", function () {
    closedBeforePrint.forEach(function (details) { details.open = false; });
    closedBeforePrint = [];
  });

  // ------------------------------------------------------------------
  // Prompt: copy it, or open it in an assistant
  // ------------------------------------------------------------------

  // Long prompts do not fit in a link, so they get the copy button only.
  var MAX_LINK_LENGTH = 1800;
  var ASSISTANTS = [
    { name: "Claude", url: "https://claude.ai/new?q=" },
    { name: "ChatGPT", url: "https://chatgpt.com/?q=" }
  ];

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (error) { /* fall through */ }
      field.remove();
      if (ok) resolve(); else reject(new Error("copy failed"));
    });
  }

  function enhancePrompt(prompt) {
    var source = prompt.querySelector("[data-kit-prompt-text]");
    if (!source || prompt.querySelector(".kit-prompt__actions")) return;
    var text = source.innerText.trim();
    var actions = document.createElement("div");
    actions.className = "kit-prompt__actions";

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "kit-prompt__action";
    copy.textContent = "Copy the prompt";
    var status = document.createElement("span");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    copy.addEventListener("click", function () {
      copyText(text).then(function () {
        copy.textContent = "Copied";
        status.textContent = "Prompt copied to the clipboard.";
      }, function () {
        copy.textContent = "Select the text to copy";
        status.textContent = "Copying was blocked. Select the prompt text and copy it by hand.";
      });
      window.setTimeout(function () { copy.textContent = "Copy the prompt"; }, 2500);
    });
    actions.appendChild(copy);
    actions.appendChild(status);

    if (text.length <= MAX_LINK_LENGTH) {
      ASSISTANTS.forEach(function (assistant) {
        var link = document.createElement("a");
        link.className = "kit-prompt__action";
        link.href = assistant.url + encodeURIComponent(text);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open in " + assistant.name + " ↗";
        actions.appendChild(link);
      });
    }
    prompt.appendChild(actions);
  }

  function init() {
    document.querySelectorAll("[data-kit-tabs]").forEach(enhanceTabs);
    document.querySelectorAll("[data-kit-prompt]").forEach(enhancePrompt);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
