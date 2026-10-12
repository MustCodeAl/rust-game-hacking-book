// Printing is deliberately scoped. A lesson prints from its current DOM;
// /print/ fetches chapter documents only after the reader requests the book.
(function () {
  interface AcademyPrintApi {
    open(): void;
    printLesson(): void;
    printChapter(): void;
    openOptions(): void;
    openChapter(number: number | string): void;
    prepareFullBook(): Promise<void>;
    cancelFullBook(): void;
  }
  // The controls of the complete-book hub (src/pages/print.astro).
  interface FullBookControls {
    start: HTMLButtonElement;
    cancel: HTMLButtonElement;
    print: HTMLButtonElement;
    progress: HTMLProgressElement;
    status: HTMLElement;
    output: HTMLElement;
  }
  // AcademyPrint is published here; academyRenderAllDiagrams is set by mermaid-loader.js.
  type PrintWindow = Window & {
    AcademyPrint?: Readonly<AcademyPrintApi>;
    academyRenderAllDiagrams?: () => Promise<unknown>;
  };

  const printHost: PrintWindow = window;
  if (printHost.AcademyPrint) return;

  var script = document.currentScript;
  var scriptPath = script instanceof HTMLScriptElement ? new URL(script.src, document.baseURI).pathname : '';
  var base = scriptPath.replace(/\/scripts\/print-book\.js$/, '');
  var optionsUrl = base + '/print/';
  const hub = document.querySelector<HTMLElement>('[data-print-hub]');
  const chapterPage = document.querySelector<HTMLElement>('[data-print-chapter-page]');
  var fullRun: AbortController | null = null;

  function chapterUrl(number: number | string): string {
    var parsed = Number(number);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 14) {
      throw new Error('Choose a chapter number from 1 to 14.');
    }
    return base + '/print/chapter/' + parsed + '/';
  }

  function announce(message: string, target?: HTMLElement | null): HTMLElement {
    var status = target || document.querySelector<HTMLElement>('[data-print-status]');
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

  function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new DOMException('Canceled', 'AbortError'));
    return new Promise<T>(function (resolve, reject) {
      function onAbort() {
        reject(new DOMException('Canceled', 'AbortError'));
      }
      signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(promise).then(
        function (value) {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        function (error: unknown) {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );
    });
  }

  async function waitForDiagramRenderer(signal?: AbortSignal): Promise<() => Promise<unknown>> {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (printHost.academyRenderAllDiagrams) return printHost.academyRenderAllDiagrams;
      await withAbort(new Promise<void>(function (resolve) { setTimeout(resolve, 50); }), signal);
    }
    throw new Error('The diagram renderer did not become ready. Try reloading the page.');
  }

  function waitForImage(image: HTMLImageElement): Promise<void> {
    if (image.complete) return Promise.resolve();
    return new Promise<void>(function (resolve) {
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

  async function prepareVisuals(root: ParentNode, status?: HTMLElement | null, signal?: AbortSignal): Promise<void> {
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

    var diagrams = root.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed="true"])');
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

  function visualsAlreadyReady(root: ParentNode): boolean {
    return !root.querySelector('pre.mermaid:not([data-processed="true"])') &&
      !Array.from(root.querySelectorAll('img')).some(function (image) {
        return !image.complete || image.naturalWidth === 0;
      });
  }

  async function printCurrent(root: ParentNode | null, status?: HTMLElement | null): Promise<void> {
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

  function printLesson(): void {
    if (!/\/pages\/\d+\/\d+\/?$/.test(location.pathname)) {
      location.assign(optionsUrl);
      return;
    }
    printCurrent(document.querySelector('.sl-markdown-content') || document.body);
  }

  function printChapter(): void {
    if (!chapterPage) {
      location.assign(optionsUrl);
      return;
    }
    printCurrent(chapterPage.querySelector<HTMLElement>('[data-print-chapter-content]'), chapterPage.querySelector<HTMLElement>('[data-print-status]'));
  }

  function copyPrintStyles(parsed: Document, sourceUrl: string): Promise<Error | null>[] {
    var existing = new Set(Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(function (link) { return link.href; }));
    var inline = new Set(Array.from(document.head.querySelectorAll('style')).map(function (style) { return style.textContent; }));
    var pending: Promise<Error | null>[] = [];
    parsed.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach(function (source) {
      var sourceHref = source.getAttribute('href');
      if (sourceHref === null) return;
      var href = new URL(sourceHref, sourceUrl).href;
      if (existing.has(href) || new URL(href).origin !== location.origin) return;
      existing.add(href);
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = source.media || 'all';
      // Observe failures immediately: chapters keep loading before we wait for
      // all styles, and an early rejection must not become unhandled.
      pending.push(new Promise<Event>(function (resolve, reject) {
        link.onload = resolve;
        link.onerror = function () { reject(new Error('A chapter stylesheet could not load.')); };
      }).then(
        function () { return null; },
        function (error: Error) { return error; }
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

  function resetFull(hubElements: FullBookControls): void {
    if (!hub) return;
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

  function fullBookControls(root: HTMLElement): FullBookControls | null {
    var start = root.querySelector<HTMLButtonElement>('[data-print-prepare-full]');
    var cancel = root.querySelector<HTMLButtonElement>('[data-print-cancel]');
    var print = root.querySelector<HTMLButtonElement>('[data-print-full-now]');
    var progress = root.querySelector<HTMLProgressElement>('[data-print-progress]');
    var status = root.querySelector<HTMLElement>('[data-print-status]');
    var output = root.querySelector<HTMLElement>('[data-print-output]');
    if (!start || !cancel || !print || !progress || !status || !output) return null;
    return { start: start, cancel: cancel, print: print, progress: progress, status: status, output: output };
  }

  function isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
  }

  async function prepareFullBook(): Promise<void> {
    if (!hub || fullRun) return;
    var controls = fullBookControls(hub);
    if (!controls) return;
    var routes = Array.from(hub.querySelectorAll<HTMLAnchorElement>('[data-print-chapter-route]'));
    var controller = new AbortController();
    var styles: Promise<Error | null>[] = [];
    fullRun = controller;
    resetFull(controls);
    controls.start.disabled = true;
    controls.cancel.hidden = false;
    controls.progress.hidden = false;
    controls.progress.max = routes.length;

    try {
      for (var [index, route] of routes.entries()) {
        announce('Loading chapter ' + (index + 1) + ' of ' + routes.length + '…', controls.status);
        var response = await fetch(route.href, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Chapter ' + route.dataset.printChapterRoute + ' could not load (' + response.status + ').');
        var html = await response.text();
        if (controller.signal.aborted) throw new DOMException('Canceled', 'AbortError');
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var section = parsed.querySelector<HTMLElement>('[data-print-chapter-content]');
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
      hub.querySelectorAll<HTMLAnchorElement>('[data-print-lesson-link]').forEach(function (link) {
        link.href = '#' + link.href.split('#')[1];
      });
      controls.start.hidden = true;
      controls.cancel.hidden = true;
      controls.progress.hidden = true;
      controls.print.hidden = false;
      announce('Complete book ready: ' + controls.output.querySelectorAll('.print-book-lesson').length + ' lessons. Choose Print complete book to save a PDF.', controls.status);
    } catch (error) {
      resetFull(controls);
      announce(isAbortError(error)
        ? 'Preparation canceled. You can print a chapter instead.'
        : (error instanceof Error ? error.message : 'Could not prepare the complete book.'), controls.status);
    } finally {
      fullRun = null;
    }
  }

  function cancelFullBook(): void {
    if (fullRun) fullRun.abort();
  }

  function open(): void {
    if (hub) {
      hub.querySelector<HTMLElement>('[data-print-prepare-full]')?.focus();
    } else if (chapterPage) {
      printChapter();
    } else if (/\/pages\/\d+\/\d+\/?$/.test(location.pathname)) {
      printLesson();
    } else {
      location.assign(optionsUrl);
    }
  }

  printHost.AcademyPrint = Object.freeze<AcademyPrintApi>({
    open: open,
    printLesson: printLesson,
    printChapter: printChapter,
    openOptions: function () { location.assign(optionsUrl); },
    openChapter: function (number: number | string): void { location.assign(chapterUrl(number)); },
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
    var anchoredChapter = location.hash.match(/^#lesson-(\d+)-(\d+)$/)?.[1];
    if (anchoredChapter !== undefined) location.replace(chapterUrl(anchoredChapter) + location.hash);
  }
  if (chapterPage) {
    chapterPage.querySelector('[data-print-current-chapter]')?.addEventListener('click', printChapter);
  }
})();
