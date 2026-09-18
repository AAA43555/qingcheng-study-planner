const STORAGE_KEY = "qingcheng-tasks-v1";
const THEME_KEY = "qingcheng-theme";

const categoryMap = {
  cet6: { label: "六级备考", color: "#006a60", icon: "translate" },
  lab: { label: "实验催办", color: "#755600", icon: "science" },
  homework: { label: "作业", color: "#825500", icon: "assignment" },
};

const now = new Date();
const at = (dayOffset, hour, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const seedTasks = [
  { id: crypto.randomUUID(), title: "六级词汇 50 个", category: "cet6", deadline: at(0, 9), stages: 3, progress: 0, reminderMinutes: 30, notified: false, note: "复习昨天的错词", done: false },
  { id: crypto.randomUUID(), title: "催实验数据", category: "lab", deadline: at(0, 14, 30), stages: 1, progress: 0, reminderMinutes: 30, notified: false, note: "联系同组同学确认数据", done: false },
  { id: crypto.randomUUID(), title: "提交高数作业", category: "homework", deadline: at(0, 22), stages: 3, progress: 0, reminderMinutes: 30, notified: false, note: "检查第 4 题计算过程", done: false },
  { id: crypto.randomUUID(), title: "六级听力真题", category: "cet6", deadline: at(1, 19, 30), stages: 3, progress: 0, reminderMinutes: 30, notified: false, note: "2024 年 6 月第一套", done: false },
  { id: crypto.randomUUID(), title: "实验报告初稿", category: "lab", deadline: at(2, 18), stages: 3, progress: 0, reminderMinutes: 30, notified: false, note: "完成结果分析部分", done: false },
  { id: crypto.randomUUID(), title: "线性代数习题", category: "homework", deadline: at(4, 22), stages: 1, progress: 0, reminderMinutes: 30, notified: false, note: "第 3 章课后题", done: false },
];

let tasks = loadTasks();
let activeFilter = "all";
let notificationTimers = [];
let vivianPatted = false;
let vivianRewardLine = "";
let vivianInteractionIndex = 0;

const vivianScolds = [
  "连这点任务都做不完，还敢盯着我看？",
  "你的拖延症真是忠心耿耿，比你本人可靠多了。",
  "进度条这么空，和你刚才的努力程度倒是很般配。",
  "别把“稍后”说得像计划，那只是拖延换了件衣服。",
  "再磨蹭下去，截止时间都要替你感到丢脸了。",
  "很遗憾，卖萌不能抵消任何一项未完成任务。",
  "先完成一项再休息。还是说，法厄同大人只会找借口？",
];

const categoryScolds = {
  cet6: "六级词汇还没背完？难道准备在考场上靠眼神交流吗？",
  lab: "实验还没催？数据不会因为你装死就自己长出来。",
  homework: "作业还空着呢。你是打算把“来不及”当最终答案吗？",
};

const vivianRewards = [
  "法厄同大人好棒～今天的任务全部完成了呢。",
  "真乖……今天也有好好努力。奖励你再摸一下也不是不可以。",
  "做得很好，法厄同大人。薇薇安一直都看在眼里哦。",
  "呀……摸、摸头是奖励，不可以突然这样温柔啦。",
  "全部完成了呢。今天的法厄同大人，值得薇薇安特别表扬～",
];

const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const refs = {
  todayLabel: document.querySelector("#todayLabel"),
  progressValue: document.querySelector("#progressValue"),
  todayTitle: document.querySelector("#todayTitle"),
  remainingCount: document.querySelector("#remainingCount"),
  todayTasks: document.querySelector("#todayTasks"),
  allTasks: document.querySelector("#allTasks"),
  summaryGrid: document.querySelector("#summaryGrid"),
  insightText: document.querySelector("#insightText"),
  taskTemplate: document.querySelector("#taskTemplate"),
  dialog: document.querySelector("#taskDialog"),
  form: document.querySelector("#taskForm"),
  deadline: document.querySelector("#taskDeadline"),
  notificationButton: document.querySelector("#notificationButton"),
  vivianSpeech: document.querySelector("#vivianSpeech"),
  vivianPortrait: document.querySelector("#vivianPortrait"),
  heartLayer: document.querySelector("#heartLayer"),
  patButton: document.querySelector("#patButton"),
  iosHint: document.querySelector("#iosHint"),
  widgetPreviewText: document.querySelector("#widgetPreviewText"),
  exportAllCalendar: document.querySelector("#exportAllCalendar"),
};

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return (Array.isArray(stored) ? stored : seedTasks).map(normalizeTask);
  } catch { return seedTasks; }
}

function normalizeTask(task) {
  const stages = Number(task.stages) === 3 ? 3 : 1;
  const legacyProgress = task.done ? stages : 0;
  const progress = Math.max(0, Math.min(stages, Number.isFinite(Number(task.progress)) ? Number(task.progress) : legacyProgress));
  return { ...task, stages, progress, done: progress >= stages };
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function isToday(value) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString();
}

function formatDeadline(value) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const day = date.toDateString() === today.toDateString() ? "今天" : date.toDateString() === tomorrow.toDateString() ? "明天" : `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${day} ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function createTaskCard(task) {
  const card = refs.taskTemplate.content.firstElementChild.cloneNode(true);
  const category = categoryMap[task.category];
  card.dataset.id = task.id;
  card.classList.toggle("three-stage", task.stages === 3);
  card.classList.toggle("done", task.done);
  card.style.setProperty("--category", category.color);
  card.querySelector("h3").textContent = task.title;
  card.querySelector(".category-label").textContent = category.label;
  card.querySelector(".deadline").textContent = formatDeadline(task.deadline);
  if (Number(task.reminderMinutes) >= 0) {
    const reminder = document.createElement("span");
    reminder.className = "reminder-mark";
    reminder.title = reminderLabel(Number(task.reminderMinutes));
    reminder.innerHTML = '<span class="material-symbols-rounded">notifications_active</span>';
    card.querySelector(".task-meta").append(reminder);
  }
  card.querySelector(".task-note").textContent = task.note || "没有备注";
  const petals = [...card.querySelectorAll(".bloom-flower i")];
  petals.forEach((petal, index) => petal.classList.toggle("open", index < task.progress));
  card.querySelector(".stage-label").textContent = `${task.progress}/${task.stages} 阶段`;
  card.querySelector(".check-button span").textContent = task.done ? "check_circle" : "radio_button_unchecked";
  card.querySelector(".check-button").ariaLabel = task.done ? "重置完成状态" : "推进一个阶段";
  card.querySelector(".check-button").addEventListener("click", event => { event.stopPropagation(); advanceTask(task.id, true); });
  card.querySelector(".calendar-button").addEventListener("click", () => exportTaskToCalendar(task));
  card.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
  card.addEventListener("click", event => {
    if (event.target.closest("button") || task.done) return;
    advanceTask(task.id, false);
  });
  return card;
}

function fillList(container, list) {
  container.replaceChildren();
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = '<span class="material-symbols-rounded">event_available</span><p>这里暂时没有日程</p>';
    container.append(empty);
    return;
  }
  list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).forEach(task => container.append(createTaskCard(task)));
}

function render() {
  const todayTasks = tasks.filter(task => isToday(task.deadline));
  fillList(refs.todayTasks, todayTasks);
  fillList(refs.allTasks, tasks.filter(task => activeFilter === "all" || task.category === activeFilter));

  const doneToday = todayTasks.filter(task => task.done).length;
  const totalStages = todayTasks.reduce((sum, task) => sum + task.stages, 0);
  const completedStages = todayTasks.reduce((sum, task) => sum + task.progress, 0);
  const percent = totalStages ? Math.round(completedStages / totalStages * 100) : 0;
  refs.progressValue.textContent = `${percent}%`;
  refs.progressValue.parentElement.style.setProperty("--progress", `${percent}%`);
  refs.remainingCount.textContent = `${todayTasks.length - doneToday} 项待完成`;
  updateVivian(todayTasks, doneToday);

  refs.summaryGrid.replaceChildren();
  Object.entries(categoryMap).forEach(([key, category]) => {
    const list = tasks.filter(task => task.category === key);
    const done = list.filter(task => task.done).length;
    const card = document.createElement("article");
    card.className = "summary-card";
    card.innerHTML = `<span class="material-symbols-rounded">${category.icon}</span><strong>${done}/${list.length}</strong><span>${category.label}</span>`;
    refs.summaryGrid.append(card);
  });
  const totalDone = tasks.filter(task => task.done).length;
  refs.insightText.textContent = totalDone ? `你已经完成 ${totalDone} 项日程。保持节奏，比一口气做完更重要。` : "从最小的一项开始，完成后就会看到进度变化。";
  const nextTask = tasks.filter(task => !task.done).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  refs.widgetPreviewText.textContent = nextTask ? `${nextTask.title}\n${formatDeadline(nextTask.deadline)}` : "待办全部完成";
  scheduleNotifications();
}

function updateVivian(todayTasks, doneToday) {
  const remaining = todayTasks.length - doneToday;
  const allDone = todayTasks.length > 0 && remaining === 0;
  if (!allDone) vivianPatted = false;

  refs.vivianPortrait.classList.toggle("stern", !vivianPatted);
  refs.vivianPortrait.classList.toggle("shy", vivianPatted);
  refs.vivianPortrait.classList.toggle("reward", allDone && !vivianPatted);
  refs.vivianPortrait.disabled = false;
  refs.vivianPortrait.setAttribute("aria-label", allDone ? "摸摸薇薇安的头" : "点薇薇安听她催你");
  refs.patButton.disabled = !allDone;

  if (vivianPatted) {
    refs.todayTitle.textContent = "法厄同大人好棒～";
    refs.vivianSpeech.textContent = vivianRewardLine || vivianRewards[0];
    refs.patButton.querySelector("span:last-child").textContent = "再摸一下";
  } else if (allDone) {
    refs.todayTitle.textContent = "居然真的做完了";
    refs.vivianSpeech.textContent = "……好吧，今天表现合格。奖励你摸一次头，只准一下。";
    refs.patButton.querySelector("span:last-child").textContent = "摸摸薇薇安的头";
  } else if (!todayTasks.length) {
    refs.todayTitle.textContent = "今天没有安排？";
    refs.vivianSpeech.textContent = "没有日程可不等于可以荒废。去给自己加一项任务。";
    refs.patButton.querySelector("span:last-child").textContent = "完成后可摸头";
  } else {
    refs.todayTitle.textContent = "今天也别想偷懒";
    refs.vivianSpeech.textContent = `${vivianScolds[(new Date().getDate() + remaining) % vivianScolds.length]} 还剩 ${remaining} 项。`;
    refs.patButton.querySelector("span:last-child").textContent = "完成后可摸头";
  }
}

function patVivian() {
  const todayTasks = tasks.filter(task => isToday(task.deadline));
  if (!todayTasks.length || todayTasks.some(task => !task.done)) {
    scoldVivian(todayTasks.filter(task => !task.done));
    return;
  }
  vivianInteractionIndex += 1;
  vivianPatted = true;
  vivianRewardLine = vivianRewards[vivianInteractionIndex % vivianRewards.length];
  render();
  refs.vivianPortrait.classList.remove("patting");
  requestAnimationFrame(() => refs.vivianPortrait.classList.add("patting"));
  setTimeout(() => refs.vivianPortrait.classList.remove("patting"), 760);
  burstHearts();
}

function scoldVivian(unfinished) {
  vivianInteractionIndex += 1;
  const categoryLine = unfinished.length ? categoryScolds[unfinished[0].category] : null;
  const generalLine = vivianScolds[vivianInteractionIndex % vivianScolds.length];
  refs.todayTitle.textContent = "还敢来招惹我？";
  refs.vivianSpeech.textContent = `${categoryLine || generalLine} 还剩 ${unfinished.length} 项。`;
  refs.vivianPortrait.classList.remove("scolding");
  requestAnimationFrame(() => refs.vivianPortrait.classList.add("scolding"));
  setTimeout(() => refs.vivianPortrait.classList.remove("scolding"), 420);
}

function burstHearts() {
  refs.heartLayer.replaceChildren();
  const colors = ["#ff4f91", "#ff88bb", "#ffffff", "#d966ff"];
  for (let index = 0; index < 16; index += 1) {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = "♥";
    heart.style.setProperty("--x", `${Math.round((Math.random() - .5) * 150)}px`);
    heart.style.setProperty("--delay", `${(Math.random() * .22).toFixed(2)}s`);
    heart.style.setProperty("--scale", (.65 + Math.random() * .9).toFixed(2));
    heart.style.setProperty("--spin", `${Math.round((Math.random() - .5) * 80)}deg`);
    heart.style.setProperty("--heart-color", colors[index % colors.length]);
    refs.heartLayer.append(heart);
  }
  setTimeout(() => refs.heartLayer.replaceChildren(), 1700);
}

function reminderLabel(minutes) {
  if (minutes === 0) return "到期时提醒";
  if (minutes === 60) return "提前 1 小时提醒";
  return `提前 ${minutes} 分钟提醒`;
}

async function enableNotifications() {
  if (isIos && !isStandalone) {
    refs.iosHint.hidden = false;
    refs.iosHint.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  if (!("Notification" in window)) {
    refs.notificationButton.title = "当前浏览器不支持网页通知";
    return false;
  }
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  updateNotificationButton();
  if (permission === "granted") scheduleNotifications();
  return permission === "granted";
}

function icsEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcsEvent(task) {
  const start = new Date(task.deadline);
  const end = new Date(start.getTime() + 60 * 60_000);
  const alarm = Number(task.reminderMinutes) >= 0
    ? ["BEGIN:VALARM", `TRIGGER:-PT${Number(task.reminderMinutes)}M`, "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(task.title)}`, "END:VALARM"]
    : [];
  return [
    "BEGIN:VEVENT", `UID:${task.id}@qingcheng`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(task.title)}`, `DESCRIPTION:${icsEscape(`${categoryMap[task.category].label}${task.note ? ` · ${task.note}` : ""}`)}`,
    ...alarm, "END:VEVENT",
  ];
}

function downloadCalendar(calendarTasks, filename) {
  if (!calendarTasks.length) return;
  const calendar = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "PRODID:-//Qingcheng//Study Planner//ZH-CN",
    ...calendarTasks.flatMap(buildIcsEvent), "END:VCALENDAR", "",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/[\\/:*?"<>|]/g, "-")}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTaskToCalendar(task) {
  downloadCalendar([task], task.title);
}

function exportAllToCalendar() {
  const pending = tasks.filter(task => !task.done);
  if (!pending.length) {
    refs.exportAllCalendar.textContent = "待办已经全部完成";
    setTimeout(() => refs.exportAllCalendar.innerHTML = '<span class="material-symbols-rounded">ios_share</span>同步到 iPhone 日历', 1600);
    return;
  }
  downloadCalendar(pending, "青程-全部待办");
}

function updateNotificationButton() {
  const granted = "Notification" in window && Notification.permission === "granted";
  refs.notificationButton.classList.toggle("enabled", granted);
  refs.notificationButton.querySelector("span").textContent = granted ? "notifications_active" : "notifications";
  refs.notificationButton.title = granted ? "日程提醒已开启" : "开启日程提醒";
}

function scheduleNotifications() {
  notificationTimers.forEach(clearTimeout);
  notificationTimers = [];
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const currentTime = Date.now();
  tasks.filter(task => !task.done && !task.notified && Number(task.reminderMinutes) >= 0).forEach(task => {
    const fireAt = new Date(task.deadline).getTime() - Number(task.reminderMinutes) * 60_000;
    if (fireAt < currentTime || fireAt - currentTime > 2_147_000_000) return;
    notificationTimers.push(setTimeout(() => notifyTask(task.id), fireAt - currentTime));
  });
}

async function notifyTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task || task.done || task.notified) return;
  const options = { body: `${categoryScolds[task.category]}\n${categoryMap[task.category].label} · ${formatDeadline(task.deadline)}${task.note ? `\n${task.note}` : ""}`, icon: "./icons/icon.svg", badge: "./icons/icon.svg", tag: `task-${task.id}` };
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) await registration.showNotification(`薇薇安：${task.title}还没做？`, options);
    else new Notification(`薇薇安：${task.title}还没做？`, options);
    task.notified = true;
    saveTasks();
  } catch { /* Permission or platform support can change at runtime. */ }
}

function advanceTask(id, allowReset) {
  let advanced = false;
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    if (task.done && allowReset) return { ...task, progress: 0, done: false, notified: false };
    if (task.done) return task;
    advanced = true;
    const progress = Math.min(task.stages, task.progress + 1);
    return { ...task, progress, done: progress >= task.stages };
  });
  saveTasks(); render();
  if (advanced) document.querySelectorAll(`[data-id="${id}"]`).forEach(animateBloom);
}

function animateBloom(card) {
  card.classList.add("blooming");
  const colors = ["#eb79c4", "#bd80ef", "#ffb2dc", "#8d80e9"];
  for (let index = 0; index < 10; index += 1) {
    const petal = document.createElement("span");
    petal.className = "petal-burst";
    petal.style.setProperty("--left", `${35 + Math.random() * 35}%`);
    petal.style.setProperty("--top", `${35 + Math.random() * 30}%`);
    petal.style.setProperty("--dx", `${Math.round((Math.random() - .5) * 130)}px`);
    petal.style.setProperty("--dy", `${Math.round(-25 - Math.random() * 75)}px`);
    petal.style.setProperty("--rotate", `${Math.round(Math.random() * 260)}deg`);
    petal.style.setProperty("--petal", colors[index % colors.length]);
    card.append(petal);
  }
  setTimeout(() => { card.classList.remove("blooming"); card.querySelectorAll(".petal-burst").forEach(petal => petal.remove()); }, 950);
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks(); render();
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === button.dataset.view));
}));

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  render();
}));

document.querySelector("#addButton").addEventListener("click", () => {
  const next = new Date(); next.setHours(next.getHours() + 1); next.setMinutes(0, 0, 0);
  refs.deadline.value = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  refs.dialog.showModal();
});

document.querySelector("#closeDialog").addEventListener("click", () => refs.dialog.close());
refs.notificationButton.addEventListener("click", enableNotifications);
refs.patButton.addEventListener("click", patVivian);
refs.vivianPortrait.addEventListener("click", patVivian);
refs.exportAllCalendar.addEventListener("click", exportAllToCalendar);

refs.form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(refs.form);
  const reminderMinutes = Number(data.get("reminder"));
  const stages = Number(data.get("stages")) === 3 ? 3 : 1;
  tasks.push({ id: crypto.randomUUID(), title: data.get("title").trim(), category: data.get("category"), deadline: new Date(data.get("deadline")).toISOString(), stages, progress: 0, reminderMinutes, notified: false, note: data.get("note").trim(), done: false });
  saveTasks(); refs.form.reset(); refs.dialog.close(); render();
  if (reminderMinutes >= 0 && (!("Notification" in window) || Notification.permission !== "granted")) enableNotifications();
});

const preferredTheme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.body.classList.toggle("dark", preferredTheme === "dark");
document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

refs.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
refs.iosHint.hidden = !(isIos && !isStandalone);
updateNotificationButton();
render();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
