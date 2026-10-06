import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/simulation.js';

test('normal matches require shop range, and allow both trading while dead and full-slot upgrades', () => {
  const game = new Game({hero:'jinx'}), hero = game.player;
  hero.gold = 10000;
  hero.x = 0; hero.z = 0;
  assert.equal(game.buy('long-sword'),false);
  assert.equal(hero.gold,10000);
  hero.alive = false;
  assert.equal(game.buy('long-sword'),true);
  assert.equal(game.quoteBuy('blade-ruined').cost,2850);
  assert.equal(game.buy('blade-ruined'),true);
  assert.equal(hero.inventory[0].id,'blade-ruined');
  assert.equal(game.sell(0),true);
  assert.equal(hero.gold,9040);
  assert.equal(hero.inventory[0],null);
  assert.ok(game.events.some(e=>e.type==='sale'&&e.amount===2240));
});

test('selling removes equipment stats and buying HP items cannot repeatedly heal a wounded hero', () => {
  const game = new Game({hero:'teemo',practice:true}), hero = game.player;
  hero.hp = 150;
  const hp = hero.maxHp, attack = hero.attack, ap = hero.ap;
  assert.equal(game.buy('ruby-crystal'),true);
  assert.equal(hero.maxHp,hp+150);
  assert.equal(hero.hp,150);
  assert.equal(game.sell(0),true);
  assert.equal(hero.maxHp,hp);
  assert.equal(hero.hp,150);
  assert.equal(game.buy('rabadon'),true);
  assert.equal(hero.ap,130);
  assert.equal(game.sell(0),true);
  assert.equal(hero.ap,ap);
  assert.equal(hero.attack,attack);
});

test('item use preserves other equipment hotkeys and cooldowns remain effective', () => {
  const game = new Game({practice:true}), hero = game.player;
  game.buy('potion');game.buy('zhonya');game.buy('control-ward');
  assert.equal(game.useItem(0),true);
  assert.equal(hero.inventory[0],null);
  assert.equal(hero.inventory[1].id,'zhonya');
  assert.equal(game.useItem(1),true);
  assert.equal(game.useItem(1),false);
  assert.ok(hero.invulnerableUntil>game.time);
  game.buy('long-sword');
  assert.equal(hero.inventory[0].id,'long-sword');
  assert.equal(hero.inventory[1].id,'zhonya');
  assert.equal(hero.inventory[2].id,'control-ward');
});

test('Game quotes and buys an affordable recipe ingredient with accurate purchase feedback, then completes the requested item',()=>{
  const game=new Game({hero:'kaisa',practice:true}),hero=game.player;hero.gold=1300;
  const snapshot=JSON.stringify({gold:hero.gold,inventory:hero.inventory}),quote=game.quoteBuy('infinity');assert.equal(quote.ok,true);assert.equal(quote.componentPurchase,true);assert.equal(quote.itemId,'bf-sword');assert.equal(quote.requestedItemId,'infinity');assert.equal(JSON.stringify({gold:hero.gold,inventory:hero.inventory}),snapshot);
  assert.ok(game.buy('infinity'));assert.equal(hero.gold,0);assert.equal(hero.inventory[0].id,'bf-sword');const event=game.events.findLast(e=>e.type==='purchase');assert.equal(event.amount,1300);assert.equal(event.itemId,'bf-sword');assert.equal(event.requestedItemId,'infinity');assert.equal(event.componentPurchase,true);assert.ok(event.text.includes('暴风大剑')&&event.text.includes('无尽之刃'));
  hero.gold=2300;assert.ok(game.buy('infinity'));assert.equal(hero.gold,0);assert.equal(hero.inventory[0].id,'infinity');assert.equal(game.events.findLast(e=>e.type==='purchase').componentPurchase,false);
  hero.x=0;hero.z=0;game.practice=false;hero.gold=10000;const saved=JSON.stringify({gold:hero.gold,inventory:hero.inventory});assert.equal(game.buy('rabadon'),false);assert.equal(JSON.stringify({gold:hero.gold,inventory:hero.inventory}),saved);
});
