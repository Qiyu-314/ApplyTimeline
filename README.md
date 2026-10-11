# ApplyTimeline

ApplyTimeline is a web app that helps international high school students plan undergraduate applications to the United States, Hong Kong, and the United Kingdom. After entering their age and target region, students see a personalized timeline for the correct admissions cycle, with milestones, date ranges, and checklists they can tick off as they go. Cross-month stages appear as start and end points that share the same task progress. Deadlines originally given in US or UK local time are converted to Beijing time so Chinese students do not miss cutoffs. Users can view one region or merge all three onto a single axis, with each node labeled by country.

线上地址：https://applytimeline.help

上线后由 Cloudflare Worker 提供页面，并每 6 小时刷新 HKU / UCAS 官方日期。

## 本机启动

```
node server.js
```

浏览器打开 http://localhost:3000

本机后端会保存年龄、地区和待办（Cookie + `data/store.json`）。线上没有这份文件存储时，勾选会留在浏览器里；官方日期仍走 `/api/dates`。
