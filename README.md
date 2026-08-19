# A股资金面复盘

每日 A 股资金面复盘网页：指数量能、涨跌停宽度、连板天梯、两融、主力资金流、龙虎榜机构席位、宽基 ETF、宏观流动性、次日展望，共 8+1 个模块。

## 在线访问

- GitHub Pages（需在仓库 Settings → Pages 开启，Source 选 `main` 分支根目录）：
  `https://samueltang1993-blip.github.io/a-share-fupan/`
- 即时兜底（无需开启 Pages）：
  `https://raw.githack.com/samueltang1993-blip/a-share-fupan/main/index.html`

## 架构：页面与数据分离

```
index.html          页面结构（echarts 走 CDN）
render.js           渲染逻辑（模块守卫：数据缺失时整节隐藏）
data/data_01.js     文案：标题/导读/摘要芯片/连板天梯/次日展望（每日必更新）
data/data_02.js     两市成交额 / 宽度情绪 / 龙虎榜机构净买入序列
data/data_03.js     两融 / 主力资金流 / 龙虎榜明细 / 新高个股
data/data_04.js     宏观流动性（OMO / DR007 / 10Y）
data/data_05.js     指数序列：中证全指 / 上证指数 / 创业板指
data/data_06.js     指数序列：科创50 / 沪深300 / 中证1000
data/data_07.js     指数序列：深证成指
data/data_08.js     宽基 ETF 行（成交额 / 份额）
data/data_09.js     宽基 ETF 份额序列
```

各 `data_*.js` 自增挂载到 `window.REVIEW_DATA`，加载顺序无关，全部先于 `render.js` 执行。

## 每日更新流程

1. 在工作区运行数据管线：`python3 review_pipeline.py YYYY-MM-DD`（目标日须为交易日）
2. 连板验证：`python3 lianban_verify.py YYYY-MM-DD`
3. 撰写文案：`write_MMDD.py`（只改 `text` / `ladder` / `outlook` 三键）
4. 用 `make_chunks.py` 重新分块生成 `data_01.js` ~ `data_09.js`
5. 仅推送内容有变化的分块到本仓库 `main` 分支，网页即更新（固定链接不变）

## 数据口径

- 数据源：Wind / Gildata 优先，缺失时降级到公开接口（腾讯快照、新浪、东方财富、同花顺），所有降级在页面 as-of 标签与导读中披露
- 两融余额、ETF 份额为 T+1
- 次日展望概率为主观情景判断，页面固定标注“非预测”
