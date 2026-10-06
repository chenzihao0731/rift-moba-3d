import { SUMMONER_SPELLS, getSummonerSpell, normalizeSummoners } from './summoner-spells.js';
import './summoner.css';

export class SummonerView {
  constructor({ loadout, base, onChange, notify }) {
    Object.assign(this, { loadout: normalizeSummoners(loadout), base, onChange, notify });
    this.slot = 'D';
    this.slots = document.getElementById('summoner-slots');
    this.catalog = document.getElementById('summoner-catalog');
    this.detail = document.getElementById('summoner-detail');
    this.slots.addEventListener('click', event => {
      const button = event.target.closest('[data-summoner-slot]');
      if (!button) return;
      this.slot = button.dataset.summonerSlot;
      this.render();
    });
    this.catalog.addEventListener('click', event => {
      const button = event.target.closest('[data-summoner-id]');
      if (button) this.select(button.dataset.summonerId);
    });
    this.catalog.addEventListener('pointerover', event => {
      const button = event.target.closest('[data-summoner-id]');
      if (button) this.describe(button.dataset.summonerId);
    });
    this.catalog.addEventListener('focusin', event => {
      const button = event.target.closest('[data-summoner-id]');
      if (button) this.describe(button.dataset.summonerId);
    });
    this.catalog.addEventListener('pointerleave', () => this.describe(this.loadout[this.slot]));
    this.render();
  }
  select(id) {
    if (!getSummonerSpell(id)) return;
    const other = this.slot === 'D' ? 'F' : 'D';
    if (this.loadout[other] === id) {
      this.loadout[other] = this.loadout[this.slot];
      this.notify('两个技能已交换按键');
    }
    this.loadout[this.slot] = id;
    this.onChange({ ...this.loadout });
    this.render();
  }
  describe(id) {
    const spell = getSummonerSpell(id);
    if (!spell) return;
    this.detail.innerHTML = `<strong>${spell.name}</strong><span>${spell.description}</span><small>冷却 ${spell.cooldown} 秒 · ${spell.targeting === 'self' ? '按键立即生效' : '朝目标施放'}${spell.id === 'teleport' ? ' · 小地图也可选择目标' : ''}</small>`;
  }
  render() {
    this.slots.innerHTML = ['D', 'F'].map(key => {
      const spell = getSummonerSpell(this.loadout[key]);
      return `<button class="summoner-choice ${key === this.slot ? 'active' : ''}" data-summoner-slot="${key}" aria-pressed="${key === this.slot}" aria-label="配置 ${key}，当前 ${spell.name}"><kbd>${key}</kbd><img src="${this.base}${spell.icon}" alt=""><span><strong>${spell.name}</strong><small>${key === this.slot ? '正在配置' : '点击更换'}</small></span></button>`;
    }).join('');
    this.catalog.innerHTML = SUMMONER_SPELLS.map(spell => {
      const selected = this.loadout[this.slot] === spell.id;
      const assigned = ['D', 'F'].find(key => this.loadout[key] === spell.id);
      return `<button class="summoner-pick ${selected ? 'selected' : ''}" data-summoner-id="${spell.id}" aria-pressed="${selected}" aria-label="${this.slot} 选择${spell.name}" title="${spell.name} · ${spell.description}"><img src="${this.base}${spell.icon}" alt=""><span>${spell.name}</span>${assigned ? `<kbd>${assigned}</kbd>` : ''}</button>`;
    }).join('');
    this.describe(this.loadout[this.slot]);
  }
}
