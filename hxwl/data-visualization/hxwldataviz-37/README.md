# 运营漏斗分析面板

使用React、Vite、TypeScript、Ant Design和ECharts实现一个运营漏斗分析面板，内置访问、注册、下单、支付四个环节的数据，展示漏斗转化率、环节流失数和分渠道对比。支持按渠道筛选，并在点击某个漏斗环节时展示该环节的明细说明和改进建议。

- 技术栈：React、Vite、TypeScript、Ant Design、ECharts
- 启动：`npm install && npm run dev`
- 构建：`npm run build`

当前版本使用本地模拟数据和浏览器localStorage完成最小闭环，便于后续扩展接口、权限、导入导出和更复杂的分析模型。
