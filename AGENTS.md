# AGENTS.md — AI 代理交接手册

> 任何 AI 代理（或人类）接手本项目前必读。读完请遵守，不要重新发明已有决策。

## 项目是什么

《我蛇了》（IM SNAKE）：一条不能停下的贪吃蛇穿越像素世界。身长=血条+弹药+牢笼：
吐豆会变短、用身体围敌人进窒息监狱、断尾保命、F 键放固定环形节点封口成环。
当前处于**玩法原型期**，纯浏览器单文件夹、零依赖、双击即玩。

## 如何运行与验证

- 运行：直接打开 `prototype/index.html`
- 提交前必须跑：`node tools/smoke.js prototype/index.html` → 必须全绿
- 修改剧情运行时或剧情数据后还必须跑：`node tools/story-runtime-tests.js`
- 改动玩法后：真人试玩验证手感

## 文件领地（严格分工，防冲突）

| 文件 | 归属 | 规则 |
|---|---|---|
| `prototype/index.html` | 引擎+规则层 | **谨慎修改**：只动引擎/系统，改前先理解 RUN 状态机制 |
| `prototype/levels.js` | 关卡轨道 | 自由增删关卡，遵循文件头规范（含 zones/mechs 扩展） |
| `prototype/upgrades.js` | 肉鸽卡池轨道 | 自由增删强化卡，效果只能通过修改 RUN 字段实现 |
| `prototype/enemies.js` | 怪物注册表轨道 | 怪物行为原型（chaser/thief/ranged/charger/bomber）与数值 |
| `prototype/mobile.js` | 移动端轨道 | 触屏控件，只通过 VInput 全局与合成键盘事件对接引擎 |
| `prototype/intro.js` | 开场演出轨道 | 只定义 window.INTRO_SCENE 数据，播放器在引擎内 |
| `prototype/story-data.js` | 剧情内容轨道 | 唯一运行剧情源；对白、选择、节点跳转写在这里 |
| `prototype/story-controller.js` | 剧情适配层 | 只连接剧情运行时与游戏引擎，不在这里新增正文台词 |
| `STORY.md` | 剧情轨道 | 剧情制作、分页和异常操作约定；运行数据以 `prototype/story-data.js` 为准 |
| `CARD_REVIEW.md` | 卡池评审 | 给制作人看的卡牌清单，可自由更新 |
| `GDD.md` | 设计宪法 | 所有拍板当天落在这里；数值以 §8 速查表为准 |

**禁止事项**：不要引入构建工具/npm；不要破坏双击即玩；不要把内容写死回 index.html。
**编码铁律**：禁止用 PowerShell/正则管道批量改写含中文的文件（会毁 UTF-8 编码），一律使用精确编辑工具逐处修改。

## 已拍板决策（勿翻案，除非制作人明确要求）

1. 连续移动模型：浮点坐标+轨迹跟随身体，8方向即时转向，180°掉头禁止
2. 长按方向键=2倍速冲刺；长按 J/空格=站桩火力姿态（定身连射，身长即弹匣）
3. 环形节点=地图定点放置（F），蛇身完全通过后自动回收充能；穿越豁免半径 1.15 格
4. 身体免疫伤害但实体化（弹体折射）；头部为唯一弱点；自撞即死
5. 断尾保留头+2节，余下化作豆子回收 50%
6. 豆子出膛高速轻阻尼，首次碰撞后偏转反弹+强减速落地可回收
7. 世界边界=实体墙（玩家撞死，弹体反弹，怪物不可越界）
8. 肉鸽双层形态已定：局内三选一（已实现骨架）→ 局外解锁层（M3 再做）
9. 碰墙/自撞有 0.5 秒冻结容错窗：期间转向使"真实步长模拟"安全即免死并立即恢复移动
10. v0.16 扩展系统：VInput 虚拟输入 / ZONES 地形区域（slope 坡度、wind 风）/ MECHS 机关（gate 吞豆门、pillar 充能桩+奖励）/ 开场播放器（读 window.INTRO_SCENE）；RUN 新增 speedMult、contactDmg

## 当前状态与下一步

- ✅ 地基 + NPC 系统 + BOSS 战完成（v0.28）：巨岩茧母·磐（菜单 ⚔ Boss挑战 进入）
- 🐛 **已知未修 BUG（交接优先处理）**：移动端与可蒂交互时，右侧面板滑入但内容全空（头像/名字/台词/选项均无）。
  - 已加排查工具：`window.__IMS` 调试钩子（暴露 npcs/snake/gameState/paused/freeze/alive/moveLock/openPanel/closePanel）；openPanel 已包 try/catch + uiFatal 红条（真机崩溃会直接显示）
  - 无头复现（`node tools/diag-npc.js`）：门控变量全部正常（play/false/false/true/false）、无异常抛出，但 openPanel 从未触发、且 snake.fx 冻结在出生点 6.50——**疑似 loop 的 play 分支未执行，或 rAF 链首帧就断了**
  - 排查建议：①在 loop() 首尾加帧计数器确认 rAF 链是否存活 ②在 play 块首尾各加探针 ③真机复现看红条是否出现（区分"没调用"还是"调用即崩"）
- ⏳ 选关界面已实现但暂时隐藏（ovBtn4 display:none，架构保留，去掉那行即恢复）
- ⏳ 待定：音效合成版（prototype/index-sfx.html，冻结中）；剧情基调未定（STORY_INTRO.md 有三基调分析）

## 提交纪律

- 每个可玩改动一个 commit，message 写清版本与内容
- 每次工作会话结束：commit + push，仓库不留未推送状态
- 新点子一律记入 GDD §10 待定项，不当场实现（停车场原则）
