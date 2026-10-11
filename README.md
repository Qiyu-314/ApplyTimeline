# ApplyTimeline

ApplyTimeline is a web app that helps international high school students plan undergraduate applications to the United States, Hong Kong, and the United Kingdom. After entering their age and target region, students see a personalized timeline for the correct admissions cycle, with milestones, date ranges, and checklists they can tick off as they go. Cross-month stages appear as start and end points that share the same task progress. Deadlines originally given in US or UK local time are converted to Beijing time so Chinese students do not miss cutoffs. Users can view one region or merge all three onto a single axis, with each node labeled by country.

线上地址：https://applytimeline.help

上线后由 Cloudflare Worker 提供页面，并每 6 小时刷新 HKU / UCAS 官方日期。

## 当前版本

**v1.1.0 — 中英文切换（默认英文）**

- 导航栏新增语言按钮
- 初次打开默认英文，按钮显示「中文」
- 点击后整页切到中文，按钮变为「EN」
- 选择会记在浏览器里，下次打开沿用
- 时间轴节点、待办、文字时间线和帮助说明会一起切换
- 官方日期刷新、怎么用 / 已知晓流程保持原样

## 本机启动

```
node server.js
```

浏览器打开 http://localhost:3000

本机后端会保存年龄、地区和待办（Cookie + `data/store.json`）。线上没有这份文件存储时，勾选会留在浏览器里；官方日期仍走 `/api/dates`。

## 回归测试

```
node test/regression.js
```

## 部署

推送到 `main` 后，Cloudflare 会按仓库里的 `wrangler.toml` 发布到 https://applytimeline.help
