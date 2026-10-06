import { EXTENDED_CHAMPIONS } from './extended-champions.js';
export const CHAMPIONS = [
  {id:'ahri',name:'阿狸',title:'九尾妖狐',role:'法师 · 灵活刺客',color:'#67deec',attackRange:20,hp:650,mana:440,attack:55,armor:24,speed:13,skills:[
    {key:'Q',name:'欺诈宝珠',description:'向前投出宝珠：去程造成魔法伤害，回程造成真实伤害。',cost:55,cooldown:7},
    {key:'W',name:'妖异狐火',description:'召唤三团狐火自动追击附近敌人，并短暂提升移动速度。',cost:30,cooldown:9},
    {key:'E',name:'魅惑妖术',description:'发射爱心，魅惑第一个命中的敌人，使其缓慢走向阿狸。',cost:50,cooldown:12},
    {key:'R',name:'灵魄突袭',description:'向鼠标位置突进并发射灵魄弹，10 秒内可连续施放三次。',cost:100,cooldown:95},
  ]},
  {id:'ashe',name:'艾希',title:'寒冰射手',role:'射手 · 远程控制',color:'#8ecdf8',attackRange:24,hp:640,mana:320,attack:62,armor:26,speed:12.5,skills:[
    {key:'Q',name:'射手的专注',description:'6 秒内显著提升攻速，普通攻击射出强化箭束。',cost:50,cooldown:10},
    {key:'W',name:'万箭齐发',description:'射出扇形冰箭，造成物理伤害并减速敌人。',cost:60,cooldown:9},
    {key:'E',name:'鹰击长空',description:'释放猎鹰，揭开目标附近的战争迷雾，持续 7 秒。',cost:0,cooldown:30},
    {key:'R',name:'魔法水晶箭',description:'射出全地图冰箭，撞到敌方英雄时爆炸并长时间眩晕。',cost:100,cooldown:90},
  ]},
  {id:'garen',name:'盖伦',title:'德玛西亚之力',role:'战士 · 近战坦克',color:'#edc979',attackRange:5.8,hp:780,mana:0,attack:68,armor:36,speed:13.5,skills:[
    {key:'Q',name:'致命打击',description:'解除减速并提升移动速度，下次攻击造成额外伤害和沉默。',cost:0,cooldown:8},
    {key:'W',name:'勇气',description:'获得护盾，3 秒内受到的伤害减少 35%。',cost:0,cooldown:18},
    {key:'E',name:'审判',description:'挥剑旋转 3 秒，连续伤害身边敌人；期间仍可移动。',cost:0,cooldown:9},
    {key:'R',name:'德玛西亚正义',description:'以巨剑处决附近敌方英雄，造成随已损失生命提升的真实伤害。',cost:0,cooldown:90},
  ]},
  {id:'lux',name:'拉克丝',title:'光辉女郎',role:'法师 · 远程爆发',color:'#f4dfab',attackRange:20,hp:630,mana:480,attack:54,armor:22,speed:12.8,skills:[
    {key:'Q',name:'光之束缚',description:'发射光球，禁锢路径上的前两个敌人并施加光芒标记。',cost:50,cooldown:10},
    {key:'W',name:'曲光屏障',description:'抛出法杖，为路径上的自己与友军提供护盾。',cost:60,cooldown:12},
    {key:'E',name:'透光奇点',description:'在目标处放置减速光球，再按 E 引爆；5 秒后自动爆炸。',cost:60,cooldown:10},
    {key:'R',name:'终极闪光',description:'发射穿透性的巨大光束，伤害并引爆所有光芒标记。',cost:100,cooldown:60},
  ]},
  {id:'ezreal',name:'伊泽瑞尔',title:'探险家',role:'射手 · 技能游击',color:'#e6bc71',attackRange:21,hp:660,mana:400,attack:61,armor:25,speed:13,skills:[
    {key:'Q',name:'秘术射击',description:'射出能量弹，命中造成物理伤害并缩短其他技能冷却。',cost:28,cooldown:5.5},
    {key:'W',name:'精华跃动',description:'以能量环标记首个英雄或建筑；后续攻击或技能引爆标记。',cost:50,cooldown:10},
    {key:'E',name:'奥术跃迁',description:'闪烁至目标附近，并向最近敌人发射一枚自动追踪弹。',cost:70,cooldown:18},
    {key:'R',name:'精准弹幕',description:'射出贯穿全地图的能量弧，对沿途所有敌人造成魔法伤害。',cost:100,cooldown:90},
  ]},
  {id:'yasuo',name:'亚索',title:'疾风剑豪',role:'战士 · 连招剑客',color:'#a2d9e9',attackRange:6.2,hp:690,mana:0,attack:66,armor:30,speed:14,
    passive:{name:'浪客之道',description:'移动积攒剑意，满层时受到敌方英雄伤害自动获得护盾；装备提供的暴击率翻倍。'},skills:[
    {key:'Q',name:'斩钢闪',description:'向前方窄直线刺剑。命中两次后，下次射出击飞龙卷风；踏前斩结束 0.45 秒内施放改为环形斩，两层时环形击飞。',cost:0,cooldown:3.2,range:18,targeting:'direction'},
    {key:'W',name:'风之障壁',description:'生成持续 4 秒的风墙，拦截敌方普攻飞弹与技能飞弹；防御塔攻击无法被拦截。',cost:0,cooldown:22,range:10,targeting:'direction'},
    {key:'E',name:'踏前斩',description:'穿过射程内目标造成魔法伤害。同一目标 8 秒内无法再次穿越，可连续穿梭不同敌人。',cost:0,cooldown:.65,range:18,targeting:'target'},
    {key:'R',name:'狂风绝息斩',description:'瞬移至被击飞的敌方英雄，延长其滞空并斩击附近所有击飞英雄。必须先击飞目标。',cost:0,cooldown:65,range:62,targeting:'target'},
  ]},
  {id:'teemo',name:'提莫',title:'迅捷斥候',role:'射手 · 蘑菇伏击',color:'#a7dd65',attackRange:21,hp:610,mana:380,attack:56,armor:24,speed:13.5,
    passive:{name:'游击队军备',description:'静止 2 秒后隐身，草丛中可移动保持隐身；解除隐身后短暂获得 40% 攻速。攻击与施法会暴露位置。'},skills:[
    {key:'Q',name:'致盲吹箭',description:'向目标射出毒镖，造成魔法伤害并致盲，使其普通攻击无法命中。',cost:60,cooldown:8,range:30,targeting:'target'},
    {key:'W',name:'小莫快跑',description:'主动提高移动速度 3 秒；长时间未受英雄攻击时被动提高移动速度。',cost:40,cooldown:14,range:0,targeting:'self'},
    {key:'E',name:'毒性射击',description:'被动：普通攻击附带额外魔法伤害，并使目标中毒 4 秒。再次命中刷新中毒，不重复叠加。',cost:0,cooldown:0,range:21,targeting:'self',passive:true},
    {key:'R',name:'种蘑菇',description:'放置隐形毒蘑菇，敌人踩中后范围爆炸、中毒并减速。最多储存 3 个充能，蘑菇存在 180 秒。',cost:75,cooldown:.75,range:25,targeting:'ground'},
  ]},
  {id:'jinx',name:'金克丝',title:'暴走萝莉',role:'射手 · 火箭狂欢',color:'#f2a2d4',attackRange:22,hp:650,mana:340,attack:63,armor:26,speed:13,
    passive:{name:'罪恶快感',description:'参与击杀敌方英雄或摧毁防御塔后，获得 6 秒高额移动速度与攻击速度加成。'},skills:[
    {key:'Q',name:'枪炮交响曲',description:'切换枪械：机枪连续攻击叠加攻速；火箭增加射程、伤害和范围溅射，但每发消耗 20 法力。',cost:0,cooldown:.35,range:30,targeting:'self'},
    {key:'W',name:'震荡电磁波',description:'发射远距离电磁弹，命中首个敌人造成物理伤害、减速并显露其位置。',cost:50,cooldown:9,range:62,targeting:'direction'},
    {key:'E',name:'嚼火者手雷',description:'投下三枚夹子，0.7 秒后武装，踩中的敌方英雄被禁锢并受到魔法伤害。夹子持续 5 秒。',cost:70,cooldown:18,range:30,targeting:'ground'},
    {key:'R',name:'超究极死神飞弹',description:'全地图火箭只碰撞敌方英雄，爆炸伤害随飞行距离和敌人已损失生命提升，并波及附近敌人。',cost:100,cooldown:80,range:270,targeting:'direction'},
  ]},
...EXTENDED_CHAMPIONS,
];

const ranges={ahri:[45,26,46,18],ashe:[24,52,240,240],garen:[6,0,9,17],lux:[53,43,49,88],ezreal:[53,53,17,240]};
for(const champion of CHAMPIONS)champion.skills.forEach((skill,index)=>{
  skill.range??=ranges[champion.id]?.[index]||0;
  skill.targeting??=champion.id==='garen'&&skill.key==='R'?'target':
    (champion.id==='garen'||skill.key==='W'&&champion.id==='ahri'||skill.key==='Q'&&champion.id==='ashe')?'self':
    (champion.id==='lux'&&skill.key==='E'||champion.id==='ashe'&&skill.key==='E')?'ground':'direction';
});
