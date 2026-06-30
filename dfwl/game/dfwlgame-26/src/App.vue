<script setup lang="ts">
import { computed, ref } from "vue";
import { game } from "./gameMeta";

type Card = { id: number; value: string; open: boolean; matched: boolean };
const values = ["A", "B", "C", "D", "E", "F", "G", "H"];
const cards = ref<Card[]>([]);
const opened = ref<number[]>([]);
const steps = ref(0);
const seconds = ref(0);
const timer = ref(0);
const best = ref(Number(localStorage.getItem(game.storageKey) || 0));

const done = computed(() => cards.value.length > 0 && cards.value.every((card) => card.matched));

function shuffle<T>(items: T[]) {
  return items.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

function reset() {
  window.clearInterval(timer.value);
  cards.value = shuffle([...values, ...values]).map((value, id) => ({ id, value, open: false, matched: false }));
  opened.value = [];
  steps.value = 0;
  seconds.value = 0;
  timer.value = window.setInterval(() => seconds.value += 1, 1000);
}

function flip(card: Card) {
  if (card.open || card.matched || opened.value.length === 2) return;
  card.open = true;
  opened.value.push(card.id);
  if (opened.value.length === 2) {
    steps.value += 1;
    const pair = opened.value.map((id) => cards.value.find((item) => item.id === id)!);
    if (pair[0].value === pair[1].value) {
      pair.forEach((item) => item.matched = true);
      opened.value = [];
      if (cards.value.every((item) => item.matched)) {
        window.clearInterval(timer.value);
        best.value = best.value ? Math.min(best.value, steps.value) : steps.value;
        localStorage.setItem(game.storageKey, String(best.value));
      }
    } else {
      window.setTimeout(() => {
        pair.forEach((item) => item.open = false);
        opened.value = [];
      }, 650);
    }
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
        <div class="stage"><div class="board memory">
            <div v-for="card in cards" :key="card.id" class="tile" :class="{ hidden: !card.open && !card.matched, matched: card.matched }" @click="flip(card)">{{ card.value }}</div>
          </div></div>
        <aside class="side"><div class="controls"><button class="primary" @click="reset">重新开局</button></div>
          <p class="hint">点击两张卡牌寻找相同图案，全部配对即通关。</p>
          <div class="result">{{ done ? '通关完成，可以继续刷新成绩。' : '保持记忆，减少无效翻牌。' }}</div></aside>
      </section>
    </div>
  </main>
</template>
