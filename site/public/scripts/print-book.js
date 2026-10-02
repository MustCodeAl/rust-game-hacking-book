// Printing is deliberately scoped. A lesson prints from its current DOM;
// /print/ fetches chapter documents only after the reader requests the book.
(function () {
  if (window.AcademyPrint) return;

  var script = document.currentScript;
  var scriptPath = script ? new URL(script.src, document.baseURI).pathname : '';
  var base = scriptPath.replace(/\/scripts\/print-book\.js$/, '');
  var optionsUrl = base + '/print/';
  var hub = document.querySelector('[data-print-hub]');
  var chapterPage = document.querySelector('[data-print-chapter-page]');
  var fullRun = null;

  function chapterUrl(number) {
    var parsed = Number(number);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 14) {
      throw new Error('Choose a chapter number from 1 to 14.');
    }
    return base + '/print/chapter/' + parsed + '/';
  }

  function announce(message, target) {
    var status = target || document.querySelector('[data-print-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'academy-print-status print-screen-only';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'position:fixed;z-index:10000;bottom:1rem;right:1rem;max-width:26rem;padding:.7rem 1rem;border-radius:.5rem;background:#171a25;color:#fff;box-shadow:0 4px 20px #0006';
      document.body.append(status);
    }
    status.textContent = message;
    return status;
  }

  function withAbort(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new DOMException('Canceled', 'AbortError'));
    return new Promise(function (resolve, reject) {
      function onAbort() {
        reject(new DOMException('Canceled', 'AbortError'));
      }
      signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(promise).then(
        function (value) {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        function (error) {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );
    });
  }

  async function waitForDiagramRenderer(signal) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (window.academyRenderAllDiagrams) return window.academyRenderAllDiagrams;
      await withAbort(new Promise(function (resolve) { setTimeout(resolve, 50); }), signal);
    }
    throw new Error('The diagram renderer did not become ready. Try reloading the page.');
  }

  function waitForImage(image) {
    if (image.complete) return Promise.resolve();
    return new Promise(function (resolve) {
      var timer = setTimeout(done, 20000);
      function done() {
        clearTimeout(timer);
        image.removeEventListener('load', done);
        image.removeEventListener('error', done);
        resolve();
      }
      image.addEventListener('load', done);
      image.addEventListener('error', done);
    });
  }

  async function prepareVisuals(root, status, signal) {
    var images = Array.from(root.querySelectorAll('img'));
    var missing = images.filter(function (image) { return !image.complete || image.naturalWidth === 0; });
    if (missing.length) {
      announce('Loading ' + missing.length + ' image' + (missing.length === 1 ? '' : 's') + ' for printing…', status);
      missing.forEach(function (image) {
        image.loading = 'eager';
        image.fetchPriority = 'high';
      });
      await withAbort(Promise.all(missing.map(waitForImage)), signal);
    }
    var failedImages = images.filter(function (image) { return image.naturalWidth === 0; });
    if (failedImages.length) {
      throw new Error(failedImages.length + ' image' + (failedImages.length === 1 ? '' : 's') + ' could not load. Printing was held so the book keeps its visuals.');
    }

    var diagrams = root.querySelectorAll('pre.mermaid:not([data-processed="true"])');
    if (diagrams.length) {
      announce('Preparing ' + diagrams.length + ' diagram' + (diagrams.length === 1 ? '' : 's') + ' for printing…', status);
      // A failed earlier attempt may be retried by Mermaid's existing loader.
      diagrams.forEach(function (block) {
        if (block.dataset.processed === 'error') delete block.dataset.processed;
      });
      var renderAll = await waitForDiagramRenderer(signal);
      await withAbort(renderAll(), signal);
      if (root.querySelector('pre.mermaid:not([data-processed="true"])')) {
        throw new Error('A diagram could not be drawn. Try again before printing.');
      }
    }
    if (document.fonts && document.fonts.ready) await withAbort(document.fonts.ready, signal);
  }

  function visualsAlreadyReady(root) {
    return !root.querySelector('pre.mermaid:not([data-processed="true"])') &&
      !Array.from(root.querySelectorAll('img')).some(function (image) {
        return !image.complete || image.naturalWidth === 0;
      });
  }

  async function printCurrent(root, status) {
    if (!root) return;
    // The common case is a published, already-rendered lesson. Keep the print
    // call inside the original click so the dialog appears without a loader.
    if (visualsAlreadyReady(root)) {
      window.print();
      return;
    }
    try {
      await prepareVisuals(root, announce('Preparing this page for printing…', status));
      announce('Ready to print.', status);
      window.print();
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Could not prepare this page for printing.', status);
    }
  }

  function printLesson() {
    if (!/\/pages\/\d+\/\d+\/?$/.test(location.pathname)) {
      location.assign(optionsUrl);
      return;
    }
    printCurrent(document.querySelector('.sl-markdown-content') || document.body);
  }

  function printChapter() {
    if (!chapterPage) {
      location.assign(optionsUrl);
      return;
    }
    printCurrent(chapterPage.querySelector('[data-print-chapter-content]'), chapterPage.querySelector('[data-print-status]'));
  }

  function copyPrintStyles(parsed, sourceUrl) {
    var existing = new Set(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(function (link) { return link.href; }));
    var inline = new Set(Array.from(document.head.querySelectorAll('style')).map(function (style) { return style.textContent; }));
    var pending = [];
    parsed.querySelectorAll('link[rel="stylesheet"][href]').forEach(function (source) {
      var href = new URL(source.getAttribute('href'), sourceUrl).href;
      if (existing.has(href) || new URL(href).origin !== location.origin) return;
      existing.add(href);
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = source.media || 'all';
      // Observe failures immediately: chapters keep loading before we wait for
      // all styles, and an early rejection must not become unhandled.
      pending.push(new Promise(function (resolve, reject) {
        link.onload = resolve;
        link.onerror = function () { reject(new Error('A chapter stylesheet could not load.')); };
      }).then(
        function () { return null; },
        function (error) { return error; }
      ));
      document.head.append(link);
    });
    parsed.head.querySelectorAll('style').forEach(function (source) {
      if (!source.textContent || inline.has(source.textContent)) return;
      inline.add(source.textContent);
      document.head.append(document.importNode(source, true));
    });
    return pending;
  }

  function resetFull(hubElements) {
    hub.dataset.printReady = 'false';
    hubElements.output.replaceChildren();
    hubElements.output.hidden = true;
    hubElements.progress.value = 0;
    hubElements.progress.hidden = true;
    hubElements.cancel.hidden = true;
    hubElements.print.hidden = true;
    hubElements.start.hidden = false;
    hubElements.start.disabled = false;
  }

  async function prepareFullBook() {
    if (!hub || fullRun) return;
    var controls = {
      start: hub.querySelector('[data-print-prepare-full]'),
      cancel: hub.querySelector('[data-print-cancel]'),
      print: hub.querySelector('[data-print-full-now]'),
      progress: hub.querySelector('[data-print-progress]'),
      status: hub.querySelector('[data-print-status]'),
      output: hub.querySelector('[data-print-output]'),
    };
    var routes = Array.from(hub.querySelectorAll('[data-print-chapter-route]'));
    var controller = new AbortController();
    var styles = [];
    fullRun = controller;
    resetFull(controls);
    controls.start.disabled = true;
    controls.cancel.hidden = false;
    controls.progress.hidden = false;
    controls.progress.max = routes.length;

    try {
      for (var index = 0; index < routes.length; index++) {
        var route = routes[index];
        announce('Loading chapter ' + (index + 1) + ' of ' + routes.length + '…', controls.status);
        var response = await fetch(route.href, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Chapter ' + route.dataset.printChapterRoute + ' could not load (' + response.status + ').');
        var html = await response.text();
        if (controller.signal.aborted) throw new DOMException('Canceled', 'AbortError');
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var section = parsed.querySelector('[data-print-chapter-content]');
        var expected = Number(route.dataset.printExpectedLessons);
        if (!section || section.querySelectorAll('.print-book-lesson').length !== expected) {
          throw new Error('Chapter ' + route.dataset.printChapterRoute + ' is incomplete. Try printing that chapter separately.');
        }
        styles.push.apply(styles, copyPrintStyles(parsed, route.href));
        var imported = document.importNode(section, true);
        // Rendered lesson content is static here. Importing chapter scripts
        // could rerun page setup fourteen times in the complete-book document.
        imported.querySelectorAll('script').forEach(function (script) { script.remove(); });
        controls.output.append(imported);
        controls.progress.value = index + 1;
        // Yield between chapters so the progress control and Cancel remain responsive.
        await withAbort(new Promise(function (resolve) { setTimeout(resolve, 0); }), controller.signal);
      }

      controls.output.hidden = false;
      announce('Applying chapter styles…', controls.status);
      var styleResults = await withAbort(Promise.all(styles), controller.signal);
      var styleError = styleResults.find(function (error) { return error; });
      if (styleError) throw styleError;
      await prepareVisuals(controls.output, controls.status, controller.signal);
      if (controller.signal.aborted) throw new DOMException('Canceled', 'AbortError');

      hub.dataset.printReady = 'true';
      hub.querySelectorAll('[data-print-lesson-link]').forEach(function (link) {
        link.href = '#' + link.href.split('#')[1];
      });
      controls.start.hidden = true;
      controls.cancel.hidden = true;
      controls.progress.hidden = true;
      controls.print.hidden = false;
      announce('Complete book ready: ' + controls.output.querySelectorAll('.print-book-lesson').length + ' lessons. Choose Print complete book to save a PDF.', controls.status);
    } catch (error) {
      resetFull(controls);
      announce(error && error.name === 'AbortError'
        ? 'Preparation canceled. You can print a chapter instead.'
        : (error instanceof Error ? error.message : 'Could not prepare the complete book.'), controls.status);
    } finally {
      fullRun = null;
    }
  }

  function cancelFullBook() {
    if (fullRun) fullRun.abort();
  }

  function open() {
    if (hub) {
      hub.querySelector('[data-print-prepare-full]')?.focus();
    } else if (chapterPage) {
      printChapter();
    } else if (/\/pages\/\d+\/\d+\/?$/.test(location.pathname)) {
      printLesson();
    } else {
      location.assign(optionsUrl);
    }
  }

  window.AcademyPrint = Object.freeze({
    open: open,
    printLesson: printLesson,
    printChapter: printChapter,
    openOptions: function () { location.assign(optionsUrl); },
    openChapter: function (number) { location.assign(chapterUrl(number)); },
    prepareFullBook: prepareFullBook,
    cancelFullBook: cancelFullBook,
  });

  if (hub) {
    hub.querySelector('[data-print-prepare-full]')?.addEventListener('click', prepareFullBook);
    hub.querySelector('[data-print-cancel]')?.addEventListener('click', cancelFullBook);
    hub.querySelector('[data-print-full-now]')?.addEventListener('click', function () {
      if (hub.dataset.printReady === 'true') window.print();
    });
    // Preserve old /print/#lesson-N-N links without loading every chapter.
    var anchoredLesson = location.hash.match(/^#lesson-(\d+)-(\d+)$/);
    if (anchoredLesson) location.replace(chapterUrl(anchoredLesson[1]) + location.hash);
  }
  if (chapterPage) {
    chapterPage.querySelector('[data-print-current-chapter]')?.addEventListener('click', printChapter);
  }
})();
