# 德州扑克（Texas Hold'em）前端项目

一个基于 React + Vite 开发的单机版德州扑克网页应用，支持你与多个 AI 玩家进行完整一局（Preflop / Flop / Turn / River / Showdown）对战。

## 技术栈

- **前端框架**：React 19
- **构建工具**：Vite 7
- **样式方案**：Tailwind CSS 4（含 `@tailwindcss/vite`）
- **代码规范**：ESLint 9
- **语言**：JavaScript（ESM）

## 功能说明

- 支持开局配置：
  - 玩家人数（2 / 3 / 4 / 5 / 6 / 8）
  - 初始筹码（1000 / 2000 / 5000）
- 完整牌局流程：翻牌前、翻牌圈、转牌圈、河牌圈、摊牌
- 盲注与庄位轮转：自动处理 Dealer / SB / BB
- 玩家操作：`Fold`、`Check/Call`、`Raise`、`All-in`
- AI 对手：
  - 基于当前牌面与下注压力做简单决策
  - 带有思考停顿与动作气泡展示
- 牌型判定：支持高牌到皇家同花顺的基础牌型比较
- 视觉表现：
  - 扑克桌面、卡牌、头像座位布局
  - 底池、阶段、当前行动玩家高亮

## 快速开始

```bash
npm install
npm run dev
```

启动后访问终端中显示的本地地址（通常为 `http://localhost:5173`）。

## 常用脚本

```bash
npm run dev      # 本地开发
npm run build    # 生产构建
npm run preview  # 预览构建结果
npm run lint     # 代码检查
```

## 项目结构（核心）

- `src/App.jsx`：主要游戏逻辑与界面组件
- `src/main.jsx`：应用入口
- `src/index.css`：全局样式入口

## 说明

当前为前端本地对战版本，未接入后端服务、多人联机或账户系统。后续可扩展：

- 在线房间与实时对战
- 更完整的边池（Side Pot）结算逻辑
- 更精细的 AI 策略与难度等级
