# 库存周转分析看板

使用Vue3、Vite、TypeScript、Element Plus和AntV G2实现一个库存周转分析看板，内置SKU库存、入库、出库和安全库存数据，展示库存总量、近7天出库趋势、低库存预警和SKU周转排名。支持按仓库筛选，新增一条出入库记录后需要重新计算全部指标。

- 技术栈：Vue3、Vite、TypeScript、Element Plus、AntV G2
- 启动：`npm install && npm run dev`
- 构建：`npm run build`

当前版本使用本地模拟数据和浏览器localStorage完成最小闭环，便于后续扩展接口、权限、导入导出和更复杂的分析模型。
