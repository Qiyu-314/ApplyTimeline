# ApplyTimeline

ApplyTimeline is a web app that helps international high school students plan undergraduate applications to the United States, Hong Kong, and the United Kingdom. After entering the applicant’s current grade and target region, students (or a counselor / parent filling in for them) see a personalized timeline for the correct admissions cycle, with milestones, date ranges, and checklists they can tick off as they go. Cross-month stages appear as start and end points that share the same task progress. Deadlines originally given in US or UK local time are converted to Beijing time so Chinese students do not miss cutoffs. Users can view one region or merge all three onto a single axis, with each node labeled by country.

线上地址：https://applytimeline.help

上线后由 Cloudflare Worker 提供页面，并每 6 小时刷新 HKU / UCAS 官方日期。

## 当前版本

**v1.3.8 — 用申请人年级代替年龄**

- 第一次进来仍是：怎么用 → 已知晓 → 填资料；之后点「怎么用」不会再弹出填资料
- 资料改为填准备申请人现在的年级（7–12），并写明升学老师或家长请填学生的年级
- 十二年级按本轮申请季排时间线；更低年级会往后推入学年
- 时间轴、待办、中英文切换、官方日期刷新未改

**v1.3.7 — 换成北京时间后写出具体截止时刻**

- 凡是把美国、英国当地截止换成北京时间的节点，说明里会写出约几月几日几点几分截止
- 例如 Penn / Cornell ED：11 月 1 日东部换成北京时间约 11 月 2 日 12:59 截止
- 时间轴、待办、中英文切换、官方日期刷新未改

**v1.3.6 — 日期方框颜色跟时间轴圆点一致**

- 轴下「2日 / 10日」等方框：已完成淡绿、进行中淡橙、未到更浅的橙，比圆点更淡
- 选中时仍用同色系，不再改成蓝色
- 手机竖排时间线布局未改

**v1.3.5 — 手机时间线文字不再被日期挡住**

- 手机日期不再吸在导航下面盖住任务名，每个节点先写日期再写内容
- 电脑和 iPad 仍用轴下列表，布局未改

**v1.3.4 — 手机时间线每个节点都显示日期**

- 手机竖排不再隐藏 1 日、月中、月末；每个节点都写出日期
- 日期会停在导航栏下方，避免滑过去就看不见
- 电脑和 iPad 仍用轴上刻度，布局未改

**v1.3.3 — 手机设置页避开两行导航**

- 手机「更改年龄 / 地区」卡片从导航栏下方开始，标题不再被挡住
- 电脑和 iPad 的设置页布局未改

**v1.3.2 — 手机能看全「更改年龄 / 地区」**

- 手机打开设置页时，标题、说明、地区按钮和「查看我的时间线」都能看见，卡片可上下滑
- 电脑和 iPad 的设置页布局未改

**v1.3.1 — 时间轴上也能上下滑动页面**

- 鼠标或手指在时间轴卡片里时，页面可以正常上下滚动
- 左右换月仍可用箭头；横向滑动仍可换月，不再把滚轮竖滑改成换月
- 电脑列表、手机竖排、介绍弹窗和中英文切换保持原样

**v1.3.0 — 电脑时间线文字全部可见**

- 电脑（以及较宽的 iPad）横轴上只保留圆点，完整任务名放在轴下方列表里，不再被卡片裁掉
- 点列表或圆点都能打开详情；手机仍用竖排时间线
- 介绍弹窗、中英文切换、官方日期刷新保持原样

**v1.2.1 — 手机竖排时间线 + 介绍时可切语言**

- 电脑、iPad 仍是横轴；手机改为竖排，节点一行一个，文字不再重叠
- 第一次打开介绍时，导航栏语言按钮保持可点，可在看说明时切换中英文

**v1.2.0 — 时间线屏幕自适应**

- 时间线标签宽度、避让和换月箭头随窗口变化
- 适配电脑、平板、手机；文案和功能未改

**v1.1.1 — 字号略增**

- 页面文字整体大约加大 1px，方便阅读
- 文案、时间轴、中英文切换、官方日期刷新均未改

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

本机后端会保存申请人年级、地区和待办（Cookie + `data/store.json`）。线上没有这份文件存储时，勾选会留在浏览器里；官方日期仍走 `/api/dates`。

## 回归测试

```
node test/regression.js
```

## 部署

推送到 `main` 后，Cloudflare 会按仓库里的 `wrangler.toml` 发布到 https://applytimeline.help
