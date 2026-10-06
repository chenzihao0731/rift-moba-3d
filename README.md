# RIFT 3D — 召唤师峡谷网页 MOBA

基于 Three.js 的可玩单人 5v5 网页游戏。包含三路、河道、野区、两方基地、推塔与水晶胜负、AI 英雄和兵线、补刀经验金币、技能升级、战争迷雾与守卫、装备商店、回城与复活。

可选英雄：阿狸、艾希、盖伦、拉克丝、伊泽瑞尔，每位都有独立 QWER 技能机制。D 为闪现，F 为引燃。默认普通对局；练习模式从 6 级和 10000 金币开始。

这是独立制作的非官方网页游戏。3D 场景及模型为程序生成；英雄卡面和头像使用 Riot Data Dragon 公共资源。没有连接 Riot 游戏服务器，也没有玩家联网对战。

## 开发

```sh
npm install
npm run dev
npm run build
```

## 操作

右键移动或持续攻击；QWER 选技能后左键施放，Shift+QWER 快捷施法；Ctrl+QWER 或技能上的 + 升级。A 后点击地面攻击移动，S 停止，B 回城，4 插眼，P 商店，Tab 战绩，Y 切换视角锁定，按住空格居中，滚轮缩放。1/2/3/5/6/7 使用六个装备栏；Esc 取消操作或暂停。手机点地面移动、点敌人攻击、点技能后选目标。

## 发布

GitHub Pages 正式地址：https://chenzihao0731.github.io/rift-moba-3d/

仓库 main 分支推送后自动运行测试、构建和 Pages 部署。构建脚本 `npm run build:pages` 已处理站点子路径。

### Cloudflare Pages

构建目录为 `dist`，无后端或私密配置。已有 Cloudflare 登录后：

```sh
npx wrangler pages project create rift-moba-3d --production-branch main
npx wrangler pages deploy dist --project-name rift-moba-3d --branch main
```
