// Each diagram owns its position and timer. Motion starts only after Play.
const initialized = new WeakSet();
const STEP_TIMES = { slow: 6000, normal: 4000, fast: 2000 };

export function initializeAnimatedFlows(scope) {
  scope.querySelectorAll('[data-animated-flow]').forEach(initializeFlow);
}

function initializeFlow(root) {
  if (initialized.has(root)) return;
  const stages = Array.from(root.querySelectorAll('[data-flow-stage]'));
  const selections = stages.map((stage) => stage.querySelector('[data-flow-select]'));
  const controls = root.querySelector('[data-flow-controls]');
  const explanation = root.querySelector('[data-flow-explanation]');
  const position = root.querySelector('[data-flow-position]');
  const label = root.querySelector('[data-flow-active-label]');
  const detail = root.querySelector('[data-flow-active-detail]');
  const value = root.querySelector('[data-flow-active-value]');
  const diagramNodes = Array.from(root.querySelectorAll('[data-flow-diagram-node]'));
  const diagramEdges = Array.from(root.querySelectorAll('[data-flow-diagram-edge]'));
  const native = root.dataset.flowNative === 'true';
  const nodeGroups = stages.map((stage) => (stage.dataset.flowNodes || '').split('|').filter(Boolean));
  const state = root.querySelector('[data-flow-state]');
  const announcement = root.querySelector('[data-flow-announcement]');
  const previous = root.querySelector('[data-flow-action="previous"]');
  const play = root.querySelector('[data-flow-action="play"]');
  const next = root.querySelector('[data-flow-action="next"]');
  const reset = root.querySelector('[data-flow-action="reset"]');
  const progressTrack = root.querySelector('[data-flow-progress-track]');
  const progress = root.querySelector('[data-flow-progress]');
  if (!stages.length || !controls || !explanation || !position || !label || !detail || !state || !announcement || !previous || !play || !next || !reset || selections.some((button) => !button)) return;
  initialized.add(root);

  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let running = false;
  let timer;

  function motionChoice() { return doc.documentElement.dataset.academyMotion || 'system'; }
  function stepTime() { return STEP_TIMES[doc.documentElement.dataset.academyAnimationSpeed] || STEP_TIMES.normal; }
  function motionAllowed() { return motionChoice() !== 'off' && (motionChoice() === 'onrequest' || !reducedMotion.matches); }

  function renderNative() {
    const scene = root.querySelector('[data-flow-scene]');
    if (!scene) return;
    const keys = nodeGroups[current];
    const upcoming = nodeGroups[current + 1] || [];
    const completed = nodeGroups.slice(0, current).flat();
    scene.querySelectorAll('[data-diagram-node-key]').forEach((node) => {
      const key = node.dataset.diagramNodeKey;
      const stageIndex = nodeGroups.findIndex((group) => group.includes(key));
      if (stageIndex < 0) return;
      node.dataset.flowRole = stages[stageIndex].dataset.flowRole || 'process';
      node.dataset.diagramState = keys.includes(key) ? 'current' : completed.includes(key) ? 'done' : 'next';
    });
    scene.querySelectorAll('[data-diagram-from][data-diagram-to]').forEach((edge) => {
      const { diagramFrom: from, diagramTo: to } = edge.dataset;
      const fromIndex = nodeGroups.findIndex((group) => group.includes(from));
      const toIndex = nodeGroups.findIndex((group) => group.includes(to));
      const route = fromIndex >= 0 && toIndex >= 0 && (toIndex === fromIndex || toIndex === fromIndex + 1);
      edge.dataset.flowRole = fromIndex >= 0 ? stages[fromIndex].dataset.flowRole || 'process' : 'process';
      edge.dataset.passed = String(route && fromIndex < current && toIndex <= current);
      edge.dataset.moving = String(route && running && keys.includes(from) && (keys.includes(to) || upcoming.includes(to)));
    });
  }

  function stopTimer() {
    if (timer !== undefined) view.clearTimeout(timer);
    timer = undefined;
  }

  function render(announce = false) {
    const stage = stages[current];
    const currentLabel = stage.querySelector('[data-flow-label]').textContent;
    const currentDetail = stage.querySelector('[data-flow-detail]').textContent;
    const currentValue = stage.querySelector('[data-flow-value]')?.textContent || '';
    stages.forEach((item, index) => {
      const selected = index === current;
      item.dataset.active = String(selected);
      selections[index].tabIndex = selected ? 0 : -1;
      if (selected) selections[index].setAttribute('aria-current', 'step');
      else selections[index].removeAttribute('aria-current');
      item.querySelector('[data-flow-current]').hidden = !selected;
    });
    diagramNodes.forEach((node, index) => {
      node.dataset.diagramState = index === current ? 'current' : index < current ? 'done' : 'next';
      const status = node.querySelector('[data-flow-diagram-status]');
      if (status) status.textContent = index === current ? 'Current' : index < current ? 'Done' : 'Next';
    });
    diagramEdges.forEach((edge, index) => {
      edge.dataset.passed = String(index < current);
      edge.dataset.moving = String(running && index === current);
    });
    if (native) renderNative();
    root.dataset.running = String(running);
    root.dataset.flowMotion = String(motionAllowed());
    root.style.setProperty('--diagram-step-duration', `${stepTime()}ms`);
    explanation.dataset.flowRole = stage.dataset.flowRole || 'process';
    if (progress) {
      progress.dataset.flowRole = stage.dataset.flowRole || 'process';
      progress.style.width = `${((current + 1) / stages.length) * 100}%`;
    }
    position.textContent = `Step ${current + 1} of ${stages.length}`;
    label.textContent = currentLabel;
    detail.textContent = currentDetail;
    if (value) {
      value.textContent = currentValue;
      value.hidden = !currentValue;
    }
    previous.disabled = current === 0;
    next.disabled = current === stages.length - 1;
    play.disabled = motionChoice() === 'off' || stages.length < 2;
    play.textContent = running ? 'Pause' : current === stages.length - 1 ? 'Play again' : 'Play';
    state.textContent = motionChoice() === 'off'
      ? 'Playback is off in Reader theme. Use Next step or select a step.'
      : running
        ? `Playing${motionAllowed() ? '' : ' without moving effects'}. Each step lasts ${stepTime() / 1000} seconds; pause to read at your own pace.`
        : current === stages.length - 1
          ? 'Final step. Select an earlier step or play again.'
          : `Paused. Play the sequence or move one step at a time.${!motionAllowed() ? ' Moving effects follow your device’s reduced-motion setting.' : ''}`;
    // Automatic playback must not repeatedly interrupt a screen reader.
    if (announce) announcement.textContent = `Step ${current + 1} of ${stages.length}: ${currentLabel}. ${currentValue ? `${currentValue}. ` : ''}${currentDetail}`;
  }

  function pause(announce = false) {
    running = false;
    stopTimer();
    render(announce);
  }

  function select(index, focus = false) {
    current = Math.max(0, Math.min(stages.length - 1, index));
    pause(true);
    if (focus) selections[current].focus();
  }

  function schedule() {
    stopTimer();
    timer = view.setTimeout(() => {
      timer = undefined;
      if (!root.isConnected || doc.hidden || motionChoice() === 'off') {
        pause();
        return;
      }
      current += 1;
      if (current === stages.length - 1) running = false;
      render();
      if (running) schedule();
    }, stepTime());
  }

  previous.addEventListener('click', () => select(current - 1));
  next.addEventListener('click', () => select(current + 1));
  reset.addEventListener('click', () => select(0));
  play.addEventListener('click', () => {
    if (motionChoice() === 'off' || stages.length < 2) return;
    if (running) {
      pause(true);
      return;
    }
    if (current === stages.length - 1) current = 0;
    running = true;
    render();
    schedule();
  });
  selections.forEach((button, index) => {
    button.disabled = false;
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', (event) => {
      const destinations = {
        ArrowLeft: current - 1,
        ArrowUp: current - 1,
        ArrowRight: current + 1,
        ArrowDown: current + 1,
        Home: 0,
        End: stages.length - 1,
      };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      select(destinations[event.key], true);
    });
  });

  const onVisibility = () => { if (doc.hidden) pause(); };
  const onMotion = () => render();
  const onPreference = () => {
    if (motionChoice() === 'off') pause();
    else {
      render();
      if (running) schedule();
    }
  };
  const onDiagram = () => renderNative();
  const onPrint = () => pause();
  doc.addEventListener('visibilitychange', onVisibility);
  view.addEventListener('beforeprint', onPrint);
  reducedMotion.addEventListener('change', onMotion);
  doc.addEventListener('academy:reader-preference', onPreference);
  root.addEventListener('academy:diagram-ready', onDiagram);
  const observer = view.IntersectionObserver && new view.IntersectionObserver((entries) => {
    if (entries.some((entry) => !entry.isIntersecting)) pause();
  });
  if (observer) observer.observe(root);
  doc.addEventListener('astro:before-swap', () => {
    stopTimer();
    if (observer) observer.disconnect();
    doc.removeEventListener('visibilitychange', onVisibility);
    view.removeEventListener('beforeprint', onPrint);
    reducedMotion.removeEventListener('change', onMotion);
    doc.removeEventListener('academy:reader-preference', onPreference);
    root.removeEventListener('academy:diagram-ready', onDiagram);
  }, { once: true });

  controls.hidden = false;
  explanation.hidden = false;
  if (progressTrack && progress) progressTrack.hidden = false;
  root.classList.add('is-ready');
  render();
}
