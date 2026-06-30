<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { game } from "./gameMeta";

type Direction = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };
type RunState = "ready" | "playing" | "paused" | "over" | "won";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const runState = ref<RunState>("ready");
const score = ref(0);
const lives = ref(3);
const mode = ref("普通");
const message = ref("按开始进入游戏。");
const recent = ref<number[]>(JSON.parse(localStorage.getItem(game.storageKey) || "[]"));
let timer = 0;
let direction: Direction = "right";
let snake: Point[] = [];
let food: Point = { x: 8, y: 8 };
let player: Point = { x: 1, y: 1 };
let keys = 0;
let enemy = { x: 7, y: 4, dx: 1 };

const cell = 28;
const cols = 24;
const rows = 16;

function reset() {
  runState.value = "playing";
  score.value = 0;
  lives.value = 3;
  message.value = "游戏进行中。";
  direction = "right";
  snake = [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
  food = { x: 14, y: 8 };
  player = { x: 1, y: 1 };
  keys = 0;
}

function finish(text: string, state: RunState = "over") {
  runState.value = state;
  message.value = text;
  recent.value = [score.value, ...recent.value].slice(0, 5);
  localStorage.setItem(game.storageKey, JSON.stringify(recent.value));
}

function drawCell(ctx: CanvasRenderingContext2D, point: Point, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(point.x * cell + 2, point.y * cell + 2, cell - 4, cell - 4);
}

function tick() {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = game.accent;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  if (runState.value !== "playing") {
    ctx.fillStyle = "#dbeafe";
    ctx.font = "24px sans-serif";
    ctx.fillText(message.value, 34, 58);
    return;
  }
  const head = { ...snake[0] };
  if (direction === "up") head.y -= 1;
  if (direction === "down") head.y += 1;
  if (direction === "left") head.x -= 1;
  if (direction === "right") head.x += 1;
  if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || snake.some((part) => part.x === head.x && part.y === head.y)) {
    finish("撞到边界或自己，游戏结束。");
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score.value += 10;
    food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } else {
    snake.pop();
  }
  snake.forEach((part, index) => drawCell(ctx, part, index === 0 ? game.accent : "#22c55e"));
  drawCell(ctx, food, "#f97316");
}

function onKey(event: KeyboardEvent) {
  if (event.key === "ArrowUp") direction = "up";
  if (event.key === "ArrowDown") direction = "down";
  if (event.key === "ArrowLeft") direction = "left";
  if (event.key === "ArrowRight") direction = "right";
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
  timer = window.setInterval(tick, mode.value === "困难" ? 90 : 130);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  window.clearInterval(timer);
});
</script>

<template>
  <main class="app" :style="{ '--accent': game.accent }">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">前端游戏最小闭环</p>
          <h1>{{ game.title }}</h1>
          <p class="subtitle">{{ game.subtitle }}</p>
        </div>
        <div class="stack"><span v-for="item in game.stack" :key="item" class="tag">{{ item }}</span></div>
      </header>
      <section class="hud">
        <div class="stat"><span>分数</span><strong>{{ score }}</strong></div>
        <div class="stat"><span>生命</span><strong>{{ lives }}</strong></div>
        <div class="stat"><span>最近成绩</span><strong>{{ recent[0] || 0 }}</strong></div>
        <div class="stat"><span>状态</span><strong>{{ runState }}</strong></div>
      </section>
      <section class="layout">
        <div class="stage"><canvas ref="canvasRef" :width="cols * cell" :height="rows * cell" /></div>
        <aside class="side">
          <div class="controls">
            <button class="primary" @click="reset">开始/重开</button>
            <button @click="runState = runState === 'playing' ? 'paused' : 'playing'">暂停/继续</button>
            <select v-if="game.type === 'snake'" v-model="mode" class="control"><option>普通</option><option>困难</option></select>
          </div>
          <p class="hint">使用方向键控制移动。当前版本先完成一局游戏的核心闭环，后续可以继续扩展关卡、皮肤和音效。</p>
          <div class="result">{{ message }}</div>
          <div class="log"><span v-for="(item, index) in recent" :key="index">第{{ index + 1 }}次：{{ item }}分</span></div>
        </aside>
      </section>
    </div>
  </main>
</template>
