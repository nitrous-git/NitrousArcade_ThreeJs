import { games, findGame } from './games/registry.js';
import { Storage } from './core/Storage.js';
import { Settings } from './core/Settings.js';
import { ScoreStore } from './core/ScoreStore.js';
import { AudioService } from './core/Audio.js';
import { GameHost } from './core/GameHost.js';

const $ = id => document.getElementById(id);
const storage = new Storage();
const settings = new Settings(storage);
const scores = new ScoreStore(storage);
const audio = new AudioService(settings);
let lastLauncher = $('launch-lab');
let lastEntry = findGame('signal-lab');
let currentScore = 0;
let toastTimer;
let hubScroll = 0;
let overlayAction = () => {};

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}

function setHud(data) {
  if (data.score !== undefined) { currentScore = data.score; $('score-value').textContent = String(data.score); }
  if (data.best !== undefined) $('best-value').textContent = String(data.best);
  if (data.label !== undefined) $('score-label').textContent = data.label;
}

function showOverlay({ kicker, title, description, action, label }) {
  $('stage-overlay').hidden = false;
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-description').textContent = description;
  $('overlay-primary').hidden = !action;
  $('overlay-primary').textContent = label || '';
  overlayAction = action || (() => {});
  if (!$('settings-dialog').open) $('overlay-title').focus({ preventScroll: true });
}

const host = new GameHost({
  mount: $('stage'), settings, audio, scores,
  onHud: setHud,
  onState(state, detail) {
    const inPlayer = state !== 'menu';
    $('hub').hidden = inPlayer;
    $('player').hidden = !inPlayer;
    document.body.classList.toggle('playing-shell', inPlayer);
    $('stage-overlay').hidden = state === 'playing' || state === 'menu';
    $('pause-game').disabled = !['playing', 'paused'].includes(state);
    $('pause-game').textContent = state === 'paused' ? 'Resume' : 'Pause';
    $('restart-game').disabled = !['playing', 'paused', 'finished'].includes(state);
    $('finish-test').disabled = state !== 'playing';
    const canvas = $('stage').querySelector('canvas');
    if (canvas) canvas.tabIndex = state === 'playing' ? 0 : -1;
    if (detail.entry) {
      $('player-title').textContent = detail.entry.title;
      $('player-category').textContent = detail.entry.category === 'sandbox' ? 'PLAYGROUND' : detail.entry.category.toUpperCase();
      $('stage-controls').textContent = detail.entry.controls;
      $('finish-test').hidden = detail.entry.id !== 'signal-lab';
    }
    if (state === 'loading') showOverlay({ kicker: 'GETTING READY', title: 'Tuning in.', description: 'Loading the scene and its rendering modules.' });
    if (state === 'paused') showOverlay({ kicker: 'TAKE A BREATH', title: 'Paused.', description: 'Your place is right here. Resume when you’re ready.', label: 'Resume ↗', action: () => host.resume() });
    if (state === 'finished') showOverlay({ kicker: detail.record ? 'NEW LOCAL BEST' : 'SESSION COMPLETE', title: detail.entry.id === 'signal-lab' ? 'Signal received.' : 'Round complete.', description: `${detail.entry.scoreLabel || 'Score'}: ${detail.score}. Personal best: ${detail.best}.`, label: 'Try again ↗', action: () => host.restart() });
    if (state === 'menu') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      window.scrollTo({ top: hubScroll, behavior: 'instant' });
      if (lastLauncher?.isConnected && !lastLauncher.closest('[hidden]') && !lastLauncher.closest('dialog')) lastLauncher.focus({ preventScroll: true });
      else $('launch-lab').focus({ preventScroll: true });
    }
  },
  onError(error) {
    showOverlay({ kicker: 'SCENE UNAVAILABLE', title: 'Let’s try again.',
      description: error.message.includes('context was lost') ? error.message : 'The scene could not start. Check your connection and browser WebGL support, then retry. Details are in the browser console.',
      label: 'Retry ↗', action: () => launch(lastEntry) });
  },
});

function launch(entry, trigger = document.activeElement) {
  if (host.state === 'menu') hubScroll = window.scrollY;
  lastLauncher = trigger;
  lastEntry = entry;
  void audio.unlock();
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Start without waiting for audio permission / context activation.
  void host.launch(entry).then(started => {
    if (started && (document.hidden || !document.hasFocus() || $('settings-dialog').open || $('about-dialog').open)) host.pause();
  });
}

const tint = { bricks: '#184e4750', pong: '#22404c60', snake: '#2c493050', blocks: '#40315360', ship: '#48332560', maze: '#45343a60' };
function renderCollection(filter = 'all') {
  const list = games.filter(game => game.category !== 'sandbox' && (filter === 'all' || game.category === filter));
  $('game-grid').replaceChildren();
  for (const entry of list) {
    const card = document.createElement('button');
    card.className = 'game-card';
    card.setAttribute('aria-label', `${entry.title} — ${entry.status === 'ready' ? 'Play' : 'Planned game details'}`);
    const index = String(games.indexOf(entry)).padStart(2, '0');
    // Registry metadata is developer-authored, never user input.
    card.innerHTML = `<div class="card-art" style="--tint:${tint[entry.art] || '#193e4050'}"><img src="./assets/art/${entry.art}.svg" alt="" width="400" height="200"><span class="card-index">${index}</span><span class="planned-pill">${entry.status === 'ready' ? 'PLAY NOW' : 'PLANNED'}</span></div><div class="card-body"><div class="card-heading"><h3>${entry.title}</h3><span class="card-arrow" aria-hidden="true">↗</span></div><p class="card-description">${entry.description}</p><div class="card-footer"><span>${entry.category.toUpperCase()}</span><span>${entry.status === 'ready' ? 'READY TO PLAY' : 'ON THE HORIZON'}</span></div></div>`;
    card.addEventListener('click', () => entry.status === 'ready' ? launch(entry, card) : openDetails(entry));
    $('game-grid').append(card);
  }
  const ready = list.filter(game => game.status === 'ready').length;
  $('collection-count').textContent = `${String(list.length).padStart(2, '0')} GAMES · ${ready} READY`;
}

function openDetails(entry) {
  $('details-title').textContent = entry.title;
  $('details-description').textContent = entry.description;
  $('details-kicker').textContent = `${entry.category.toUpperCase()} / PLANNED`;
  const art = document.createElement('img');
  art.src = `./assets/art/${entry.art}.svg`; art.alt = '';
  $('details-art').replaceChildren(art);
  $('details-dialog').showModal();
}

function openDialog(id) {
  host.pause();
  $(id).showModal();
}

function applySettings(value) {
  $('volume').value = Math.round(value.volume * 100);
  $('volume-output').textContent = `${Math.round(value.volume * 100)}%`;
  $('muted').checked = value.muted;
  $('quality').value = value.quality;
  $('bloom').checked = value.bloom;
  $('bloom').disabled = value.quality === 'low';
  $('reduced-motion').checked = value.reducedMotion;
  $('mute-button').setAttribute('aria-pressed', String(value.muted));
  $('mute-button').setAttribute('aria-label', value.muted ? 'Enable sound' : 'Mute sound');
  $('mute-button').textContent = value.muted ? '♪̸' : '♪';
  document.documentElement.dataset.reducedMotion = String(value.reducedMotion);
  $('storage-note').textContent = storage.persistent ? 'Settings and records stay in this browser.' : 'Browser storage is unavailable. Changes last for this visit only.';
}

renderCollection();
applySettings(settings.snapshot);
settings.subscribe(applySettings);

for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => {
  for (const item of document.querySelectorAll('[data-filter]')) {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  }
  renderCollection(button.dataset.filter);
});
for (const id of ['launch-lab', 'launch-lab-bottom']) $(id).addEventListener('click', () => launch(findGame('signal-lab'), $(id)));
$('details-lab').addEventListener('click', () => { $('details-dialog').close(); launch(findGame('signal-lab'), $('launch-lab')); });
$('settings-button').addEventListener('click', () => { applySettings(settings.snapshot); openDialog('settings-dialog'); });
$('player-settings').addEventListener('click', () => { applySettings(settings.snapshot); openDialog('settings-dialog'); });
$('about-button').addEventListener('click', () => openDialog('about-dialog'));
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
}
$('volume').addEventListener('input', event => settings.update({ volume: Number(event.target.value) / 100 }));
$('volume').addEventListener('change', async () => { await audio.unlock(); audio.tone(600, 0.1); });
$('muted').addEventListener('change', event => settings.update({ muted: event.target.checked }));
$('bloom').addEventListener('change', event => settings.update({ bloom: event.target.checked }));
$('reduced-motion').addEventListener('change', event => settings.update({ reducedMotion: event.target.checked }));
$('quality').addEventListener('change', event => settings.update({ quality: event.target.value }));
$('mute-button').addEventListener('click', () => { void audio.unlock(); settings.update({ muted: !settings.snapshot.muted }); });
let clearArmed = false;
$('clear-records').addEventListener('click', () => {
  if (!clearArmed) {
    clearArmed = true;
    $('clear-records').textContent = 'Confirm clear records';
    return;
  }
  scores.clear();
  setHud({ best: 0 });
  clearArmed = false;
  $('clear-records').textContent = 'Clear local records';
  $('storage-note').textContent = 'Local records cleared. Your settings are unchanged.';
});
$('settings-dialog').addEventListener('close', () => {
  clearArmed = false; $('clear-records').textContent = 'Clear local records';
});
$('pause-game').addEventListener('click', () => host.state === 'paused' ? host.resume() : host.pause());
$('restart-game').addEventListener('click', () => host.restart());
$('exit-game').addEventListener('click', () => host.leave());
$('overlay-secondary').addEventListener('click', () => host.leave());
$('overlay-primary').addEventListener('click', () => { void audio.unlock(); overlayAction(); });
$('finish-test').addEventListener('click', () => host.finish(currentScore));
$('fullscreen-game').disabled = !document.fullscreenEnabled;
$('fullscreen-game').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('player').requestFullscreen();
  } catch { toast('Fullscreen is not available in this browser.'); }
});
document.addEventListener('fullscreenchange', () => {
  $('fullscreen-game').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  host.resize();
});
document.querySelector('.brand').addEventListener('click', event => {
  if (host.state !== 'menu') { event.preventDefault(); host.leave(); }
});
window.addEventListener('keydown', event => {
  if (event.repeat || event.defaultPrevented || document.querySelector('dialog[open]')) return;
  if (event.code === 'Escape' && ['playing', 'paused'].includes(host.state)) {
    event.preventDefault();
    host.state === 'playing' ? host.pause() : host.resume();
  }
});
window.addEventListener('blur', () => host.pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) host.pause(); });
const resizeObserver = new ResizeObserver(() => host.resize());
resizeObserver.observe($('stage'));
window.addEventListener('resize', () => host.resize());
window.addEventListener('pagehide', () => { host.leave(); audio.stopAll(); });

if (location.protocol === 'file:') $('boot-error').hidden = false;
