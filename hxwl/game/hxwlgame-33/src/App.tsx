import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { game as gameMeta } from "./gameMeta";

const game = gameMeta as {
  title: string;
  subtitle: string;
  stack: readonly string[];
  storageKey: string;
  accent: string;
  type: string;
};

export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const keys = useRef(new Set<string>());
  const frame = useRef(0);
  const [status, setStatus] = useState("ready");
  const [time, setTime] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(game.storageKey) || 0));

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key);
    const up = (event: KeyboardEvent) => keys.current.delete(event.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function start() {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    setStatus("playing");
    setTime(0);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020617");
    const camera = new THREE.PerspectiveCamera(55, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 7, 9);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#ffffff", "#1e293b", 2.4));
    const floor = new THREE.Mesh(new THREE.BoxGeometry(9, .2, 9), new THREE.MeshStandardMaterial({ color: "#1e293b" }));
    floor.position.y = -.2;
    scene.add(floor);
    const player = new THREE.Mesh(new THREE.BoxGeometry(.7, .7, .7), new THREE.MeshStandardMaterial({ color: game.accent }));
    player.position.y = .35;
    scene.add(player);
    const balls = Array.from({ length: 7 }, (_, index) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 12), new THREE.MeshStandardMaterial({ color: index % 2 ? "#f97316" : "#ef4444" }));
      mesh.position.set((Math.random() - .5) * 8, .28, -4 - index);
      scene.add(mesh);
      return mesh;
    });
    const started = performance.now();

    const loop = () => {
      frame.current = requestAnimationFrame(loop);
      if (keys.current.has("ArrowLeft") || keys.current.has("a")) player.position.x -= .08;
      if (keys.current.has("ArrowRight") || keys.current.has("d")) player.position.x += .08;
      if (keys.current.has("ArrowUp") || keys.current.has("w")) player.position.z -= .08;
      if (keys.current.has("ArrowDown") || keys.current.has("s")) player.position.z += .08;
      player.position.x = THREE.MathUtils.clamp(player.position.x, -4, 4);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -4, 4);
      const elapsed = Math.floor((performance.now() - started) / 1000);
      setTime(elapsed);
      balls.forEach((ball, index) => {
        ball.position.z += .045 + elapsed * .002;
        ball.rotation.x += .08;
        if (ball.position.z > 4.5) {
          ball.position.z = -4.5;
          ball.position.x = (Math.random() - .5) * 8;
        }
        if (ball.position.distanceTo(player.position) < .65) {
          cancelAnimationFrame(frame.current);
          setStatus("over");
          setBest((old) => {
            const next = Math.max(old, elapsed);
            localStorage.setItem(game.storageKey, String(next));
            return next;
          });
        }
      });
      camera.position.x = player.position.x * .35;
      camera.lookAt(player.position);
      renderer.render(scene, camera);
    };
    loop();
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

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
          <div className="stat"><span>存活时间</span><strong>{time}</strong></div>
          <div className="stat"><span>最高纪录</span><strong>{best}</strong></div>
          <div className="stat"><span>状态</span><strong>{status}</strong></div>
          <div className="stat"><span>难度</span><strong>{Math.floor(time / 10) + 1}</strong></div>
        </section>
        <section className="layout">
          <div className="stage"><div className="scene3d" ref={hostRef} /></div>
          <aside className="side">
            <div className="controls"><button className="primary" onClick={start}>开始/重开</button></div>
            <p className="hint">使用WASD或方向键移动角色，躲避滚来的障碍球。存活越久，球速越快。</p>
            <div className="result">{status === "over" ? "碰撞失败，刷新纪录后可重开。" : "保持移动，观察来球方向。"}</div>
          </aside>
        </section>
      </div>
    </main>
  );
}
