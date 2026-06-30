# 个人消费分析看板

使用React、Vite、TypeScript和Recharts实现一个个人消费分析看板，内置一组本地消费记录，展示总支出、分类占比、每日支出趋势和明细列表。支持按月份和消费分类筛选，筛选后统计卡片、图表和列表需要同步更新，数据暂时不接后端。

- 技术栈：React、Vite、TypeScript、Recharts
- 启动：`npm install && npm run dev`
- 构建：`npm run build`

当前版本使用本地模拟数据和浏览器localStorage完成最小闭环，便于后续扩展接口、权限、导入导出和更复杂的分析模型。
