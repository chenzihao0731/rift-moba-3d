// Original cosmetic themes only: no combat stat or ability overrides.
const entries = [
  ['ahri','星糖九尾','candy',0xf58ec8,0x7ceff2,'糖霜尾巴与薄荷星环，狐火化作彩色糖光。'],
  ['ashe','极光远航','space',0x528bbf,0x9affef,'极光披风、轨道光环和冰蓝星弓。'],
  ['garen','熔金骑士','inferno',0x843f35,0xffb851,'黑曜铠甲燃起金焰，巨剑铭刻熔火纹章。'],
  ['lux','霓虹魔术师','arcade',0x793fe0,0x4bfde1,'电玩紫礼服与像素光翼，法杖点亮青色霓虹。'],
  ['ezreal','深空快递员','space',0x273961,0x65d4ff,'星际护甲、行星导航环与蓝光奥术手套。'],
  ['yasuo','薄荷浪客','candy',0x7cbcac,0xffd2ea,'薄荷铠甲和糖果色风铃，挥剑留下清透糖光。'],
  ['teemo','蘑菇宇航员','space',0x9fbdcc,0x78f0d8,'小小太空头盔、轨道背包与荧光侦查装备。'],
  ['jinx','街机爆米花','arcade',0x593992,0xff76c8,'紫色街机战衣与像素双翼，枪炮闪耀粉色灯带。'],
  ['annie','草莓小魔女','candy',0xffa4b8,0xc7ffed,'草莓糖霜裙与糖果帽，泰迪收藏闪亮小星星。'],
  ['brand','冰焰行者','frost',0x406d9a,0x8bf5ff,'冰晶肌肤与冷蓝裂隙，寒焰缠绕全身。'],
  ['morgana','星海夜翼','cosmic',0x493869,0xc6a2ff,'银河暗紫羽翼，行星轨迹环绕禁忌魔法。'],
  ['veigar','电玩终极王','arcade',0x603da4,0x67fbdc,'像素王冠与霓虹法杖，电光刻出小法师的轮廓。'],
  ['ziggs','奶油爆破师','candy',0xf2bf87,0xff91b8,'奶油糖罐背包与草莓炸弹，甜蜜得非常危险。'],
  ['fizz','珊瑚星旅','cosmic',0x579995,0xd1a3ff,'星海珊瑚叉与紫色星鳍，踏着行星光环出击。'],
  ['masteryi','光速跑酷','arcade',0x303c5b,0x6cf6a9,'霓虹护目镜和电子光刃，利落的像素风行者。'],
  ['leesin','熔岩禅心','inferno',0x834734,0xffc976,'暗红武者服与熔金拳带，背后浮现金焰纹章。'],
  ['darius','冰川刽子手','frost',0x406983,0xace8ff,'霜钢重甲与寒晶战斧，冰蓝棱角锋芒毕露。'],
  ['malphite','银河碎岩','cosmic',0x454474,0xb7a0ff,'漂浮晶石镶在星尘巨岩上，脚下环绕星轨。'],
  ['blitzcrank','苏打机器人','candy',0x72bdb7,0xffd899,'薄荷汽水机身与橘糖关节，甜色机械蒸汽心脏。'],
  ['leona','日冕宇卫','space',0x8c8b9e,0xffdf95,'太空守卫甲和日冕巨盾，星际光环衬出庄严轮廓。'],
  ['vayne','霓虹夜巡','arcade',0x502f6b,0xf56fe0,'紫色夜行战衣、像素羽翼与粉光弩架。'],
  ['caitlyn','星际治安官','space',0x526781,0x8fdef7,'长帽换上银蓝太空涂装，精密步枪佩戴星际组件。'],
  ['missfortune','糖果海盗','candy',0xff819d,0xffe2a1,'草莓船长帽、奶油双枪与星糖饰物。'],
  ['sona','月霜琴师','frost',0x657aa7,0xb4edff,'冰蓝长发与晶霜琴台，寒晶环绕她的旋律。'],
];
export const SKINS = entries.map(([championId,name,theme,color,accent,description],index)=>({
  id:`${championId}-${theme}`,championId,name,price:index%4===0?1820:1350,theme,color,accent,description,
  rarity:index%4===0?'传说':'史诗',
}));
const byId=new Map(SKINS.map(skin=>[skin.id,skin]));
export function getSkin(id){return byId.get(id)||null;}
export function skinsForChampion(championId){return SKINS.filter(skin=>skin.championId===championId);}
