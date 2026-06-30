import { FormEvent, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  "name": "dfwldataviz-35",
  "folder": "dfwl/data-visualization/dfwldataviz-35",
  "framework": "react",
  "chartLib": "Recharts",
  "title": "个人消费分析看板",
  "subtitle": "按月份和消费分类查看支出趋势、占比和明细。",
  "stack": [
    "React",
    "Vite",
    "TypeScript",
    "Recharts"
  ],
  "storageKey": "dfwldataviz-35-expenses",
  "theme": "#2563eb",
  "prompt": "使用React、Vite、TypeScript和Recharts实现一个个人消费分析看板，内置一组本地消费记录，展示总支出、分类占比、每日支出趋势和明细列表。支持按月份和消费分类筛选，筛选后统计卡片、图表和列表需要同步更新，数据暂时不接后端。",
  "filters": {
    "primaryLabel": "月份",
    "primaryKey": "month",
    "primaryOptions": [
      "全部月份",
      "2026-04",
      "2026-05",
      "2026-06"
    ],
    "secondaryLabel": "分类",
    "secondaryKey": "category",
    "secondaryOptions": [
      "全部分类",
      "餐饮",
      "交通",
      "购物",
      "住房",
      "娱乐"
    ]
  },
  "fields": [
    {
      "key": "date",
      "label": "日期",
      "type": "date"
    },
    {
      "key": "category",
      "label": "分类",
      "type": "select",
      "options": [
        "餐饮",
        "交通",
        "购物",
        "住房",
        "娱乐"
      ]
    },
    {
      "key": "amount",
      "label": "金额",
      "type": "number"
    },
    {
      "key": "merchant",
      "label": "商户"
    }
  ],
  "records": [
    {
      "date": "2026-06-01",
      "month": "2026-06",
      "category": "餐饮",
      "amount": 86,
      "merchant": "午餐",
      "note": "工作日午餐"
    },
    {
      "date": "2026-06-02",
      "month": "2026-06",
      "category": "交通",
      "amount": 32,
      "merchant": "地铁",
      "note": "通勤"
    },
    {
      "date": "2026-06-05",
      "month": "2026-06",
      "category": "购物",
      "amount": 428,
      "merchant": "生活用品",
      "note": "家庭采购"
    },
    {
      "date": "2026-05-18",
      "month": "2026-05",
      "category": "住房",
      "amount": 2800,
      "merchant": "房租",
      "note": "月度固定支出"
    },
    {
      "date": "2026-04-21",
      "month": "2026-04",
      "category": "娱乐",
      "amount": 168,
      "merchant": "电影",
      "note": "周末消费"
    }
  ],
  "metricLabels": [
    "总支出",
    "记录数",
    "平均单笔",
    "最高分类"
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


export default function App() {
  const [records, setRecords] = useState<RecordItem[]>(loadRecords);
  const [form, setForm] = useState<Record<string, string | number>>(createBlank);
  const [note, setNote] = useState("");
  const [primary, setPrimary] = useState<string>(project.filters.primaryOptions[0]);
  const [secondary, setSecondary] = useState<string>(project.filters.secondaryOptions[0]);

  const filtered = useMemo(() => filterRecords(records, primary, secondary), [records, primary, secondary]);
  const categoryRows = useMemo(() => groupSum(filtered, "category", "amount"), [filtered]);
  const trendRows = useMemo(() => groupSum(filtered, "date", "amount").sort((a, b) => a.name.localeCompare(b.name)), [filtered]);
  const total = sum(filtered, "amount");
  const average = Math.round(total / Math.max(filtered.length, 1));
  const topCategory = categoryRows[0]?.name || "无";

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
          <div>
            <p className="eyebrow">数据分析与可视化</p>
            <h1>{project.title}</h1>
            <p className="subtitle">{project.subtitle}</p>
          </div>
          <div className="stack">{project.stack.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
        </header>

        <section className="filters">
          <label>{project.filters.primaryLabel}<select value={primary} onChange={(event) => setPrimary(event.target.value)}>{project.filters.primaryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>{project.filters.secondaryLabel}<select value={secondary} onChange={(event) => setSecondary(event.target.value)}>{project.filters.secondaryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="secondary" onClick={() => { setPrimary(project.filters.primaryOptions[0]); setSecondary(project.filters.secondaryOptions[0]); }}>重置筛选</button>
        </section>

        <section className="metrics">
          <article className="metric"><span>{project.metricLabels[0]}</span><strong>{total}</strong></article>
          <article className="metric"><span>{project.metricLabels[1]}</span><strong>{filtered.length}</strong></article>
          <article className="metric"><span>{project.metricLabels[2]}</span><strong>{average}</strong></article>
          <article className="metric"><span>{project.metricLabels[3]}</span><strong>{topCategory}</strong></article>
        </section>

        <section className="chart-grid">
          <article className="chart-card">
            <h2>每日支出趋势</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={project.theme} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="chart-card">
            <h2>分类占比</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryRows} dataKey="value" nameKey="name" outerRadius={92} label>
                    {categoryRows.map((row, index) => <Cell key={row.name} fill={["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#dc2626"][index % 5]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="workspace">
          <form className="panel" onSubmit={submit}>
            <h2>新增消费记录</h2>
            <div className="form-grid">
              {fields.map((field) => (
                <label key={field.key}>{field.label}
                  {field.type === "select" ? <select required value={String(form[field.key])} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}><option value="">请选择</option>{field.options?.map((item) => <option key={item}>{item}</option>)}</select> : <input required type={field.type || "text"} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value })} />}
                </label>
              ))}
              <label>备注<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <button type="submit">保存并刷新</button>
            </div>
          </form>
          <section className="table-panel">
            <h2>明细列表</h2>
            <table>
              <thead><tr>{fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>备注</th></tr></thead>
              <tbody>{filtered.map((record) => <tr key={record.id}>{fields.map((field) => <td key={field.key}>{record[field.key]}</td>)}<td className="note">{record.note}</td></tr>)}</tbody>
            </table>
          </section>
        </section>
      </div>
    </main>
  );
}
