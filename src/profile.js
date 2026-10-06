export const PROFILE_KEY = 'rift-collection-v1';
export const FREE_HEROES = ['ahri', 'ashe', 'garen'];
const prices = {lux:1350,ezreal:2500,yasuo:3200,teemo:1350,jinx:2500,annie:450,brand:1350,morgana:1350,veigar:1350,ziggs:2500,fizz:3200,masteryi:450,leesin:3200,darius:2500,malphite:450,blitzcrank:1350,leona:1350,vayne:3200,caitlyn:2500,missfortune:1350,sona:1350};
export const heroPrice = id => FREE_HEROES.includes(id) ? 0 : prices[id] ?? 2500;
const amount = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 9999999) : 0;
const uniqueStrings = value => Array.isArray(value) ? [...new Set(value.filter(v=>typeof v==='string'&&v.length<80))] : [];
export function createProfile(){return {version:1,essence:6000,heroes:[...FREE_HEROES],skins:[],equipped:{},daily:'',matches:0,wins:0,earned:0};}
export function loadProfile(storage){
 try{const raw=storage?.getItem(PROFILE_KEY);if(!raw)return createProfile();const saved=JSON.parse(raw);if(!saved||saved.version!==1)return createProfile();return {version:1,essence:amount(saved.essence),heroes:uniqueStrings([...FREE_HEROES,...uniqueStrings(saved.heroes)]),skins:uniqueStrings(saved.skins),equipped:saved.equipped&&typeof saved.equipped==='object'&&!Array.isArray(saved.equipped)?Object.fromEntries(Object.entries(saved.equipped).filter(([k,v])=>k.length<80&&typeof v==='string'&&v.length<80)): {},daily:typeof saved.daily==='string'?saved.daily:'',matches:amount(saved.matches),wins:amount(saved.wins),earned:amount(saved.earned)};}catch{return createProfile();}
}
export function saveProfile(storage,profile){try{if(!storage)return false;storage.setItem(PROFILE_KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function ownsHero(profile,id){return profile.heroes.includes(id);}
export function buyHero(profile,id,catalog){
 if(!catalog.some(hero=>hero.id===id))return {ok:false,reason:'找不到这位英雄'};
 if(ownsHero(profile,id))return {ok:false,reason:'已经拥有这位英雄'};
 const price=heroPrice(id);if(profile.essence<price)return {ok:false,reason:`蓝色精粹不足，还差 ${price-profile.essence}`};
 profile.essence-=price;profile.heroes.push(id);return {ok:true,price};
}
export function buySkin(profile,id,skins){
 const skin=skins.find(s=>s.id===id);if(!skin)return {ok:false,reason:'找不到这款皮肤'};
 if(!ownsHero(profile,skin.championId))return {ok:false,reason:'请先解锁这位英雄'};
 if(profile.skins.includes(id))return {ok:false,reason:'已经拥有这款皮肤'};
 if(profile.essence<skin.price)return {ok:false,reason:`蓝色精粹不足，还差 ${skin.price-profile.essence}`};
 profile.essence-=skin.price;profile.skins.push(id);profile.equipped[skin.championId]=id;return {ok:true,price:skin.price};
}
export function equipSkin(profile,heroId,id,skins){
 if(!ownsHero(profile,heroId))return false;
 if(id!=='default'&&(!profile.skins.includes(id)||!skins.some(s=>s.id===id&&s.championId===heroId)))return false;
 profile.equipped[heroId]=id;return true;
}
export function equippedSkin(profile,heroId,skins){const id=profile.equipped[heroId];return profile.skins.includes(id)&&skins.some(s=>s.id===id&&s.championId===heroId)?id:'default';}
export function claimDaily(profile,day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||profile.daily===day)return {ok:false,amount:0};profile.daily=day;profile.essence+=1200;return {ok:true,amount:1200};}
export function grantEssence(profile,value){value=amount(value);profile.essence+=value;profile.earned+=value;return value;}
export function matchProgressReward(stats,already=0){return Math.max(0,Math.min(1200,Math.floor((stats.time||0)/60)*60+(stats.kills||0)*30+(stats.assists||0)*15+(stats.cs||0)*2)-already);}
export function completeMatch(profile,won){profile.matches++;if(won)profile.wins++;return grantEssence(profile,won?1500:900);}
