import { useEffect, useRef, useState } from "react";
import { game as gameMeta } from "./gameMeta";

const game = gameMeta as {
  title: string;
  subtitle: string;
  stack: readonly string[];
  storageKey: string;
  accent: string;
  type: string;
};

type RunState = "ready" | "playing" | "paused" | "over" | "won";

type Actor = { x: number; y: number; w: number; h: number; vx?: number; vy?: number; alive?: boolean };

const width = 900;
const height = 560;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hit(a: Actor, b: Actor) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useRef(new Set<string>());
  const frame = useRef(0);
  const [runState, setRunState] = useState<RunState>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(() => Number(localStorage.getItem(game.storageKey) || 0));
  const [message, setMessage] = useState("按开始进入游戏。");

  const state = useRef({
    player: { x: 410, y: 480, w: 84, h: 28, vx: 0, vy: 0 },
    bird: { x: 170, y: 240, w: 34, h: 34, vy: 0 },
    items: [] as Actor[],
    bullets: [] as Actor[],
    bricks: Array.from({ length: 24 }, (_, i) => ({ x: 60 + (i % 8) * 98, y: 52 + Math.floor(i / 8) * 34, w: 76, h: 22, alive: true })),
    ball: { x: 430, y: 320, w: 18, h: 18, vx: 4, vy: -4 },
    tick: 0
  });

  function reset() {
    state.current = {
      player: { x: 410, y: 480, w: 84, h: 28, vx: 0, vy: 0 },
      bird: { x: 170, y: 240, w: 34, h: 34, vy: 0 },
      items: [],
      bullets: [],
      bricks: Array.from({ length: 24 }, (_, i) => ({ x: 60 + (i % 8) * 98, y: 52 + Math.floor(i / 8) * 34, w: 76, h: 22, alive: true })),
      ball: { x: 430, y: 320, w: 18, h: 18, vx: 4, vy: -4 },
      tick: 0
    };
    setScore(0);
    setLives(3);
    setRunState("playing");
    setMessage("游戏进行中。");
  }

  function finish(nextScore: number, text: string, state: RunState = "over") {
    setRunState(state);
    setMessage(text);
    setBest((old) => {
      const value = Math.max(old, nextScore);
      localStorage.setItem(game.storageKey, String(value));
      return value;
    });
  }

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current.add(event.key);
      if (event.key === " " && game.type === "flappy") state.current.bird.vy = -8;
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const drawActor = (actor: Actor, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    };

    const loop = () => {
      frame.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = game.accent;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      if (runState !== "playing") {
        ctx.fillStyle = "#dbeafe";
        ctx.font = "28px sans-serif";
        ctx.fillText(message, 40, 72);
        return;
      }

      const s = state.current;
      s.tick += 1;

      
      const bird = s.bird;
      bird.vy = (bird.vy || 0) + 0.45;
      bird.y += bird.vy;
      if (s.tick % 120 === 0) {
        const gap = 150;
        const top = 70 + Math.random() * 240;
        s.items.push({ x: width, y: 0, w: 64, h: top, vx: -4 });
        s.items.push({ x: width, y: top + gap, w: 64, h: height - top - gap, vx: -4 });
      }
      s.items.forEach((item) => item.x += item.vx || 0);
      if (bird.y < 0 || bird.y + bird.h > height || s.items.some((item) => hit(bird, item))) finish(score, "撞到障碍，游戏结束。");
      if (s.tick % 60 === 0) setScoreSafe(score + 1);
      s.items = s.items.filter((item) => item.x + item.w > 0);
      drawActor(bird, game.accent);
      s.items.forEach((item) => drawActor(item, "#475569"));
      
      
    };

    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current);
  }, [runState, message]);

  return (
    <main className="app" style={{ "--accent": game.accent } as React.CSSProperties}>
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">前端游戏最小闭环</p>
            <h1>{game.title}</h1>
            <p className="subtitle">{game.subtitle}</p>
          </div>
          <div className="stack">{game.stack.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
        </header>
        <section className="hud">
          <div className="stat"><span>分数</span><strong>{score}</strong></div>
          <div className="stat"><span>生命</span><strong>{lives}</strong></div>
          <div className="stat"><span>最高分</span><strong>{best}</strong></div>
          <div className="stat"><span>状态</span><strong>{runState}</strong></div>
        </section>
        <section className="layout">
          <div className="stage"><canvas ref={canvasRef} width={width} height={height} onPointerDown={() => { if (game.type === "flappy") state.current.bird.vy = -8; }} /></div>
          <aside className="side">
            <div className="controls">
              <button className="primary" onClick={reset}>开始/重开</button>
              <button onClick={() => setRunState((s) => s === "playing" ? "paused" : "playing")}>暂停/继续</button>
            </div>
            <p className="hint">方向键或A/D控制移动，空格用于跳跃或射击。当前项目保留了最小闭环，后续可以继续扩展关卡、素材和音效。</p>
            <div className="result">{message}</div>
          </aside>
        </section>
      </div>
    </main>
  );

  function setScoreSafe(next: number) {
    setScore(next);
    return next;
  }

  function loseLife() {
    setLives((current) => {
      const next = current - 1;
      if (next <= 0) finish(score, "生命耗尽，挑战结束。");
      return Math.max(0, next);
    });
  }
}
