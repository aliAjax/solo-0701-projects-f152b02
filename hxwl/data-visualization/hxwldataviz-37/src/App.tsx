import { FormEvent, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  "name": "hxwldataviz-37",
  "folder": "hxwl/data-visualization/hxwldataviz-37",
  "framework": "react",
  "chartLib": "ECharts",
  "ui": "Ant Design",
  "title": "运营漏斗分析面板",
  "subtitle": "观察访问、注册、下单、支付的转化率和渠道差异。",
  "stack": [
    "React",
    "Vite",
    "TypeScript",
    "Ant Design",
    "ECharts"
  ],
  "storageKey": "hxwldataviz-37-funnel",
  "theme": "#7c3aed",
  "prompt": "使用React、Vite、TypeScript、Ant Design和ECharts实现一个运营漏斗分析面板，内置访问、注册、下单、支付四个环节的数据，展示漏斗转化率、环节流失数和分渠道对比。支持按渠道筛选，并在点击某个漏斗环节时展示该环节的明细说明和改进建议。",
  "filters": {
    "primaryLabel": "渠道",
    "primaryKey": "channel",
    "primaryOptions": [
      "全部渠道",
      "自然流量",
      "广告投放",
      "社群",
      "短信召回"
    ],
    "secondaryLabel": "周期",
    "secondaryKey": "period",
    "secondaryOptions": [
      "全部周期",
      "本周",
      "上周"
    ]
  },
  "fields": [
    {
      "key": "period",
      "label": "周期",
      "type": "select",
      "options": [
        "本周",
        "上周"
      ]
    },
    {
      "key": "channel",
      "label": "渠道",
      "type": "select",
      "options": [
        "自然流量",
        "广告投放",
        "社群",
        "短信召回"
      ]
    },
    {
      "key": "visits",
      "label": "访问",
      "type": "number"
    },
    {
      "key": "registered",
      "label": "注册",
      "type": "number"
    },
    {
      "key": "ordered",
      "label": "下单",
      "type": "number"
    },
    {
      "key": "paid",
      "label": "支付",
      "type": "number"
    }
  ],
  "records": [
    {
      "period": "本周",
      "channel": "自然流量",
      "visits": 12600,
      "registered": 4100,
      "ordered": 1560,
      "paid": 1120,
      "note": "支付页转化稳定"
    },
    {
      "period": "本周",
      "channel": "广告投放",
      "visits": 18200,
      "registered": 5200,
      "ordered": 1680,
      "paid": 980,
      "note": "下单后流失偏高"
    },
    {
      "period": "本周",
      "channel": "社群",
      "visits": 7600,
      "registered": 3200,
      "ordered": 1410,
      "paid": 1040,
      "note": "高意向渠道"
    },
    {
      "period": "上周",
      "channel": "短信召回",
      "visits": 4900,
      "registered": 1300,
      "ordered": 480,
      "paid": 260,
      "note": "触达质量一般"
    }
  ],
  "metricLabels": [
    "访问",
    "注册率",
    "支付率",
    "最大流失"
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


const steps = [
  { key: "visits", label: "访问" },
  { key: "registered", label: "注册" },
  { key: "ordered", label: "下单" },
  { key: "paid", label: "支付" }
];

export default function App() {
  const [records, setRecords] = useState<RecordItem[]>(loadRecords);
  const [form, setForm] = useState<Record<string, string | number>>(createBlank);
  const [note, setNote] = useState("");
  const [primary, setPrimary] = useState<string>(project.filters.primaryOptions[0]);
  const [secondary, setSecondary] = useState<string>(project.filters.secondaryOptions[0]);
  const [selected, setSelected] = useState("registered");
  const filtered = useMemo(() => filterRecords(records, primary, secondary), [records, primary, secondary]);

  const funnel = steps.map((step) => ({ name: step.label, key: step.key, value: sum(filtered, step.key) }));
  const visits = funnel[0]?.value || 0;
  const paid = funnel[3]?.value || 0;
  const maxLoss = Math.max(0, ...funnel.slice(0, -1).map((item, index) => item.value - funnel[index + 1].value));
  const selectedStep = funnel.find((item) => item.key === selected) || funnel[1];
  const suggestion = selected === "registered" ? "优化首屏价值表达和注册入口。" : selected === "ordered" ? "检查商品详情页和下单路径阻力。" : selected === "paid" ? "关注支付方式、优惠展示和失败重试。" : "提升渠道落地页相关性。";

  function persist(next: RecordItem[]) {
    setRecords(next);
    localStorage.setItem(project.storageKey, JSON.stringify(next));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persist([normalizeRecord(form, note), ...records]);
    setForm(createBlank());
    setNote("");
  }

  return (
    <main className="app" style={{ "--theme": project.theme } as React.CSSProperties}>
      <div className="shell">
        <header className="topbar">
          <div><p className="eyebrow">数据分析与可视化</p><h1>{project.title}</h1><p className="subtitle">{project.subtitle}</p></div>
          <div className="stack">{project.stack.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
        </header>
        <section className="filters">
          <label>{project.filters.primaryLabel}<select value={primary} onChange={(event) => setPrimary(event.target.value)}>{project.filters.primaryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>{project.filters.secondaryLabel}<select value={secondary} onChange={(event) => setSecondary(event.target.value)}>{project.filters.secondaryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>漏斗环节<select value={selected} onChange={(event) => setSelected(event.target.value)}>{steps.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label>
        </section>
        <section className="metrics">
          <article className="metric"><span>{project.metricLabels[0]}</span><strong>{visits}</strong></article>
          <article className="metric"><span>{project.metricLabels[1]}</span><strong>{visits ? Math.round((sum(filtered, "registered") / visits) * 100) : 0}%</strong></article>
          <article className="metric"><span>{project.metricLabels[2]}</span><strong>{visits ? Math.round((paid / visits) * 100) : 0}%</strong></article>
          <article className="metric"><span>{project.metricLabels[3]}</span><strong>{maxLoss}</strong></article>
        </section>
        <section className="chart-grid">
          <article className="chart-card">
            <h2>漏斗转化</h2>
            <div className="simple-chart">{funnel.map((row) => <div className="bar" key={row.key}><span>{row.name}</span><div className="track"><div className="fill" style={{ width: `${visits ? (row.value / visits) * 100 : 0}%` }} /></div><strong>{row.value}</strong></div>)}</div>
          </article>
          <article className="chart-card">
            <h2>分渠道对比</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={filtered}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="channel" /><YAxis /><Tooltip /><Bar dataKey="paid" fill={project.theme} /></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="insight">{selectedStep.name}当前量级为{selectedStep.value}。{suggestion}</div>
          </article>
        </section>
        <section className="workspace">
          <form className="panel" onSubmit={submit}>
            <h2>新增渠道数据</h2>
            <div className="form-grid">{fields.map((field) => <label key={field.key}>{field.label}{field.type === "select" ? <select required value={String(form[field.key])} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}><option value="">请选择</option>{field.options?.map((item) => <option key={item}>{item}</option>)}</select> : <input required type={field.type || "text"} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value })} />}</label>)}<label>备注<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label><button type="submit">保存并刷新</button></div>
          </form>
          <section className="table-panel"><h2>渠道明细</h2><table><thead><tr>{fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>备注</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}>{fields.map((field) => <td key={field.key}>{record[field.key]}</td>)}<td className="note">{record.note}</td></tr>)}</tbody></table></section>
        </section>
      </div>
    </main>
  );
}
