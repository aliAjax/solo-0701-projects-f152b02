<script setup lang="ts">
import { computed, nextTick, onMounted, ref, reactive, watch } from "vue";
import * as echarts from "echarts";

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
  "name": "dfwldataviz-36",
  "folder": "dfwl/data-visualization/dfwldataviz-36",
  "framework": "vue",
  "chartLib": "ECharts",
  "title": "销售日报可视化页面",
  "subtitle": "查看销售额趋势、商品销量排行和渠道占比。",
  "stack": [
    "Vue3",
    "Vite",
    "TypeScript",
    "ECharts"
  ],
  "storageKey": "dfwldataviz-36-sales",
  "theme": "#16a34a",
  "prompt": "使用Vue3、Vite、TypeScript和ECharts实现一个销售日报可视化页面，内置一周销售数据，展示销售额趋势、商品销量排行和渠道占比。支持切换日期查看当天明细，并提供一个新增销售记录表单，保存后图表和表格实时刷新。",
  "filters": {
    "primaryLabel": "日期",
    "primaryKey": "date",
    "primaryOptions": [
      "全部日期",
      "2026-06-24",
      "2026-06-25",
      "2026-06-26",
      "2026-06-27",
      "2026-06-28",
      "2026-06-29",
      "2026-06-30"
    ],
    "secondaryLabel": "渠道",
    "secondaryKey": "channel",
    "secondaryOptions": [
      "全部渠道",
      "门店",
      "小程序",
      "直播",
      "分销"
    ]
  },
  "fields": [
    {
      "key": "date",
      "label": "日期",
      "type": "date"
    },
    {
      "key": "product",
      "label": "商品"
    },
    {
      "key": "channel",
      "label": "渠道",
      "type": "select",
      "options": [
        "门店",
        "小程序",
        "直播",
        "分销"
      ]
    },
    {
      "key": "amount",
      "label": "销售额",
      "type": "number"
    },
    {
      "key": "quantity",
      "label": "销量",
      "type": "number"
    }
  ],
  "records": [
    {
      "date": "2026-06-24",
      "product": "补给包A",
      "channel": "门店",
      "amount": 12800,
      "quantity": 128,
      "note": "线下促销"
    },
    {
      "date": "2026-06-25",
      "product": "补给包B",
      "channel": "小程序",
      "amount": 18400,
      "quantity": 164,
      "note": "会员日"
    },
    {
      "date": "2026-06-26",
      "product": "能量饮",
      "channel": "直播",
      "amount": 22100,
      "quantity": 260,
      "note": "直播专场"
    },
    {
      "date": "2026-06-29",
      "product": "补给包A",
      "channel": "分销",
      "amount": 9600,
      "quantity": 86,
      "note": "渠道补货"
    },
    {
      "date": "2026-06-30",
      "product": "能量饮",
      "channel": "门店",
      "amount": 14600,
      "quantity": 150,
      "note": "周末延续"
    }
  ],
  "metricLabels": [
    "销售额",
    "销量",
    "平均客单",
    "渠道数"
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
  chartOne ||= echarts.init(chartA.value);
  chartTwo ||= echarts.init(chartB.value);
  chartOne.setOption({
    tooltip: {},
    xAxis: { type: "category", data: groupPrimary.value.map((item) => item.name) },
    yAxis: { type: "value" },
    series: [{ type: "line", smooth: true, data: groupPrimary.value.map((item) => item.value), color: project.theme }]
  });
  chartTwo.setOption({
    tooltip: {},
    series: [{ type: "pie", radius: ["42%", "72%"], data: groupSecondary.value.map((item) => ({ name: item.name, value: item.value })) }]
  });
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
