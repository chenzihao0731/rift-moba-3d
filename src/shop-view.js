import { ITEMS } from './item-data.js';
import './shop-polish.css';

const byId = new Map(ITEMS.map(item => [item.id, item]));
const keys = ['1', '2', '3', '5', '6', '7'];
const category = item => item.category === 'consumable' ? 'consumables' : item.component ? 'components' : 'equipment';
const tags = { ad:'物理 攻击 射手 攻速 暴击', ap:'魔法 法师 法强', tank:'坦克 生命 护甲 防御', support:'辅助 治疗 护盾', mr:'魔抗 魔法抗性', penetration:'穿甲 破甲 护甲穿透' };
const mageIds = new Set(['ahri','lux','teemo','annie','syndra','veigar','orianna','brand','viktor','xerath','fizz','akali','katarina','diana','aurelionsol','twistedfate']);
const marksmanIds = new Set(['ashe','ezreal','jinx','caitlyn','vayne','missfortune','lucian','tristana','jhin','kaisa','varus','twitch','sivir']);
const supportIds = new Set(['sona','soraka','nami','lulu','janna','seraphine','morgana','thresh','leona','blitzcrank','braum','yuumi']);

export function recommendedItems(hero = {}) {
  const id = hero.heroId || hero.id || '', role = hero.role || '';
  if (id === 'kaisa') return ['doran-blade','boots','bf-sword','pickaxe','recurve-bow','blasting-wand','berserkers','kraken-slayer','infinity','nashors-tooth','rabadon','zhonya','wits-end'];
  if (id === 'twistedfate') return ['doran-ring','boots','lost-chapter','ludens','lich-bane','sorcerer-shoes','rabadon','zhonya','void-staff','banshee','rapid-firecannon'];
  if (id === 'ezreal') return ['doran-blade','boots','sheen','trinity-force','ionian-boots','blade-ruined','mortal-reminder','maw','quicksilver-sash'];
  if (['yasuo','yone','masteryi'].includes(id)) return ['doran-blade','boots','berserkers','blade-ruined','infinity','phantom-dancer','steraks','deaths-dance','mercurial-scimitar'];
  if (supportIds.has(id) || /辅助/.test(role)) return ['doran-ring','boots','ionian-boots','locket','redemption','shurelya','moonstone','mikaels','staff-flowing-water','ardent-censer'];
  if (mageIds.has(id) || /法师|法术/.test(role)) return ['doran-ring','boots','sorcerer-shoes','lost-chapter','ludens','rabadon','void-staff','zhonya','morellonomicon','banshee',...(id==='teemo'?['nashors-tooth','liandry']:[])];
  if (marksmanIds.has(id) || /射手/.test(role) || hero.attackRange > 15) return ['doran-blade','boots','berserkers','kraken-slayer','infinity','phantom-dancer','blade-ruined','lord-dominik','runaans','mercurial-scimitar'];
  if (/刺客/.test(role) || ['zed','talon','khazix','rengar'].includes(id)) return ['doran-blade','boots','serrated-dirk','collector','black-cleaver','ionian-boots','maw','deaths-dance','ravenous-hydra'];
  return ['doran-blade','boots','mercury-treads','plated-steelcaps','black-cleaver','trinity-force','steraks','sunfire','spirit-visage','thornmail','warmogs'];
}

export function itemMatchesQuery(item, query = '') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = [item.name, item.id, item.description, ...(item.recipe || []).map(id=>byId.get(id)?.name || id), ...(item.tags || []).map(tag=>tags[tag] || tag)].join(' ').toLowerCase();
  return words.every(word=>text.includes(word));
}

export class ShopView {
  constructor(getGame, baseUrl, onChange) {
    this.getGame = getGame;
    this.baseUrl = baseUrl;
    this.onChange = onChange;
    this.selectedSlot = -1;
    this.filter = 'equipment';
    this.statFilter = 'all';
    this.query = '';
    this.items = document.getElementById('shop-items');
    this.inventory = document.getElementById('shop-inventory');
    this.filters = document.getElementById('shop-filters');
    this.sell = document.getElementById('sell-item');
    this.sell.addEventListener('click', () => {
      if (this.getGame().sell(this.selectedSlot)) this.onChange();
      this.update();
    });
    this.filters.innerHTML = `<div class="shop-search-row"><label class="shop-search"><span>搜索装备</span><input id="shop-search" type="search" placeholder="名称、属性或配方，如：魔抗" aria-label="搜索装备名称、属性或合成部件" autocomplete="off"></label><label class="shop-stat-label"><span class="sr-only-shop">属性分类</span><select id="shop-stat-filter" aria-label="装备属性分类"><option value="all">全部属性</option><option value="ad">物理 / 攻速</option><option value="ap">法术强度</option><option value="tank">生命 / 防御</option><option value="support">辅助 / 治疗</option><option value="mr">魔法抗性</option><option value="penetration">护甲穿透</option></select></label></div><div class="shop-filter-tabs">${[['recommended','英雄推荐'],['equipment', '成装与出门装'], ['components', '合成散件'], ['consumables', '药水与守卫'], ['all', '全部']].map(([id, name]) => `<button data-filter="${id}" aria-pressed="false">${name}</button>`).join('')}</div><p class="shop-result-summary" aria-live="polite"></p><p class="shop-recommendation-note hidden"></p>`;
    this.filters.querySelector('#shop-search').addEventListener('input',event=>{
      this.query=event.target.value;
      // Search across the full catalog rather than silently excluding hidden categories.
      if(this.query.trim())this.filter='all';
      this.applyFilter();this.update();
    });
    this.filters.querySelector('#shop-stat-filter').addEventListener('change',event=>{this.statFilter=event.target.value;this.applyFilter();this.update();});
    this.filters.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      this.filter = button.dataset.filter;
      this.applyFilter();this.update();
    });
    this.items.innerHTML = ITEMS.map(item => {
      const recipe = (item.recipe || []).map(id => byId.get(id)?.name || id).join(' + ');
      return `<button class="item-card" data-item="${item.id}" data-category="${category(item)}"><span class="shop-item-icon"><img src="${baseUrl}assets/item-${item.id}.png" alt="" draggable="false" loading="lazy"></span><span class="shop-item-info"><strong>${item.name}<span class="item-recommended-mark" aria-hidden="true">荐</span></strong><small>${item.description}</small>${recipe ? `<span class="item-recipe">合成：${recipe}</span>` : ''}<span class="item-pricing"><span class="item-cost"></span><del class="item-full-cost"></del></span><span class="item-owned"></span><span class="item-buy-state"></span></span></button>`;
    }).join('');
    this.items.addEventListener('click', event => {
      const button = event.target.closest('[data-item]');
      if (!button || button.disabled) return;
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
    const empty=document.createElement('p');empty.className='shop-no-results hidden';empty.textContent='没有找到装备，换个关键词或属性分类试试。';this.items.after(empty);this.empty=empty;
    this.applyFilter();
  }

  applyFilter() {
    const hero=this.getGame().player,recommendations=new Set(recommendedItems(hero));this.lastHero=hero.heroId;
    for (const button of this.filters.querySelectorAll('[data-filter]')) {
      const active = button.dataset.filter === this.filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    let count=0;
    for (const button of this.items.children) {
      const item=byId.get(button.dataset.item),recommended=recommendations.has(item.id);
      const visible=(this.filter==='all'||this.filter==='recommended'&&recommended||button.dataset.category===this.filter)&&(this.statFilter==='all'||item.tags.includes(this.statFilter))&&itemMatchesQuery(item,this.query);
      button.classList.toggle('hidden',!visible);button.classList.toggle('hero-recommended',recommended);if(visible)count++;
    }
    this.filters.querySelector('.shop-result-summary').textContent=`${count} 件装备${this.filter==='recommended'?' · 推荐可按对手阵容调整':''}`;
    this.updateRecommendation(hero);
    this.empty?.classList.toggle('hidden',count>0);
  }

  updateRecommendation(hero) {
    const note = this.filters.querySelector('.shop-recommendation-note');
    let text = '';
    if (this.filter === 'recommended' && hero.heroId === 'kaisa') {
      const stats = hero.ext?.evolutionStats || (hero.inventory || []).reduce((sum, slot) => {
        const item = byId.get(slot?.id);
        for (const key of ['attack', 'ap', 'attackSpeed']) sum[key] += item?.stats[key] || 0;
        return sum;
      }, { attack: 0, ap: 0, attackSpeed: 0 });
      text = `进化进度：Q ${Math.round(stats.attack)}/100 攻击 · W ${Math.round(stats.ap)}/100 法强 · E ${Math.round(stats.attackSpeed * 100)}/100% 攻速。海妖 + 无尽进化 Q；纳什 + 爆裂魔杖进化 W；海妖 + 纳什 + 狂战士进化 E。`;
    } else if (this.filter === 'recommended' && hero.heroId === 'twistedfate') {
      text = '卡牌法师路线：卢登补法强与法力，巫妖强化选牌后的普攻；黄牌定身接 Q，蓝牌回蓝。疾射火炮增加选牌普攻距离。';
    }
    note.classList.toggle('hidden', !text);
    if (note.textContent !== text) note.textContent = text;
  }

  render() { this.applyFilter();this.update(); }

  update() {
    const game = this.getGame(), hero = game.player;
    if (!game.quoteBuy) return;
    if(this.lastHero!==hero.heroId)this.applyFilter();
    this.updateRecommendation(hero);
    document.getElementById('shop-gold').textContent = Math.floor(hero.gold).toLocaleString();
    for (const button of this.items.children) {
      if(button.classList.contains('hidden'))continue;
      const quote = game.quoteBuy(button.dataset.item);
      const item = byId.get(button.dataset.item);
      const requestedCost = quote.requestedCost ?? quote.cost ?? item.cost;
      const requestedDiscount = quote.requestedDiscount ?? quote.discount ?? 0;
      const components = (quote.requestedComponents || quote.components || []).map(index => byId.get(hero.inventory[index]?.id)?.name).filter(Boolean);
      const owned = components.length ? `抵扣 ${requestedDiscount} · ${components.join('、')}` : '';
      const nextPurchase = quote.componentPurchase ? `先买 ${quote.item.name} · ${quote.cost} 金币` : quote.discount ? '点击合成' : '点击购买';
      const signature=JSON.stringify([quote.ok,quote.itemId,quote.cost,requestedCost,requestedDiscount,quote.componentPurchase,quote.reason,owned]);if(button.dataset.quote===signature)continue;button.dataset.quote=signature;
      button.disabled = !quote.ok;
      button.classList.toggle('discounted', requestedDiscount > 0);
      button.classList.toggle('auto-component', !!quote.componentPurchase);
      button.dataset.purchaseItem = quote.ok ? quote.itemId : '';
      button.querySelector('.item-cost').textContent = `${quote.componentPurchase ? '合成还需 ' : ''}${requestedCost} 金币`;
      button.querySelector('.item-full-cost').textContent = requestedDiscount > 0 ? `${item.cost}` : '';
      button.querySelector('.item-owned').textContent = owned;
      button.querySelector('.item-buy-state').textContent = quote.ok ? nextPurchase : quote.reason;
      button.title = `${item.name}\n${item.description}\n合成还需 ${requestedCost} 金币\n${owned}\n${quote.ok ? quote.componentPurchase ? `${nextPurchase}\n本次购买一件所需散件，继续点击可逐步合成` : '点击购买，自动合成已有散件' : quote.reason}`;
      button.setAttribute('aria-label',`${item.name}，合成还需 ${requestedCost} 金币，${owned}，${quote.ok?nextPurchase:quote.reason}`);
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
