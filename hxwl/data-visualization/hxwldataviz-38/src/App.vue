<script setup lang="ts">
import { computed, nextTick, onMounted, ref, reactive, watch } from "vue";
import { Chart } from "@antv/g2";

type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "select";
  options?: string[];
};

type RecordItem = {
  id: string;
  note: string;
  [key: string]: string | number;
};

const project = {
  "name": "hxwldataviz-38",
  "folder": "hxwl/data-visualization/hxwldataviz-38",
  "framework": "vue",
  "chartLib": "AntV G2",
  "ui": "Element Plus",
  "title": "库存周转分析看板",
  "subtitle": "分析SKU库存、出库趋势、低库存预警和周转排名。",
  "stack": [
    "Vue3",
    "Vite",
    "TypeScript",
    "Element Plus",
    "AntV G2"
  ],
  "storageKey": "hxwldataviz-38-inventory",
  "theme": "#dc2626",
  "prompt": "使用Vue3、Vite、TypeScript、Element Plus和AntV G2实现一个库存周转分析看板，内置SKU库存、入库、出库和安全库存数据，展示库存总量、近7天出库趋势、低库存预警和SKU周转排名。支持按仓库筛选，新增一条出入库记录后需要重新计算全部指标。",
  "filters": {
    "primaryLabel": "仓库",
    "primaryKey": "warehouse",
    "primaryOptions": [
      "全部仓库",
      "上海仓",
      "杭州仓",
      "成都仓"
    ],
    "secondaryLabel": "类型",
    "secondaryKey": "operation",
    "secondaryOptions": [
      "全部类型",
      "入库",
      "出库"
    ]
  },
  "fields": [
    {
      "key": "date",
      "label": "日期",
      "type": "date"
    },
    {
      "key": "warehouse",
      "label": "仓库",
      "type": "select",
      "options": [
        "上海仓",
        "杭州仓",
        "成都仓"
      ]
    },
    {
      "key": "sku",
      "label": "SKU"
    },
    {
      "key": "operation",
      "label": "类型",
      "type": "select",
      "options": [
        "入库",
        "出库"
      ]
    },
    {
      "key": "quantity",
      "label": "数量",
      "type": "number"
    },
    {
      "key": "safeStock",
      "label": "安全库存",
      "type": "number"
    }
  ],
  "records": [
    {
      "date": "2026-06-24",
      "warehouse": "上海仓",
      "sku": "SKU-1008",
      "operation": "入库",
      "quantity": 320,
      "safeStock": 180,
      "note": "补货入库"
    },
    {
      "date": "2026-06-25",
      "warehouse": "上海仓",
      "sku": "SKU-1008",
      "operation": "出库",
      "quantity": 260,
      "safeStock": 180,
      "note": "大客户出库"
    },
    {
      "date": "2026-06-26",
      "warehouse": "杭州仓",
      "sku": "SKU-2217",
      "operation": "出库",
      "quantity": 190,
      "safeStock": 220,
      "note": "库存偏低"
    },
    {
      "date": "2026-06-29",
      "warehouse": "成都仓",
      "sku": "SKU-3302",
      "operation": "入库",
      "quantity": 410,
      "safeStock": 260,
      "note": "区域补货"
    },
    {
      "date": "2026-06-30",
      "warehouse": "杭州仓",
      "sku": "SKU-2217",
      "operation": "出库",
      "quantity": 90,
      "safeStock": 220,
      "note": "继续消耗"
    }
  ],
  "metricLabels": [
    "库存净量",
    "出库量",
    "低库存SKU",
    "周转SKU"
  ]
} as const;
const fields = project.fields as unknown as Field[];

function monthFromDate(value: string) {
  return value.slice(0, 7);
}

function withIds(): RecordItem[] {
  return project.records.map((record, index) => ({
    ...record,
    id: `seed-${index + 1}`
  })) as RecordItem[];
}

function normalizeRecord(form: Record<string, string | number>, note: string): RecordItem {
  const next = { ...form } as RecordItem;
  next.id = crypto.randomUUID();
  next.note = note || "本地新增记录";
  if ("date" in next && !("month" in next)) next.month = monthFromDate(String(next.date));
  return next;
}

function loadRecords(): RecordItem[] {
  const raw = localStorage.getItem(project.storageKey);
  if (!raw) return withIds();
  try {
    return JSON.parse(raw) as RecordItem[];
  } catch {
    return withIds();
  }
}

function createBlank() {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === "number" ? 0 : ""]));
}

function sum(records: RecordItem[], key: string) {
  return records.reduce((acc, record) => acc + Number(record[key] || 0), 0);
}

function groupSum(records: RecordItem[], groupKey: string, valueKey: string) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    const key = String(record[groupKey] || "未分类");
    map.set(key, (map.get(key) || 0) + Number(record[valueKey] || 0));
  });
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function filterRecords(records: RecordItem[], primary: string, secondary: string) {
  return records.filter((record) => {
    const primaryOk = primary.startsWith("全部") || record[project.filters.primaryKey] === primary;
    const secondaryOk = secondary.startsWith("全部") || record[project.filters.secondaryKey] === secondary;
    return primaryOk && secondaryOk;
  });
}


const records = ref<RecordItem[]>(loadRecords());
const form = reactive<Record<string, string | number>>(createBlank());
const note = ref("");
const primary = ref(project.filters.primaryOptions[0]);
const secondary = ref(project.filters.secondaryOptions[0]);
const chartA = ref<HTMLDivElement | null>(null);
const chartB = ref<HTMLDivElement | null>(null);
let chartOne: any = null;
let chartTwo: any = null;

const filtered = computed(() => filterRecords(records.value, primary.value, secondary.value));
const totalAmount = computed(() => sum(filtered.value, "amount") || sum(filtered.value, "quantity"));
const totalQuantity = computed(() => sum(filtered.value, "quantity"));
const groupPrimary = computed(() => groupSum(filtered.value, project.filters.primaryKey, "amount").length ? groupSum(filtered.value, project.filters.primaryKey, "amount") : groupSum(filtered.value, project.filters.primaryKey, "quantity"));
const groupSecondary = computed(() => groupSum(filtered.value, project.filters.secondaryKey, "amount").length ? groupSum(filtered.value, project.filters.secondaryKey, "amount") : groupSum(filtered.value, project.filters.secondaryKey, "quantity"));
const lowStock = computed(() => filtered.value.filter((record) => record.operation === "出库" && Number(record.quantity) >= Number(record.safeStock || 0)).length);

function persist() {
  localStorage.setItem(project.storageKey, JSON.stringify(records.value));
}

function submit() {
  records.value = [normalizeRecord(form, note.value), ...records.value];
  Object.assign(form, createBlank());
  note.value = "";
  persist();
  nextTick(renderCharts);
}

function resetFilter() {
  primary.value = project.filters.primaryOptions[0];
  secondary.value = project.filters.secondaryOptions[0];
}

function renderCharts() {
  if (!chartA.value || !chartB.value) return;
  chartA.value.innerHTML = "";
  chartB.value.innerHTML = "";
  chartOne = new Chart({ container: chartA.value, autoFit: true, height: 280 });
  chartOne.data(groupPrimary.value);
  chartOne.interval().encode("x", "name").encode("y", "value").style("fill", project.theme);
  chartOne.render();
  chartTwo = new Chart({ container: chartB.value, autoFit: true, height: 280 });
  chartTwo.data(groupSecondary.value);
  chartTwo.interval().encode("x", "name").encode("y", "value").style("fill", project.theme);
  chartTwo.render();
}

onMounted(renderCharts);
watch(filtered, () => nextTick(renderCharts), { deep: true });
</script>

<template>
  <main class="app" :style="{ '--theme': project.theme }">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">数据分析与可视化</p>
          <h1>{{ project.title }}</h1>
          <p class="subtitle">{{ project.subtitle }}</p>
        </div>
        <div class="stack"><span v-for="item in project.stack" :key="item" class="tag">{{ item }}</span></div>
      </header>

      <section class="filters">
        <label>{{ project.filters.primaryLabel }}<select v-model="primary"><option v-for="item in project.filters.primaryOptions" :key="item">{{ item }}</option></select></label>
        <label>{{ project.filters.secondaryLabel }}<select v-model="secondary"><option v-for="item in project.filters.secondaryOptions" :key="item">{{ item }}</option></select></label>
        <button class="secondary" type="button" @click="resetFilter">重置筛选</button>
      </section>

      <section class="metrics">
        <article class="metric"><span>{{ project.metricLabels[0] }}</span><strong>{{ totalAmount }}</strong></article>
        <article class="metric"><span>{{ project.metricLabels[1] }}</span><strong>{{ totalQuantity }}</strong></article>
        <article class="metric"><span>{{ project.metricLabels[2] }}</span><strong>{{ lowStock }}</strong></article>
        <article class="metric"><span>{{ project.metricLabels[3] }}</span><strong>{{ groupSecondary[0]?.name || '无' }}</strong></article>
      </section>

      <section class="chart-grid">
        <article class="chart-card"><h2>趋势分析</h2><div ref="chartA" class="chart"></div></article>
        <article class="chart-card"><h2>结构分布</h2><div ref="chartB" class="chart"></div></article>
      </section>

      <section class="workspace">
        <form class="panel" @submit.prevent="submit">
          <h2>新增记录</h2>
          <div class="form-grid">
            <label v-for="field in fields" :key="field.key">
              {{ field.label }}
              <select v-if="field.type === 'select'" v-model="form[field.key]" required>
                <option value="">请选择</option>
                <option v-for="item in field.options" :key="item">{{ item }}</option>
              </select>
              <input v-else v-model="form[field.key]" :type="field.type || 'text'" required />
            </label>
            <label>备注<textarea v-model="note" /></label>
            <button type="submit">保存并刷新</button>
          </div>
        </form>
        <section class="table-panel">
          <h2>明细列表</h2>
          <table>
            <thead><tr><th v-for="field in fields" :key="field.key">{{ field.label }}</th><th>备注</th></tr></thead>
            <tbody><tr v-for="record in filtered" :key="record.id"><td v-for="field in fields" :key="field.key">{{ record[field.key] }}</td><td class="note">{{ record.note }}</td></tr></tbody>
          </table>
        </section>
      </section>
    </div>
  </main>
</template>
