import { ITEMS } from './item-data.js';

const byId = new Map(ITEMS.map(item => [item.id, item]));
const keys = ['1', '2', '3', '5', '6', '7'];
const category = item => item.active === 'heal' || item.active === 'ward' ? 'consumables' : item.component ? 'components' : 'equipment';

export class ShopView {
  constructor(getGame, baseUrl, onChange) {
    this.getGame = getGame;
    this.baseUrl = baseUrl;
    this.onChange = onChange;
    this.selectedSlot = -1;
    this.filter = 'equipment';
    this.items = document.getElementById('shop-items');
    this.inventory = document.getElementById('shop-inventory');
    this.filters = document.getElementById('shop-filters');
    this.sell = document.getElementById('sell-item');
    this.sell.addEventListener('click', () => {
      if (this.getGame().sell(this.selectedSlot)) this.onChange();
      this.update();
    });
    this.filters.innerHTML = [['equipment', '成装与出门装'], ['components', '合成散件'], ['consumables', '药水与守卫'], ['all', '全部']].map(([id, name]) => `<button data-filter="${id}" aria-pressed="false">${name}</button>`).join('');
    this.filters.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      this.filter = button.dataset.filter;
      this.applyFilter();
    });
    this.items.innerHTML = ITEMS.map(item => {
      const recipe = (item.recipe || []).map(id => byId.get(id)?.name || id).join(' + ');
      return `<button class="item-card" data-item="${item.id}" data-category="${category(item)}"><span class="shop-item-icon"><img src="${baseUrl}assets/item-${item.id}.png" alt="" draggable="false"></span><span class="shop-item-info"><strong>${item.name}</strong><small>${item.description}</small>${recipe ? `<span class="item-recipe">合成：${recipe}</span>` : ''}<span class="item-pricing"><span class="item-cost"></span><del class="item-full-cost"></del></span><span class="item-owned"></span><span class="item-buy-state"></span></span></button>`;
    }).join('');
    this.items.addEventListener('click', event => {
      const button = event.target.closest('[data-item]');
      if (!button) return;
      if (this.getGame().buy(button.dataset.item)) this.onChange();
      this.update();
    });
    this.inventory.innerHTML = keys.map((key, index) => `<button class="shop-slot" data-slot="${index}" aria-label="装备栏 ${key}"><span class="shop-slot-icon"></span><kbd>${key}</kbd><span class="shop-slot-count"></span></button>`).join('');
    this.inventory.addEventListener('click', event => {
      const button = event.target.closest('[data-slot]');
      if (!button) return;
      this.selectedSlot = Number(button.dataset.slot);
      this.update();
    });
    this.applyFilter();
  }

  applyFilter() {
    for (const button of this.filters.children) {
      const active = button.dataset.filter === this.filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const button of this.items.children) button.classList.toggle('hidden', this.filter !== 'all' && button.dataset.category !== this.filter);
  }

  render() { this.update(); }

  update() {
    const game = this.getGame(), hero = game.player;
    if (!game.quoteBuy) return;
    document.getElementById('shop-gold').textContent = Math.floor(hero.gold).toLocaleString();
    for (const button of this.items.children) {
      const quote = game.quoteBuy(button.dataset.item);
      const item = byId.get(button.dataset.item);
      button.disabled = !quote.ok;
      button.classList.toggle('discounted', quote.discount > 0);
      button.querySelector('.item-cost').textContent = `${quote.cost ?? item.cost} 金币`;
      button.querySelector('.item-full-cost').textContent = quote.discount > 0 ? `${item.cost}` : '';
      const components = (quote.components || []).map(index => byId.get(hero.inventory[index]?.id)?.name).filter(Boolean);
      const owned = components.length ? `抵扣 ${quote.discount} · ${components.join('、')}` : '';
      button.querySelector('.item-owned').textContent = owned;
      button.querySelector('.item-buy-state').textContent = quote.ok ? '点击购买' : quote.reason;
      button.title = `${item.name}\n${item.description}\n${owned}\n${quote.ok ? '点击购买，自动合成已有散件' : quote.reason}`;
    }
    for (const button of this.inventory.children) {
      const index = Number(button.dataset.slot), slot = hero.inventory[index], item = byId.get(slot?.id);
      const icon = button.querySelector('.shop-slot-icon');
      if (button.dataset.item !== (slot?.id || '')) {
        button.dataset.item = slot?.id || '';
        icon.innerHTML = item ? `<img src="${this.baseUrl}assets/item-${item.id}.png" alt="${item.name}" draggable="false">` : '';
      }
      button.classList.toggle('selected', index === this.selectedSlot);
      button.querySelector('.shop-slot-count').textContent = slot?.count > 1 ? slot.count : '';
      button.title = item ? `${item.name} · 点击查看出售价格` : `空装备栏 [${keys[index]}]`;
      button.setAttribute('aria-pressed', String(index === this.selectedSlot));
      button.setAttribute('aria-label', item ? `装备栏 ${keys[index]}，${item.name}，数量 ${slot.count || 1}，点击查看出售价` : `空装备栏 ${keys[index]}`);
    }
    const slot = hero.inventory[this.selectedSlot], item = byId.get(slot?.id), quote = game.quoteSell(this.selectedSlot);
    document.getElementById('sell-name').textContent = item?.name || '选择要出售的装备';
    document.getElementById('sell-description').textContent = item ? item.description : '点击上方装备栏，查看属性与返还金币。';
    this.sell.disabled = !quote.ok;
    this.sell.textContent = item ? `出售${slot.count > 1 ? ' 1 个' : ''} · +${quote.refund ?? 0} 金币` : '出售装备';
    document.getElementById('sell-note').textContent = item ? quote.ok ? `返还原价 ${Math.round((quote.refund ?? 0) / item.cost * 100)}% · 出售后移除对应属性` : quote.reason : '成装返还 70%，多兰装备和消耗品返还 40%。';
    document.getElementById('shop-slot-summary').textContent = `${hero.inventory.filter(Boolean).length} / 6 栏位`;
  }
}
