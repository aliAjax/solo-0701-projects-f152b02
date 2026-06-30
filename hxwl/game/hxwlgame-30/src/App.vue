<script setup lang="ts">
import { computed, ref } from "vue";
import { game } from "./gameMeta";

const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
const board = ref<string[]>([]);
const score = ref(0);
const moves = ref(24);
const target = 520;
const best = ref(Number(localStorage.getItem(game.storageKey) || 0));
const status = computed(() => score.value >= target ? "胜利" : moves.value <= 0 ? "失败" : "进行中");

function reset() {
  board.value = Array.from({ length: 49 }, () => colors[Math.floor(Math.random() * colors.length)]);
  score.value = 0;
  moves.value = 24;
}

function neighbors(index: number) {
  const row = Math.floor(index / 7);
  const col = index % 7;
  return [index - 7, index + 7, col > 0 ? index - 1 : -1, col < 6 ? index + 1 : -1].filter((item) => item >= 0 && item < 49);
}

function pop(index: number) {
  if (status.value !== "进行中") return;
  const color = board.value[index];
  const group = new Set<number>([index]);
  const queue = [index];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of neighbors(current)) {
      if (!group.has(next) && board.value[next] === color) {
        group.add(next);
        queue.push(next);
      }
    }
  }
  if (group.size < 2) return;
  moves.value -= 1;
  score.value += group.size * group.size * 5;
  group.forEach((item) => board.value[item] = colors[Math.floor(Math.random() * colors.length)]);
  if (score.value > best.value) {
    best.value = score.value;
    localStorage.setItem(game.storageKey, String(best.value));
  }
}

reset();
</script>

<template><main class="app" :style="{ '--accent': game.accent }">
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
        <div class="stat"><span>分数/生命</span><strong>{{ typeof score !== 'undefined' ? score : playerHp }}</strong></div>
        <div class="stat"><span>步数/能量</span><strong>{{ typeof steps !== 'undefined' ? steps : typeof moves !== 'undefined' ? moves : energy }}</strong></div>
        <div class="stat"><span>用时/目标</span><strong>{{ typeof seconds !== 'undefined' ? seconds : typeof target !== 'undefined' ? target : enemyHp }}</strong></div>
        <div class="stat"><span>最佳</span><strong>{{ typeof best !== 'undefined' ? best : history.length }}</strong></div>
      </section>
      <section class="layout">
        <div class="stage"><div class="board blocks">
            <div v-for="(color, index) in board" :key="index" class="tile" :style="{ background: color }" @click="pop(index)"></div>
          </div></div>
        <aside class="side"><div class="controls"><button class="primary" @click="reset">重新开局</button></div>
          <p class="hint">点击两个以上相邻同色方块消除，分数达到{{ target }}即胜利。</p>
          <div class="result">当前状态：{{ status }}</div></aside>
      </section>
    </div>
  </main>
</template>
