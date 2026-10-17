import { STAGES } from './layouts.js';
import { POWERUPS } from './powerups.js';

export class BrickBreakerHud {
  constructor(mount, scope) {
    this.root = document.createElement('div'); this.root.className = 'bb-hud';
    this.root.innerHTML = `
      <div class="bb-top"><span class="bb-run-label">ARCADE RUN <i></i> <b data-stage>01 / 08</b></span>
        <div class="bb-stats"><span>BRICKS <b data-bricks>60</b></span><span>BALLS <b data-balls>01</b></span><span class="bb-life-label">LIVES <b data-lives>● ● ●</b></span></div></div>
      <aside class="bb-side bb-left"><div class="bb-wordmark">BRICK BREAKER<span>SHATTER THE GRID</span></div>
        <div class="bb-stage-number" data-number>01</div><p class="bb-kicker" data-family>GRID</p><h2 data-name>First Contact</h2><p class="bb-stage-description" data-subtitle></p>
        <div class="bb-route">${STAGES.map((s, i) => `<div data-route="${i}"><span>${String(i + 1).padStart(2, '0')}</span><i></i><b>${s.name}</b></div>`).join('')}</div>
      </aside>
      <aside class="bb-side bb-right"><p class="bb-kicker">CATCH THE ADVANTAGE</p><h3>Power your run<span>.</span></h3>
        <div class="bb-guide">${Object.entries(POWERUPS).map(([kind, p]) => `<div style="--power:${p.color}"><span>${p.code}</span><div><b>${p.label}</b><small>${p.description}</small></div></div>`).join('')}</div>
        <p class="bb-legend"><i></i> Amber bricks explode.<br><span>Connect the chain. Multiply the score.</span></p>
      </aside>
      <div class="bb-combo" data-combo hidden><b>×1</b><span>CHAIN</span></div>
      <div class="bb-message" data-message role="status" aria-live="polite"><p data-message-kicker></p><h3 data-message-title></h3><span data-message-detail></span></div>
      <div class="bb-bottom"><div class="bb-effects" data-effects></div><p data-hint>MOVE TO AIM <span>·</span> CLICK / SPACE TO LAUNCH</p></div>
      <div class="bb-toast" data-toast role="status" aria-live="polite" hidden></div>`;
    mount.append(this.root); scope.track(() => this.root.remove());
    this.nodes = {};
    for (const key of ['stage', 'bricks', 'balls', 'lives', 'number', 'family', 'name', 'subtitle', 'combo', 'message', 'message-kicker', 'message-title', 'message-detail', 'effects', 'hint', 'toast']) this.nodes[key] = this.root.querySelector(`[data-${key}]`);
    this.pills = {};
    for (const [kind, p] of Object.entries(POWERUPS)) {
      if (kind === 'multiball') continue;
      const pill = document.createElement('div'); pill.className = 'bb-effect'; pill.hidden = true;
      pill.style.setProperty('--power', p.color); pill.innerHTML = `<b>${p.code}</b><span>${p.label}</span><strong></strong><i></i>`;
      this.nodes.effects.append(pill); this.pills[kind] = pill;
    }
    this.lastMessage = ''; this.toastUntil = 0;
  }
  reset() { this.lastMessage = ''; this.toastUntil = 0; this.nodes.toast.hidden = true; }
  resize({ width, aspect }) { this.root.classList.toggle('bb-wide', aspect > 1.9 && width > 1000); this.root.classList.toggle('bb-small', width < 650); }
  handle(events, model) {
    for (const event of events) {
      if (event.type === 'powerup' || event.type === 'rescue') {
        this.nodes.toast.textContent = event.type === 'rescue' ? 'SAFETY NET · LAST BALL SAVED' : `${POWERUPS[event.kind].label.toUpperCase()} ONLINE`;
        this.nodes.toast.style.color = event.type === 'rescue' ? '#91f5d4' : POWERUPS[event.kind].color;
        this.nodes.toast.hidden = false; this.toastUntil = model.time + 2.4;
      }
    }
  }
  update(model) {
    const n = this.nodes;
    n.stage.textContent = `${String(model.stageIndex + 1).padStart(2, '0')} / 08`;
    n.number.textContent = String(model.stageIndex + 1).padStart(2, '0');
    n.family.textContent = model.stage.family; n.name.textContent = model.stage.name; n.subtitle.textContent = model.stage.subtitle;
    n.bricks.textContent = String(model.remaining).padStart(2, '0'); n.balls.textContent = String(model.balls.length).padStart(2, '0');
    n.lives.textContent = '● '.repeat(model.lives) + '○ '.repeat(3 - model.lives); n.lives.setAttribute('aria-label', `${model.lives} lives`);
    for (const item of this.root.querySelectorAll('[data-route]')) { item.classList.toggle('current', Number(item.dataset.route) === model.stageIndex); item.classList.toggle('complete', Number(item.dataset.route) < model.stageIndex); }
    n.combo.hidden = model.combo < 2 || model.status !== 'playing';
    n.combo.querySelector('b').textContent = `×${model.multiplier}`;
    n.combo.querySelector('span').textContent = `${model.combo} CHAIN`;
    for (const [kind, pill] of Object.entries(this.pills)) {
      const time = model.effects[kind] || 0, safety = kind === 'safety' && model.safety;
      pill.hidden = !time && !safety;
      pill.querySelector('strong').textContent = safety ? '1' : `${Math.ceil(time)}s`;
      pill.style.setProperty('--remaining', `${safety ? 100 : time / POWERUPS[kind].duration * 100}%`);
    }
    const held = model.balls.some(b => b.heldByMagnet);
    const message = model.status === 'serve' ? (model.lives === 3 ? 'ready' : 'retry') : model.status === 'clearing' ? 'clear' : held ? 'held' : '';
    if (this.lastMessage !== `${message}:${model.stageIndex}`) {
      this.lastMessage = `${message}:${model.stageIndex}`; n.message.hidden = !message;
      if (message) {
        const content = message === 'clear' ? ['PATTERN COMPLETE', model.stageIndex === 7 ? 'Reactor offline.' : 'Beautifully broken.', 'Stage bonus secured.']
          : message === 'held' ? ['MAGNET LOCK', 'Take your shot.', 'Click or Space to release · auto-release in 5s']
          : [message === 'retry' ? 'STAY IN THE GAME' : `STAGE ${String(model.stageIndex + 1).padStart(2, '0')}`, model.stage.name, 'Click, tap, or Space to launch.'];
        n['message-kicker'].textContent = content[0]; n['message-title'].textContent = content[1]; n['message-detail'].textContent = content[2];
      }
    }
    n.hint.textContent = model.status === 'serve' || held ? 'MOVE TO AIM · CLICK / TAP / SPACE TO LAUNCH' : 'MOUSE / A D / ← → TO MOVE · DRAG ON TOUCH';
    if (model.time > this.toastUntil) n.toast.hidden = true;
  }
}
