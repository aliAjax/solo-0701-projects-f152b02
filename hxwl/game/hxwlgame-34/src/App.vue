<script setup lang="ts">
import { ref } from "vue";
import { game } from "./gameMeta";

type Card = { name: string; cost: number; effect: "attack" | "shield" | "heal"; value: number };
const deck: Card[] = [
  { name: "快速打击", cost: 1, effect: "attack", value: 8 },
  { name: "重击", cost: 2, effect: "attack", value: 14 },
  { name: "护盾", cost: 1, effect: "shield", value: 7 },
  { name: "急救", cost: 2, effect: "heal", value: 10 }
];
const hand = ref<Card[]>([]);
const playerHp = ref(42);
const enemyHp = ref(46);
const energy = ref(3);
const shield = ref(0);
const log = ref<string[]>([]);
const history = ref<string[]>(JSON.parse(localStorage.getItem(game.storageKey) || "[]"));

function draw() {
  hand.value = Array.from({ length: 3 }, () => deck[Math.floor(Math.random() * deck.length)]);
}

function reset() {
  playerHp.value = 42;
  enemyHp.value = 46;
  energy.value = 3;
  shield.value = 0;
  log.value = ["新的对局开始。"];
  draw();
}

function play(card: Card, index: number) {
  if (energy.value < card.cost || playerHp.value <= 0 || enemyHp.value <= 0) return;
  energy.value -= card.cost;
  hand.value.splice(index, 1);
  if (card.effect === "attack") enemyHp.value -= card.value;
  if (card.effect === "shield") shield.value += card.value;
  if (card.effect === "heal") playerHp.value = Math.min(42, playerHp.value + card.value);
  log.value.unshift(`使用${card.name}。`);
  if (enemyHp.value <= 0) return finish("玩家胜利");
}

function endTurn() {
  const damage = 9 + Math.floor(Math.random() * 7);
  const real = Math.max(0, damage - shield.value);
  playerHp.value -= real;
  shield.value = 0;
  energy.value = 3;
  draw();
  log.value.unshift(`电脑造成${real}点伤害。`);
  if (playerHp.value <= 0) finish("电脑胜利");
}

function finish(text: string) {
  history.value = [`${text}：玩家${Math.max(playerHp.value, 0)} / 电脑${Math.max(enemyHp.value, 0)}`, ...history.value].slice(0, 5);
  localStorage.setItem(game.storageKey, JSON.stringify(history.value));
  log.value.unshift(text);
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
        <div class="stage"><div class="board cards-board">
            <div v-for="(card, index) in hand" :key="index" class="card" @click="play(card, index)">
              <strong>{{ card.name }}</strong>
              <span>能量{{ card.cost }}</span>
              <span>{{ card.effect }} {{ card.value }}</span>
            </div>
          </div></div>
        <aside class="side"><div class="controls"><button class="primary" @click="reset">重新对局</button><button @click="endTurn">结束回合</button></div>
          <p class="hint">点击手牌消耗能量结算效果，结束回合后电脑自动行动。</p>
          <div class="result">玩家{{ playerHp }}HP / 电脑{{ enemyHp }}HP / 能量{{ energy }} / 护盾{{ shield }}</div>
          <div class="log"><span v-for="item in log" :key="item">{{ item }}</span><span v-for="item in history" :key="item">{{ item }}</span></div></aside>
      </section>
    </div>
  </main>
</template>
