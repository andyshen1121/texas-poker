import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- 全局样式注入 (CSS-in-JS) ---
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce-in {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes pulse-ring-green {
    0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
    70% { box-shadow: 0 0 0 12px rgba(74, 222, 128, 0); }
    100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes shine {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  .animate-pulse-ring { animation: pulse-ring-green 2s infinite; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  
  /* 扑克桌布纹理 */
  .poker-felt {
    background-color: #35654d;
    background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%),
                      url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E");
    box-shadow: inset 0 0 60px rgba(0,0,0,0.8);
  }
  
  /* 卡牌背面纹理 */
  .card-back {
    background: repeating-linear-gradient(45deg, #1e3a8a, #1e3a8a 10px, #172554 10px, #172554 20px);
    border: 2px solid #fff;
  }

  /* 玻璃拟态 */
  .glass-panel {
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;
document.head.appendChild(style);

// --- 常量定义 ---
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = { '♠': 'text-slate-900', '♥': 'text-rose-600', '♦': 'text-rose-600', '♣': 'text-slate-900' };
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

const PHASES = {
  SETUP: 'setup',
  WAITING: 'waiting',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown'
};

const PHASE_NAMES = {
  setup: '游戏设置',
  waiting: '等待开始',
  preflop: '翻牌前',
  flop: '翻牌圈',
  turn: '转牌圈',
  river: '河牌圈',
  showdown: '最终摊牌'
};

const HAND_NAMES = {
  10: '皇家同花顺', 9: '同花顺', 8: '四条', 7: '葫芦', 6: '同花',
  5: '顺子', 4: '三条', 3: '两对', 2: '一对', 1: '高牌'
};

const AI_NAMES = ['Alex', 'Bella', 'Chris', 'Diana', 'Ethan', 'Fiona', 'George'];
const AVATARS = ['😎', '🤖', '🦊', '🦁', '🐯', '🐼', '🐨', '🐵'];

// --- 核心逻辑工具函数 (保持原有逻辑不变) ---
const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getCombinations = (arr, size) => {
  const result = [];
  const combine = (start, combo) => {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  };
  combine(0, []);
  return result;
};

const evaluateFiveCards = (cards) => {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const rankCounts = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  let isStraight = false;
  let straightHigh = 0;
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);

  if (uniqueRanks.length >= 5) {
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        isStraight = true;
        straightHigh = uniqueRanks[i];
        break;
      }
    }
    if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.includes(2) &&
      uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  if (isFlush && isStraight && straightHigh === 14) return { rank: 10, value: 14, name: HAND_NAMES[10] };
  if (isFlush && isStraight) return { rank: 9, value: straightHigh, name: HAND_NAMES[9] };
  if (counts[0] === 4) return { rank: 8, value: +Object.keys(rankCounts).find(k => rankCounts[k] === 4), name: HAND_NAMES[8] };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 7, value: +Object.keys(rankCounts).find(k => rankCounts[k] === 3), name: HAND_NAMES[7] };
  if (isFlush) return { rank: 6, value: ranks[0], name: HAND_NAMES[6] };
  if (isStraight) return { rank: 5, value: straightHigh, name: HAND_NAMES[5] };
  if (counts[0] === 3) return { rank: 4, value: +Object.keys(rankCounts).find(k => rankCounts[k] === 3), name: HAND_NAMES[4] };
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
    return { rank: 3, value: pairs[0] * 100 + pairs[1], name: HAND_NAMES[3] };
  }
  if (counts[0] === 2) return { rank: 2, value: +Object.keys(rankCounts).find(k => rankCounts[k] === 2), name: HAND_NAMES[2] };
  return { rank: 1, value: ranks[0], name: HAND_NAMES[1] };
};

const evaluateHand = (cards) => {
  if (cards.length < 5) return { rank: 0, value: 0, name: '牌不足' };
  const allCombinations = getCombinations(cards, 5);
  let bestHand = { rank: 0, value: 0, name: '高牌' };
  for (const combo of allCombinations) {
    const hand = evaluateFiveCards(combo);
    if (hand.rank > bestHand.rank || (hand.rank === bestHand.rank && hand.value > bestHand.value)) {
      bestHand = hand;
    }
  }
  return bestHand;
};

const getPlayerPosition = (index, totalPlayers) => {
  // 优化后的椭圆分布算法，让座位更合理
  if (index === 0) return { x: 50, y: 88 }; // 玩家自己，稍微靠下

  const angleOffset = -90; // 顶部开始
  const angleRange = 360;
  const step = angleRange / totalPlayers;
  const angle = (angleOffset + step * index) * (Math.PI / 180);

  // 桌面半径调整
  const rx = 44;
  const ry = 36;

  const x = 50 + rx * Math.cos(angle);
  const y = 48 + ry * Math.sin(angle); // 稍微上移圆心

  return { x, y };
};

// --- UI 组件 ---

// 1. 卡牌组件
const Card = ({ card, hidden = false, size = 'normal', className = '' }) => {
  const sizeClasses = {
    small: "w-8 h-12 text-xs rounded",
    normal: "w-12 h-16 text-sm rounded-md",
    large: "w-14 h-20 text-base rounded-lg",
    xl: "w-16 h-24 text-xl rounded-lg"
  };

  const baseClass = `relative shadow-lg flex flex-col items-center justify-center font-bold select-none transition-transform duration-200 hover:-translate-y-1 ${sizeClasses[size]} ${className}`;

  if (hidden) {
    return (
      <div className={`${baseClass} card-back border-2 border-white/20`}>
        <div className="w-4 h-4 rounded-full bg-blue-500/20 absolute"></div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className={`${baseClass} bg-slate-800/40 border-2 border-dashed border-slate-600`}></div>
    );
  }

  return (
    <div className={`${baseClass} bg-white border border-gray-300`}>
      <span className={`absolute top-0.5 left-1 ${SUIT_COLORS[card.suit]}`}>{card.rank}</span>
      <span className={`${size === 'small' ? 'text-sm' : 'text-2xl'} ${SUIT_COLORS[card.suit]}`}>{card.suit}</span>
      <span className={`absolute bottom-0.5 right-1 transform rotate-180 ${SUIT_COLORS[card.suit]}`}>{card.rank}</span>
    </div>
  );
};

// 2. 庄家/盲注按钮
const DealerButton = ({ type }) => {
  const styles = {
    dealer: 'bg-yellow-500 text-yellow-900 border-yellow-300',
    sb: 'bg-indigo-500 text-white border-indigo-300',
    bb: 'bg-rose-500 text-white border-rose-300'
  };
  const labels = { dealer: 'D', sb: 'S', bb: 'B' };

  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-md ${styles[type]}`}>
      {labels[type]}
    </div>
  );
};

// 3. 动作气泡
const ActionBubble = ({ action }) => {
  if (!action) return null;

  const styles = {
    fold: 'bg-gray-800 text-gray-400 border-gray-600',
    check: 'bg-emerald-800 text-emerald-100 border-emerald-600',
    call: 'bg-blue-800 text-blue-100 border-blue-600',
    raise: 'bg-amber-700 text-amber-100 border-amber-500',
    allin: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400'
  };

  const config = {
    fold: { text: '弃牌' },
    check: { text: '过牌' },
    call: { text: `跟注 ${action.amount || ''}` },
    raise: { text: `加注 ${action.amount}` },
    allin: { text: 'ALL IN' }
  };

  const style = styles[action.type] || styles.check;
  const content = config[action.type];

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 z-30 animate-bounce-in">
      <div className={`${style} px-3 py-1 rounded-full text-xs font-bold border shadow-lg whitespace-nowrap`}>
        {content.text}
      </div>
    </div>
  );
};

// 4. 玩家座位组件
const PlayerSeat = ({ player, isUser, showCards, isCurrent, position, aiAction, isAiThinking, totalPlayers }) => {
  // 计算座位是否在底部（用户侧），用于调整弹窗方向等
  const isBottomSide = position.y > 60;

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className="relative flex flex-col items-center">
        {/* 行动/思考 气泡 */}
        {(aiAction || isAiThinking) && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-40">
            {isAiThinking ? (
              <div className="bg-slate-800 text-blue-300 px-3 py-1 rounded-full text-xs border border-slate-600 flex items-center gap-1 shadow-lg">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            ) : (
              <ActionBubble action={aiAction} />
            )}
          </div>
        )}

        {/* 头像区域 */}
        <div className={`relative group ${player.hasFolded ? 'opacity-50 grayscale' : ''}`}>
          {/* 倒计时/当前行动光环 */}
          {isCurrent && (
            <div className="absolute inset-0 -m-1 rounded-full border-2 border-green-400 animate-pulse-ring"></div>
          )}

          {/* 头像圆圈 */}
          <div className={`w-14 h-14 rounded-full border-2 shadow-xl flex items-center justify-center bg-slate-800 overflow-hidden relative z-10
            ${isCurrent ? 'border-green-400' : 'border-slate-600'}
            ${player.isAllIn ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}
          `}>
            <span className="text-2xl">{isUser ? AVATARS[0] : AVATARS[player.id % AVATARS.length]}</span>
          </div>

          {/* 按钮徽章 (Dealer/SB/BB) */}
          <div className="absolute -top-1 -right-2 z-20 flex flex-col gap-1">
            {player.isDealer && <DealerButton type="dealer" />}
            {player.isSmallBlind && <DealerButton type="sb" />}
            {player.isBigBlind && <DealerButton type="bb" />}
          </div>
        </div>

        {/* 玩家信息面板 */}
        <div className={`mt-2 glass-panel px-3 py-1 rounded-lg flex flex-col items-center min-w-[80px] transition-colors
          ${isCurrent ? 'bg-slate-800/90 border-green-500/50' : ''}
          ${player.hasFolded ? 'bg-slate-900/50' : ''}
        `}>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-bold truncate max-w-[60px] ${isCurrent ? 'text-green-400' : 'text-slate-300'}`}>
              {player.name}
            </span>
          </div>
          <div className="text-amber-400 text-xs font-mono font-bold flex items-center gap-1">
            <span>$</span>{player.chips}
          </div>
        </div>

        {/* 手牌展示 */}
        {!player.hasFolded && (
          <div className={`absolute z-0 transition-all duration-300 flex gap-[-20px]
            ${isUser ? '-top-10 scale-110' : 'top-4 scale-75 opacity-0 group-hover:opacity-100'} 
            ${(showCards || isUser) ? 'opacity-100' : ''}
          `}>
            {player.cards.map((card, idx) => (
              <div key={idx} className={`transform ${idx === 0 ? '-rotate-6 translate-x-2' : 'rotate-6 -translate-x-2'}`}>
                <Card
                  card={card}
                  hidden={!isUser && !showCards}
                  size={isUser ? "normal" : "small"}
                />
              </div>
            ))}
          </div>
        )}

        {/* 当前轮下注额 */}
        {player.currentBet > 0 && (
          <div className="absolute top-10 right-full mr-2 bg-slate-900/80 text-white text-xs px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 shadow-sm whitespace-nowrap">
            <span className="text-yellow-500">🪙</span>
            {player.currentBet}
          </div>
        )}

        {/* 牌型结果显示 */}
        {showCards && player.handResult && !player.hasFolded && (
          <div className="absolute -bottom-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-30 whitespace-nowrap animate-bounce-in">
            {player.handResult.name}
          </div>
        )}
      </div>
    </div>
  );
};

// 5. 设置界面
const SetupScreen = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState(4);
  const [startingChips, setStartingChips] = useState(2000);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-md w-full glass-panel rounded-2xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-amber-600 text-center mb-2">
          Texas Hold'em
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8 tracking-wider">PRO EDITION</p>

        <div className="space-y-8">
          <div>
            <label className="block text-slate-300 font-bold mb-3 text-sm uppercase tracking-wide">Players</label>
            <div className="flex justify-between gap-2 bg-slate-900/50 p-1.5 rounded-lg">
              {[2, 3, 4, 5, 6, 8].map(num => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${playerCount === num
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-3 text-sm uppercase tracking-wide">Buy-In</label>
            <div className="grid grid-cols-3 gap-3">
              {[1000, 2000, 5000].map(chips => (
                <button
                  key={chips}
                  onClick={() => setStartingChips(chips)}
                  className={`py-3 rounded-lg border font-bold transition-all flex items-center justify-center gap-1 ${startingChips === chips
                    ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <span className="text-xs">$</span>{chips}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart(playerCount, startingChips)}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-900/50 transition-all transform hover:-translate-y-0.5"
          >
            START GAME
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 主游戏组件 ---
export default function TexasHoldem() {
  const [gameConfig, setGameConfig] = useState({ playerCount: 0, startingChips: 1000 });
  const [deck, setDeck] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [pot, setPot] = useState(0);
  const [phase, setPhase] = useState(PHASES.SETUP);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(-1);
  const [currentBet, setCurrentBet] = useState(0);
  const [minRaise, setMinRaise] = useState(20);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState(null);
  const [raiseAmount, setRaiseAmount] = useState(40);
  const [actionCount, setActionCount] = useState(0);
  const [lastAggressor, setLastAggressor] = useState(-1);
  const [aiActions, setAiActions] = useState({});
  const [thinkingPlayer, setThinkingPlayer] = useState(-1);

  const isProcessing = useRef(false);
  const SMALL_BLIND = 10;
  const BIG_BLIND = 20;

  // --- 游戏逻辑方法 (复用原有逻辑) ---
  const initializePlayers = useCallback((count, chips) => {
    const newPlayers = [{
      id: 0, name: 'YOU', chips, cards: [], isDealer: false, isSmallBlind: false, isBigBlind: false,
      hasFolded: false, currentBet: 0, isAllIn: false, isAI: false, handResult: null
    }];
    for (let i = 1; i < count; i++) {
      newPlayers.push({
        id: i, name: AI_NAMES[i - 1] || `AI${i}`, chips, cards: [], isDealer: false, isSmallBlind: false,
        isBigBlind: false, hasFolded: false, currentBet: 0, isAllIn: false, isAI: true, handResult: null
      });
    }
    return newPlayers;
  }, []);

  const getNextActivePlayer = useCallback((currentIdx, playerList, skipFolded = true, skipAllIn = true) => {
    const count = playerList.length;
    for (let i = 1; i <= count; i++) {
      const nextIdx = (currentIdx + i) % count;
      const player = playerList[nextIdx];
      if (skipFolded && player.hasFolded) continue;
      if (skipAllIn && player.isAllIn) continue;
      return nextIdx;
    }
    return -1;
  }, []);

  const isRoundComplete = useCallback((playerList, bet, actions, aggressor) => {
    const activePlayers = playerList.filter(p => !p.hasFolded && !p.isAllIn);
    if (playerList.filter(p => !p.hasFolded).length <= 1) return true;
    if (activePlayers.length === 0) return true;
    const allBetsEqual = activePlayers.every(p => p.currentBet === bet);
    const minActions = activePlayers.length;
    return allBetsEqual && actions >= minActions;
  }, []);

  const determineWinner = useCallback((currentPlayers, currentPot, cards) => {
    const activePlayers = currentPlayers.filter(p => !p.hasFolded);
    let winMsg = "";

    if (activePlayers.length === 1) {
      const winnerPlayer = activePlayers[0];
      setPlayers(prev => prev.map(p =>
        p.id === winnerPlayer.id ? { ...p, chips: p.chips + currentPot } : p
      ));
      setWinner(winnerPlayer.name);
      winMsg = `${winnerPlayer.name} wins $${currentPot}`;
    } else {
      const evaluated = activePlayers.map(p => ({
        ...p,
        handResult: evaluateHand([...p.cards, ...cards])
      }));

      evaluated.sort((a, b) => {
        if (b.handResult.rank !== a.handResult.rank) return b.handResult.rank - a.handResult.rank;
        return b.handResult.value - a.handResult.value;
      });

      const winnerPlayer = evaluated[0];
      // 处理平局逻辑略过，直接给第一名
      setPlayers(prev => prev.map(p => {
        const ev = evaluated.find(e => e.id === p.id);
        return {
          ...p,
          chips: p.id === winnerPlayer.id ? p.chips + currentPot : p.chips,
          handResult: ev?.handResult || null
        };
      }));
      setWinner(winnerPlayer.name);
      winMsg = `${winnerPlayer.name} wins with ${winnerPlayer.handResult.name}`;
    }
    setMessage(winMsg);
    setPhase(PHASES.SHOWDOWN);
  }, []);

  const advancePhase = useCallback((currentDeck, currentCommunityCards, currentPlayers, currentPot) => {
    if (currentPlayers.filter(p => !p.hasFolded).length <= 1) {
      determineWinner(currentPlayers, currentPot, currentCommunityCards);
      return;
    }

    const newDeck = [...currentDeck];
    let newCommunityCards = [...currentCommunityCards];
    let nextPhase = phase;

    const resetPlayers = currentPlayers.map(p => ({ ...p, currentBet: 0 }));

    if (phase === PHASES.PREFLOP) {
      nextPhase = PHASES.FLOP;
      newCommunityCards = [newDeck.pop(), newDeck.pop(), newDeck.pop()];
    } else if (phase === PHASES.FLOP) {
      nextPhase = PHASES.TURN;
      newCommunityCards.push(newDeck.pop());
    } else if (phase === PHASES.TURN) {
      nextPhase = PHASES.RIVER;
      newCommunityCards.push(newDeck.pop());
    } else if (phase === PHASES.RIVER) {
      determineWinner(resetPlayers, currentPot, newCommunityCards);
      return;
    }

    setDeck(newDeck);
    setCommunityCards(newCommunityCards);
    setPhase(nextPhase);
    setPlayers(resetPlayers);
    setCurrentBet(0);
    setActionCount(0);
    setLastAggressor(-1);
    setAiActions({});

    const dealerIdx = resetPlayers.findIndex(p => p.isDealer);
    const firstToAct = getNextActivePlayer(dealerIdx, resetPlayers);

    if (firstToAct === -1) {
      setTimeout(() => advancePhase(newDeck, newCommunityCards, resetPlayers, currentPot), 500);
      return;
    }

    setCurrentPlayer(firstToAct);
    setMessage(firstToAct === 0 ? 'Your Turn' : `${resetPlayers[firstToAct].name} is thinking...`);
  }, [phase, determineWinner, getNextActivePlayer]);

  const processAfterAction = useCallback((updatedPlayers, newPot, newCurrentBet, newMinRaise, newActionCount, newLastAggressor, actingPlayer) => {
    setPlayers(updatedPlayers);
    setPot(newPot);
    setCurrentBet(newCurrentBet);
    setMinRaise(newMinRaise);
    setActionCount(newActionCount);
    setLastAggressor(newLastAggressor);

    if (isRoundComplete(updatedPlayers, newCurrentBet, newActionCount, newLastAggressor)) {
      setCurrentPlayer(-1);
      setThinkingPlayer(-1);
      setTimeout(() => {
        setAiActions({});
        advancePhase(deck, communityCards, updatedPlayers, newPot);
      }, 1000);
      return;
    }

    const nextPlayer = getNextActivePlayer(actingPlayer, updatedPlayers);
    if (nextPlayer === -1) {
      setCurrentPlayer(-1);
      setTimeout(() => advancePhase(deck, communityCards, updatedPlayers, newPot), 500);
      return;
    }

    setCurrentPlayer(nextPlayer);
    setMessage(nextPlayer === 0 ? 'Your Turn' : `${updatedPlayers[nextPlayer].name} is thinking...`);
  }, [isRoundComplete, advancePhase, deck, communityCards, getNextActivePlayer]);

  const handleAction = useCallback((action, amount = 0) => {
    if (isProcessing.current || currentPlayer !== 0) return;

    const player = { ...players[0] };
    let newPot = pot;
    let newCurrentBet = currentBet;
    let newMinRaise = minRaise;
    let newActionCount = actionCount + 1;
    let newLastAggressor = lastAggressor;
    const updatedPlayers = [...players];

    if (action === 'fold') {
      player.hasFolded = true;
      updatedPlayers[0] = player;
      setPlayers(updatedPlayers);
      if (updatedPlayers.filter(p => !p.hasFolded).length <= 1) {
        determineWinner(updatedPlayers, pot, communityCards);
      } else {
        processAfterAction(updatedPlayers, newPot, newCurrentBet, newMinRaise, newActionCount, newLastAggressor, 0);
      }
      return;
    }

    if (action === 'call') {
      const callAmount = Math.min(currentBet - player.currentBet, player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      newPot += callAmount;
      if (player.chips === 0) player.isAllIn = true;
    }

    if (action === 'raise') {
      const totalBet = amount;
      const additionalBet = totalBet - player.currentBet;
      player.chips -= additionalBet;
      player.currentBet = totalBet;
      newPot += additionalBet;
      newMinRaise = totalBet - currentBet;
      newCurrentBet = totalBet;
      newLastAggressor = 0;
      newActionCount = 1;
      if (player.chips === 0) player.isAllIn = true;
    }

    if (action === 'allin') {
      const allInAmount = player.chips;
      const newBet = player.currentBet + allInAmount;
      if (newBet > currentBet) {
        newMinRaise = newBet - currentBet;
        newCurrentBet = newBet;
        newLastAggressor = 0;
        newActionCount = 1;
      }
      player.chips = 0;
      player.currentBet = newBet;
      player.isAllIn = true;
      newPot += allInAmount;
    }

    updatedPlayers[0] = player;
    processAfterAction(updatedPlayers, newPot, newCurrentBet, newMinRaise, newActionCount, newLastAggressor, 0);
  }, [currentPlayer, players, pot, currentBet, minRaise, actionCount, lastAggressor, communityCards, determineWinner, processAfterAction]);

  useEffect(() => {
    if (phase === PHASES.SETUP || phase === PHASES.WAITING || phase === PHASES.SHOWDOWN) return;
    if (currentPlayer <= 0) return;
    if (!players[currentPlayer] || players[currentPlayer].hasFolded || players[currentPlayer].isAllIn) return;
    if (isProcessing.current) return;

    isProcessing.current = true;
    setThinkingPlayer(currentPlayer);

    const aiTimer = setTimeout(() => {
      const aiIdx = currentPlayer;
      const ai = { ...players[aiIdx] };
      let newPot = pot;
      let newCurrentBet = currentBet;
      let newMinRaise = minRaise;
      let newActionCount = actionCount + 1;
      let newLastAggressor = lastAggressor;

      const callAmount = currentBet - ai.currentBet;
      const canCheck = callAmount === 0;
      const random = Math.random();
      const handStrength = evaluateHand([...ai.cards, ...communityCards]).rank;

      let action = canCheck ? 'check' : 'call';
      if (handStrength >= 4 && random < 0.4 && ai.chips > currentBet + minRaise) {
        action = 'raise';
      } else if (handStrength <= 1 && random < 0.25 && callAmount > 50) {
        action = 'fold';
      } else if (callAmount > ai.chips * 0.4 && handStrength < 3 && random < 0.3) {
        action = 'fold';
      }

      let actionDisplay = null;
      setThinkingPlayer(-1);
      const updatedPlayers = [...players];

      if (action === 'fold') {
        ai.hasFolded = true;
        actionDisplay = { type: 'fold' };
      } else if (action === 'check') {
        actionDisplay = { type: 'check' };
      } else if (action === 'call') {
        const actualCall = Math.min(callAmount, ai.chips);
        ai.chips -= actualCall;
        ai.currentBet += actualCall;
        newPot += actualCall;
        if (ai.chips === 0) ai.isAllIn = true;
        actionDisplay = actualCall > 0 ? { type: 'call', amount: actualCall } : { type: 'check' };
      } else if (action === 'raise') {
        const raiseTotal = Math.min(currentBet + minRaise * 2, ai.chips + ai.currentBet);
        const additionalBet = raiseTotal - ai.currentBet;
        ai.chips -= additionalBet;
        ai.currentBet = raiseTotal;
        newPot += additionalBet;
        newCurrentBet = raiseTotal;
        newMinRaise = raiseTotal - currentBet;
        newLastAggressor = aiIdx;
        newActionCount = 1;
        if (ai.chips === 0) ai.isAllIn = true;
        actionDisplay = { type: 'raise', amount: raiseTotal };
      }

      setAiActions(prev => ({ ...prev, [aiIdx]: actionDisplay }));
      updatedPlayers[aiIdx] = ai;

      setTimeout(() => {
        if (action === 'fold' && updatedPlayers.filter(p => !p.hasFolded).length <= 1) {
          setPlayers(updatedPlayers);
          determineWinner(updatedPlayers, newPot, communityCards);
          isProcessing.current = false;
          return;
        }
        processAfterAction(updatedPlayers, newPot, newCurrentBet, newMinRaise, newActionCount, newLastAggressor, aiIdx);
        isProcessing.current = false;
      }, 800);
    }, 1000 + Math.random() * 1000);
    return () => clearTimeout(aiTimer);
  }, [currentPlayer, phase, players, pot, currentBet, minRaise, actionCount, lastAggressor, communityCards, determineWinner, processAfterAction]);

  const startNewGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    let newDealerIdx = 0;
    if (players.length > 0) {
      const currentDealerIdx = players.findIndex(p => p.isDealer);
      newDealerIdx = (currentDealerIdx + 1) % players.length;
    }
    const newPlayers = players.map((p, idx) => ({
      ...p,
      cards: [newDeck.pop(), newDeck.pop()],
      hasFolded: false, currentBet: 0, isAllIn: false,
      isDealer: idx === newDealerIdx, isSmallBlind: false, isBigBlind: false, handResult: null
    }));
    const sbIdx = (newDealerIdx + 1) % newPlayers.length;
    const bbIdx = (newDealerIdx + 2) % newPlayers.length;
    newPlayers[sbIdx].isSmallBlind = true;
    newPlayers[sbIdx].chips -= SMALL_BLIND;
    newPlayers[sbIdx].currentBet = SMALL_BLIND;
    newPlayers[bbIdx].isBigBlind = true;
    newPlayers[bbIdx].chips -= BIG_BLIND;
    newPlayers[bbIdx].currentBet = BIG_BLIND;

    setDeck(newDeck);
    setCommunityCards([]);
    setPot(SMALL_BLIND + BIG_BLIND);
    setPhase(PHASES.PREFLOP);
    setPlayers(newPlayers);
    setCurrentBet(BIG_BLIND);
    setMinRaise(BIG_BLIND);
    setWinner(null);
    setActionCount(0);
    setLastAggressor(-1);
    setRaiseAmount(BIG_BLIND * 2);
    setAiActions({});
    setThinkingPlayer(-1);
    const firstToAct = (bbIdx + 1) % newPlayers.length;
    setCurrentPlayer(firstToAct);
    setMessage(firstToAct === 0 ? 'Your Turn' : `${newPlayers[firstToAct].name} is thinking...`);
  }, [players]);

  const handleSetup = (count, chips) => {
    const newPlayers = initializePlayers(count, chips);
    newPlayers[0].isDealer = true;
    setPlayers(newPlayers);
    setGameConfig({ playerCount: count, startingChips: chips });
    setPhase(PHASES.WAITING);
  };

  if (phase === PHASES.SETUP) return <SetupScreen onStart={handleSetup} />;

  const player = players[0] || { chips: 0, currentBet: 0 };
  const callAmount = currentBet - player.currentBet;
  const canCheck = callAmount === 0;
  const canRaise = player.chips > callAmount + minRaise;
  const isPlayerTurn = currentPlayer === 0 && !player.hasFolded && !player.isAllIn && phase !== PHASES.WAITING && phase !== PHASES.SHOWDOWN;

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      {/* 顶部状态栏 */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/80 border-b border-white/5 flex items-center justify-between px-6 z-50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="text-amber-500 text-xl">♠️</div>
          <span className="text-slate-200 font-bold tracking-wider">CASINO ROYALE</span>
        </div>
        <div className="bg-slate-800 px-4 py-1 rounded-full border border-slate-700">
          <span className="text-slate-400 text-xs uppercase mr-2">{PHASE_NAMES[phase]}</span>
          <span className="text-emerald-400 font-bold text-sm">{message}</span>
        </div>
        <button onClick={() => setPhase(PHASES.SETUP)} className="text-slate-500 hover:text-white transition-colors">
          Exit
        </button>
      </div>

      {/* 游戏主区域 */}
      <div className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_100%)]">

        {/* 扑克桌 */}
        <div className="relative w-[90%] max-w-5xl aspect-[1.8/1] rounded-[150px] border-[16px] border-[#3e2723] shadow-[0_20px_50px_rgba(0,0,0,0.8)] poker-felt">

          {/* 桌面 Logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none">
            <span className="text-6xl font-serif text-black font-bold tracking-widest">POKER</span>
          </div>

          {/* 公共牌区域 */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3 z-10">
            {communityCards.map((card, i) => (
              <div key={i} className="animate-bounce-in" style={{ animationDelay: `${i * 100}ms` }}>
                <Card card={card} size="large" />
              </div>
            ))}
            {communityCards.length === 0 && phase !== PHASES.WAITING && (
              <div className="text-white/10 font-bold tracking-widest text-sm mt-8 border-2 border-dashed border-white/10 px-4 py-2 rounded">
                COMMUNITY CARDS
              </div>
            )}
          </div>

          {/* 底池显示 */}
          <div className="absolute top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-amber-500/30 flex items-center gap-2 shadow-lg">
              <span className="text-amber-400 text-lg">🪙</span>
              <span className="text-white font-mono text-xl font-bold tracking-wide">${pot}</span>
            </div>
          </div>

          {/* 玩家座位渲染 */}
          {players.map((p, idx) => (
            <PlayerSeat
              key={p.id}
              player={p}
              isUser={idx === 0}
              showCards={phase === PHASES.SHOWDOWN}
              isCurrent={currentPlayer === idx}
              position={getPlayerPosition(idx, players.length)}
              aiAction={aiActions[idx]}
              isAiThinking={thinkingPlayer === idx}
              totalPlayers={players.length}
            />
          ))}
        </div>
      </div>

      {/* 底部控制栏 (HUD) */}
      <div className="h-24 bg-gradient-to-t from-black to-slate-900 border-t border-white/10 flex items-center justify-between px-4 lg:px-12 z-50">

        {/* 左侧：玩家自身状态简略 */}
        <div className="hidden md:flex flex-col">
          <span className="text-slate-400 text-xs uppercase tracking-wider">My Stack</span>
          <span className="text-amber-400 font-mono text-2xl font-bold">${player.chips}</span>
        </div>

        {/* 中间：控制按钮组 */}
        <div className="flex-1 flex justify-center items-center gap-3">
          {(phase === PHASES.WAITING || phase === PHASES.SHOWDOWN) ? (
            <button
              onClick={startNewGame}
              className="px-12 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-bold text-lg rounded-full shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>{phase === PHASES.SHOWDOWN ? 'Next Hand' : 'Deal Cards'}</span>
              <span className="text-xl">➔</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAction('fold')}
                disabled={!isPlayerTurn}
                className="px-6 py-3 rounded-lg bg-slate-800 text-rose-400 font-bold border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                FOLD
              </button>

              <button
                onClick={() => handleAction(canCheck ? 'check' : 'call')}
                disabled={!isPlayerTurn}
                className="px-8 py-3 rounded-lg bg-blue-900/80 text-blue-200 font-bold border border-blue-700 hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {canCheck ? 'CHECK' : `CALL $${callAmount}`}
              </button>

              {canRaise && (
                <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                  <div className="flex flex-col px-2">
                    <span className="text-[10px] text-slate-400">RAISE TO</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">${raiseAmount}</span>
                  </div>
                  <input
                    type="range"
                    min={currentBet + minRaise}
                    max={player.chips + player.currentBet}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Number(e.target.value))}
                    className="w-24 md:w-32 accent-emerald-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    disabled={!isPlayerTurn}
                  />
                  <button
                    onClick={() => handleAction('raise', raiseAmount)}
                    disabled={!isPlayerTurn}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow disabled:opacity-30 transition-all"
                  >
                    RAISE
                  </button>
                </div>
              )}

              <button
                onClick={() => handleAction('allin')}
                disabled={!isPlayerTurn || player.chips === 0}
                className="px-4 py-3 rounded-lg bg-gradient-to-r from-purple-900 to-pink-900 text-purple-200 font-bold border border-purple-700 hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ALL IN
              </button>
            </>
          )}
        </div>

        {/* 右侧：盲注信息 */}
        <div className="hidden md:flex flex-col items-end text-right">
          <span className="text-slate-400 text-xs uppercase tracking-wider">Blinds</span>
          <span className="text-slate-200 font-mono text-sm font-bold">${SMALL_BLIND} / ${BIG_BLIND}</span>
        </div>
      </div>
    </div>
  );
}