const STORAGE_KEY = "qingcheng-tasks-v1";
const THEME_KEY = "qingcheng-theme";
const CATEGORY_KEY = "qingcheng-categories-v1";

const defaultCategories = [
  { id: "cet6", label: "六级备考", color: "#735bb9", icon: "translate" },
  { id: "lab", label: "实验催办", color: "#9a63b8", icon: "science" },
  { id: "homework", label: "作业", color: "#b05f94", icon: "assignment" },
];

const scoldModes = {
  sharp: {
    label: "毒舌催促",
    lines: [
      "「{task}」还没做？你的执行力是被你亲手弄丢了吗？",
      "盯着我也不会让「{task}」自己完成，法厄同大人。",
      "再拖「{task}」，截止时间都要替你感到丢脸了。",
    ],
  },
  strict: {
    label: "严厉训诫",
    lines: [
      "现在去完成「{task}」。别找借口，也别让我重复第二遍。",
      "「{task}」没有完成之前，不准分心。立刻开始。",
      "法厄同大人，请把「{task}」推进完，再来见我。",
    ],
  },
  gentle: {
    label: "温柔督促",
    lines: [
      "先把「{task}」推进一点吧，我会陪着法厄同大人的。",
      "「{task}」还在等你呢，完成之后就可以安心休息啦。",
      "不用一口气做到完美，先开始「{task}」就很好。",
    ],
  },
  silent: {
    label: "只提醒",
    lines: [
      "提醒：该处理「{task}」了。",
      "「{task}」即将到期，请记得完成。",
      "待办「{task}」还没有完成。",
    ],
  },
};

const repeatUnits = {
  day: { label: "天", frequency: "DAILY" },
  week: { label: "周", frequency: "WEEKLY" },
  month: { label: "月", frequency: "MONTHLY" },
};

const priorities = {
  high: { label: "高", rank: 0, color: "#c72f62", icon: "priority_high", ics: 1 },
  medium: { label: "中", rank: 1, color: "#7958b2", icon: "drag_handle", ics: 5 },
  low: { label: "低", rank: 2, color: "#687487", icon: "arrow_downward", ics: 9 },
};

const now = new Date();
const at = (dayOffset, hour, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const seedTasks = [
  { id: crypto.randomUUID(), title: "六级词汇 50 个", category: "cet6", deadline: at(0, 9), stages: 3, progress: 0, reminderMinutes: 30, scoldMode: "sharp", repeat: "daily", notified: false, note: "复习昨天的错词", done: false },
  { id: crypto.randomUUID(), title: "催实验数据", category: "lab", deadline: at(0, 14, 30), stages: 1, progress: 0, reminderMinutes: 30, scoldMode: "strict", repeat: "none", notified: false, note: "联系同组同学确认数据", done: false },
  { id: crypto.randomUUID(), title: "提交高数作业", category: "homework", deadline: at(0, 22), stages: 3, progress: 0, reminderMinutes: 30, scoldMode: "sharp", repeat: "weekly", notified: false, note: "检查第 4 题计算过程", done: false },
  { id: crypto.randomUUID(), title: "六级听力真题", category: "cet6", deadline: at(1, 19, 30), stages: 3, progress: 0, reminderMinutes: 30, scoldMode: "gentle", repeat: "weekly", notified: false, note: "2024 年 6 月第一套", done: false },
  { id: crypto.randomUUID(), title: "实验报告初稿", category: "lab", deadline: at(2, 18), stages: 3, progress: 0, reminderMinutes: 30, scoldMode: "strict", repeat: "none", notified: false, note: "完成结果分析部分", done: false },
  { id: crypto.randomUUID(), title: "线性代数习题", category: "homework", deadline: at(4, 22), stages: 1, progress: 0, reminderMinutes: 30, scoldMode: "sharp", repeat: "none", notified: false, note: "第 3 章课后题", done: false },
];

let categories = loadCategories();
let tasks = loadTasks();
let activeFilter = "all";
let notificationTimers = [];
let vivianPatted = false;
let vivianRewardLine = "";
let vivianInteractionIndex = 0;
const taskTapLocks = new Map();
let editingTaskId = null;

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
  dialogEyebrow: document.querySelector("#taskDialogEyebrow"),
  dialogTitle: document.querySelector("#taskDialogTitle"),
  form: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  deadline: document.querySelector("#taskDeadline"),
  taskPriority: document.querySelector("#taskPriority"),
  taskStages: document.querySelector("#taskStages"),
  taskReminder: document.querySelector("#taskReminder"),
  taskScoldMode: document.querySelector("#taskScoldMode"),
  taskNote: document.querySelector("#taskNote"),
  notificationButton: document.querySelector("#notificationButton"),
  vivianSpeech: document.querySelector("#vivianSpeech"),
  vivianPortrait: document.querySelector("#vivianPortrait"),
  heartLayer: document.querySelector("#heartLayer"),
  patButton: document.querySelector("#patButton"),
  iosHint: document.querySelector("#iosHint"),
  widgetPreviewText: document.querySelector("#widgetPreviewText"),
  exportAllCalendar: document.querySelector("#exportAllCalendar"),
  filters: document.querySelector("#filters"),
  taskCategory: document.querySelector("#taskCategory"),
  taskRepeat: document.querySelector("#taskRepeat"),
  repeatSettings: document.querySelector("#repeatSettings"),
  repeatInterval: document.querySelector("#repeatInterval"),
  repeatUnit: document.querySelector("#repeatUnit"),
  repeatStart: document.querySelector("#repeatStart"),
  repeatEnd: document.querySelector("#repeatEnd"),
  categoryDialog: document.querySelector("#categoryDialog"),
  categoryEditorList: document.querySelector("#categoryEditorList"),
  categoryForm: document.querySelector("#categoryForm"),
  newCategoryName: document.querySelector("#newCategoryName"),
};

function loadCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(CATEGORY_KEY));
    const valid = Array.isArray(stored)
      ? stored.filter(item => item && typeof item.id === "string" && typeof item.label === "string" && item.label.trim())
      : [];
    return valid.length ? valid.map(item => ({ ...item, label: item.label.trim(), color: item.color || "#735bb9", icon: item.icon || "bookmark" })) : defaultCategories.map(item => ({ ...item }));
  } catch { return defaultCategories.map(item => ({ ...item })); }
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return (Array.isArray(stored) ? stored : seedTasks).map(normalizeTask);
  } catch { return seedTasks.map(normalizeTask); }
}

function localDateValue(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfter(value, amount, unit) {
  const date = new Date(value);
  if (unit === "day") date.setDate(date.getDate() + amount);
  if (unit === "week") date.setDate(date.getDate() + amount * 7);
  if (unit === "month") {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return date;
}

function normalizeTask(task) {
  const stages = Number(task.stages) === 3 ? 3 : 1;
  const legacyProgress = task.done ? stages : 0;
  const progress = Math.max(0, Math.min(stages, Number.isFinite(Number(task.progress)) ? Number(task.progress) : legacyProgress));
  const scoldMode = scoldModes[task.scoldMode] ? task.scoldMode : "sharp";
  const legacyRepeat = { daily: [1, "day"], weekly: [1, "week"], monthly: [1, "month"] }[task.repeat];
  const repeat = task.repeat === "custom" || legacyRepeat ? "custom" : "none";
  const repeatInterval = legacyRepeat ? legacyRepeat[0] : Math.max(1, Math.min(365, Number(task.repeatInterval) || 1));
  const repeatUnit = legacyRepeat ? legacyRepeat[1] : repeatUnits[task.repeatUnit] ? task.repeatUnit : "day";
  const repeatStart = task.repeatStart || localDateValue(task.deadline);
  const repeatEnd = task.repeatEnd || (repeat === "custom" ? localDateValue(dateAfter(task.deadline, 1, "month")) : "");
  const priority = priorities[task.priority] ? task.priority : "medium";
  return { ...task, stages, progress, scoldMode, priority, repeat, repeatInterval, repeatUnit, repeatStart, repeatEnd, nextGenerated: Boolean(task.nextGenerated), done: progress >= stages };
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveCategories() {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

function getCategory(id) {
  return categories.find(category => category.id === id) || { id, label: "未分类", color: "#8a8294", icon: "bookmark" };
}

function scoldLineFor(task, index = 0) {
  if (!task) return vivianScolds[index % vivianScolds.length];
  if (task.scoldMode === "sharp" && categoryScolds[task.category]) return categoryScolds[task.category];
  const mode = scoldModes[task.scoldMode] || scoldModes.sharp;
  return mode.lines[index % mode.lines.length].replace("{task}", task.title);
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

function shortDate(value) {
  const [, month, day] = String(value).split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function repeatLabel(task) {
  if (task.repeat === "none") return "不循环";
  const unit = repeatUnits[task.repeatUnit] || repeatUnits.day;
  return `每 ${task.repeatInterval} ${unit.label} · 至 ${shortDate(task.repeatEnd)}`;
}

function compareTasks(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  const priorityDifference = priorities[a.priority].rank - priorities[b.priority].rank;
  return priorityDifference || new Date(a.deadline) - new Date(b.deadline);
}

function renderCategoryControls() {
  if (activeFilter !== "all" && !categories.some(category => category.id === activeFilter)) activeFilter = "all";
  refs.filters.replaceChildren();
  [{ id: "all", label: "全部" }, ...categories].forEach(category => {
    const button = document.createElement("button");
    button.className = "filter";
    button.classList.toggle("active", category.id === activeFilter);
    button.dataset.filter = category.id;
    button.textContent = category.label;
    button.addEventListener("click", () => {
      activeFilter = category.id;
      render();
    });
    refs.filters.append(button);
  });

  const selected = refs.taskCategory.value;
  refs.taskCategory.replaceChildren();
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    refs.taskCategory.append(option);
  });
  if (categories.some(category => category.id === selected)) refs.taskCategory.value = selected;
}

function renderCategoryEditor() {
  refs.categoryEditorList.replaceChildren();
  categories.forEach(category => {
    const row = document.createElement("div");
    row.className = "category-editor-row";

    const color = document.createElement("input");
    color.type = "color";
    color.value = category.color;
    color.setAttribute("aria-label", `${category.label}的颜色`);

    const name = document.createElement("input");
    name.type = "text";
    name.value = category.label;
    name.maxLength = 12;
    name.setAttribute("aria-label", "分类名称");

    const save = document.createElement("button");
    save.type = "button";
    save.className = "category-row-button save-category";
    save.title = "保存修改";
    save.innerHTML = '<span class="material-symbols-rounded">check</span>';
    save.addEventListener("click", () => {
      const label = name.value.trim();
      if (!label) { name.focus(); return; }
      category.label = label;
      category.color = color.value;
      saveCategories();
      render();
      renderCategoryEditor();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "category-row-button delete-category";
    remove.title = "删除分类";
    remove.innerHTML = '<span class="material-symbols-rounded">delete</span>';
    remove.disabled = categories.length === 1;
    remove.addEventListener("click", () => removeCategory(category.id));
    row.append(color, name, save, remove);
    refs.categoryEditorList.append(row);
  });
}

function removeCategory(id) {
  if (categories.length === 1) return;
  const category = getCategory(id);
  const affected = tasks.filter(task => task.category === id).length;
  const message = affected
    ? `删除“${category.label}”后，其中 ${affected} 项任务会移到其他分类。继续吗？`
    : `确定删除“${category.label}”吗？`;
  if (!window.confirm(message)) return;
  categories = categories.filter(item => item.id !== id);
  const fallbackId = categories[0].id;
  tasks = tasks.map(task => task.category === id ? { ...task, category: fallbackId } : task);
  if (activeFilter === id) activeFilter = "all";
  saveCategories();
  saveTasks();
  render();
  renderCategoryEditor();
}

function createTaskCard(task) {
  const card = refs.taskTemplate.content.firstElementChild.cloneNode(true);
  const category = getCategory(task.category);
  const priority = priorities[task.priority];
  card.dataset.id = task.id;
  card.dataset.priority = task.priority;
  card.classList.toggle("three-stage", task.stages === 3);
  card.classList.toggle("done", task.done);
  card.style.setProperty("--category", category.color);
  card.style.setProperty("--priority", priority.color);
  card.querySelector("h3").textContent = task.title;
  card.querySelector(".category-label").textContent = category.label;
  card.querySelector(".deadline").textContent = formatDeadline(task.deadline);
  const priorityMark = document.createElement("span");
  priorityMark.className = `priority-mark priority-${task.priority}`;
  priorityMark.title = `${priority.label}优先级`;
  priorityMark.innerHTML = `<span class="material-symbols-rounded">${priority.icon}</span><span>${priority.label}</span>`;
  card.querySelector(".task-meta").append(priorityMark);
  if (Number(task.reminderMinutes) >= 0) {
    const reminder = document.createElement("span");
    reminder.className = "reminder-mark";
    reminder.title = reminderLabel(Number(task.reminderMinutes));
    reminder.innerHTML = '<span class="material-symbols-rounded">notifications_active</span>';
    card.querySelector(".task-meta").append(reminder);
  }
  const scoldMark = document.createElement("span");
  scoldMark.className = "mode-mark";
  scoldMark.title = `训话：${scoldModes[task.scoldMode].label}`;
  scoldMark.innerHTML = '<span class="material-symbols-rounded">record_voice_over</span>';
  card.querySelector(".task-meta").append(scoldMark);
  if (task.repeat !== "none") {
    const repeatMark = document.createElement("span");
    repeatMark.className = "mode-mark repeat-mark";
    repeatMark.title = `循环：${repeatLabel(task)}`;
    repeatMark.innerHTML = `<span class="material-symbols-rounded">event_repeat</span><span>${repeatLabel(task)}</span>`;
    card.querySelector(".task-meta").append(repeatMark);
  }
  card.querySelector(".task-note").textContent = task.note || "没有备注";
  const petals = [...card.querySelectorAll(".bloom-flower i")];
  petals.forEach((petal, index) => petal.classList.toggle("open", index < task.progress));
  card.querySelector(".stage-label").textContent = `${task.progress}/${task.stages} 阶段`;
  card.querySelector(".check-button span").textContent = task.done ? "check_circle" : "radio_button_unchecked";
  card.querySelector(".check-button").ariaLabel = task.done ? "重置完成状态" : "推进一个阶段";
  card.querySelector(".check-button").addEventListener("click", event => { event.stopPropagation(); advanceTask(task.id, true); });
  card.querySelector(".edit-button").addEventListener("click", event => { event.stopPropagation(); openTaskDialog(task); });
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
  list.sort(compareTasks).forEach(task => container.append(createTaskCard(task)));
}

function render() {
  renderCategoryControls();
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
  categories.forEach(category => {
    const list = tasks.filter(task => task.category === category.id);
    const done = list.filter(task => task.done).length;
    const card = document.createElement("article");
    card.className = "summary-card";
    const icon = document.createElement("span");
    icon.className = "material-symbols-rounded";
    icon.textContent = category.icon;
    const count = document.createElement("strong");
    count.textContent = `${done}/${list.length}`;
    const label = document.createElement("span");
    label.textContent = category.label;
    card.append(icon, count, label);
    refs.summaryGrid.append(card);
  });
  const totalDone = tasks.filter(task => task.done).length;
  refs.insightText.textContent = totalDone ? `你已经完成 ${totalDone} 项日程。保持节奏，比一口气做完更重要。` : "从最小的一项开始，完成后就会看到进度变化。";
  const nextTask = tasks.filter(task => !task.done).sort(compareTasks)[0];
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
    const nextUnfinished = todayTasks.filter(task => !task.done).sort(compareTasks)[0];
    refs.todayTitle.textContent = "今天也别想偷懒";
    refs.vivianSpeech.textContent = `${scoldLineFor(nextUnfinished, new Date().getDate() + remaining)} 还剩 ${remaining} 项。`;
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
  popSpeech();
  refs.vivianPortrait.classList.remove("patting");
  requestAnimationFrame(() => refs.vivianPortrait.classList.add("patting"));
  setTimeout(() => refs.vivianPortrait.classList.remove("patting"), 760);
  burstHearts();
}

function scoldVivian(unfinished) {
  vivianInteractionIndex += 1;
  const target = unfinished.slice().sort(compareTasks)[0];
  const line = scoldLineFor(target, vivianInteractionIndex);
  refs.todayTitle.textContent = "还敢来招惹我？";
  refs.vivianSpeech.textContent = `${line} 还剩 ${unfinished.length} 项。`;
  popSpeech();
  refs.vivianPortrait.classList.remove("scolding");
  requestAnimationFrame(() => refs.vivianPortrait.classList.add("scolding"));
  setTimeout(() => refs.vivianPortrait.classList.remove("scolding"), 420);
}

function popSpeech() {
  refs.vivianSpeech.classList.remove("speaking");
  requestAnimationFrame(() => refs.vivianSpeech.classList.add("speaking"));
  setTimeout(() => refs.vivianSpeech.classList.remove("speaking"), 460);
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
  const unit = repeatUnits[task.repeatUnit] || repeatUnits.day;
  const repeatRule = task.repeat === "custom"
    ? `RRULE:FREQ=${unit.frequency};INTERVAL=${task.repeatInterval};UNTIL=${task.repeatEnd.replace(/-/g, "")}T235959Z`
    : null;
  const alarm = Number(task.reminderMinutes) >= 0
    ? ["BEGIN:VALARM", `TRIGGER:-PT${Number(task.reminderMinutes)}M`, "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(task.title)}`, "END:VALARM"]
    : [];
  return [
    "BEGIN:VEVENT", `UID:${task.id}@qingcheng`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(task.title)}`, `DESCRIPTION:${icsEscape(`${getCategory(task.category).label}${task.note ? ` · ${task.note}` : ""}`)}`, `PRIORITY:${priorities[task.priority].ics}`,
    ...(repeatRule ? [repeatRule] : []),
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
  const category = getCategory(task.category);
  const options = { body: `${scoldLineFor(task, new Date().getMinutes())}\n${priorities[task.priority].label}优先级 · ${category.label} · ${formatDeadline(task.deadline)}${task.note ? `\n${task.note}` : ""}`, icon: "./icons/icon-192-vivian.png", badge: "./icons/icon-192-vivian.png", tag: `task-${task.id}` };
  try {
    const registration = await navigator.serviceWorker?.ready;
    const title = task.scoldMode === "silent" ? `薇薇安提醒：${task.title}` : `薇薇安：${task.title}还没做？`;
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
    task.notified = true;
    saveTasks();
  } catch { /* Permission or platform support can change at runtime. */ }
}

function nextOccurrence(task) {
  const deadline = dateAfter(task.deadline, task.repeatInterval, task.repeatUnit);
  if (localDateValue(deadline) > task.repeatEnd) return null;
  return normalizeTask({ ...task, id: crypto.randomUUID(), deadline: deadline.toISOString(), progress: 0, done: false, notified: false, nextGenerated: false });
}

function advanceTask(id, allowReset) {
  const tapTime = performance.now();
  const previousTap = taskTapLocks.get(id);
  if (previousTap !== undefined && tapTime - previousTap < 500) return;
  taskTapLocks.set(id, tapTime);
  let advanced = false;
  let spawnedTask = null;
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    if (task.done && allowReset) return { ...task, progress: 0, done: false, notified: false };
    if (task.done) return task;
    advanced = true;
    const progress = Math.min(task.stages, task.progress + 1);
    const done = progress >= task.stages;
    const shouldGenerate = done && task.repeat !== "none" && !task.nextGenerated;
    if (shouldGenerate) spawnedTask = nextOccurrence(task);
    return { ...task, progress, done, nextGenerated: task.nextGenerated || shouldGenerate };
  });
  if (spawnedTask) tasks.push(spawnedTask);
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

function syncRepeatSettings() {
  const enabled = refs.taskRepeat.value === "custom";
  refs.repeatSettings.hidden = !enabled;
  refs.repeatInterval.required = enabled;
  refs.repeatStart.required = enabled;
  refs.repeatEnd.required = enabled;
  if (!enabled) return;
  if (!refs.repeatStart.value) refs.repeatStart.value = localDateValue(refs.deadline.value || new Date());
  if (!refs.repeatEnd.value || refs.repeatEnd.value < refs.repeatStart.value) {
    refs.repeatEnd.value = localDateValue(dateAfter(`${refs.repeatStart.value}T12:00:00`, 1, "month"));
  }
  refs.repeatEnd.min = refs.repeatStart.value;
}

function applyStartDate(deadline, startValue) {
  const [year, month, day] = startValue.split("-").map(Number);
  deadline.setFullYear(year, month - 1, day);
  return deadline;
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === button.dataset.view));
}));

let lastTouchEnd = 0;
document.addEventListener("touchend", event => {
  const touchTime = Date.now();
  if (touchTime - lastTouchEnd < 350) event.preventDefault();
  lastTouchEnd = touchTime;
}, { passive: false });
document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });

document.querySelector("#addButton").addEventListener("click", () => {
  editingTaskId = null;
  refs.form.reset();
  refs.dialogEyebrow.textContent = "NEW TASK";
  refs.dialogTitle.textContent = "新增日程";
  refs.form.querySelector(".primary-button .button-label").textContent = "保存日程";
  const next = new Date(); next.setHours(next.getHours() + 1); next.setMinutes(0, 0, 0);
  refs.deadline.value = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  refs.repeatStart.value = localDateValue(next);
  refs.repeatEnd.value = localDateValue(dateAfter(next, 1, "month"));
  syncRepeatSettings();
  refs.dialog.showModal();
});

function openTaskDialog(task) {
  editingTaskId = task.id;
  refs.dialogEyebrow.textContent = "EDIT TASK";
  refs.dialogTitle.textContent = "编辑日程";
  refs.form.querySelector(".primary-button .button-label").textContent = "保存修改";
  refs.taskTitle.value = task.title;
  refs.taskCategory.value = task.category;
  refs.taskPriority.value = task.priority;
  refs.taskStages.value = String(task.stages);
  const deadline = new Date(task.deadline);
  refs.deadline.value = new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  refs.taskReminder.value = String(task.reminderMinutes);
  refs.taskScoldMode.value = task.scoldMode;
  refs.taskRepeat.value = task.repeat;
  refs.repeatInterval.value = task.repeatInterval;
  refs.repeatUnit.value = task.repeatUnit;
  refs.repeatStart.value = task.repeatStart || localDateValue(deadline);
  refs.repeatEnd.value = task.repeatEnd || localDateValue(dateAfter(deadline, 1, "month"));
  refs.taskNote.value = task.note || "";
  syncRepeatSettings();
  refs.dialog.showModal();
}

refs.taskRepeat.addEventListener("change", syncRepeatSettings);
refs.repeatStart.addEventListener("change", syncRepeatSettings);
refs.repeatEnd.addEventListener("input", () => refs.repeatEnd.setCustomValidity(""));
refs.deadline.addEventListener("change", () => {
  if (refs.taskRepeat.value === "custom" || !refs.deadline.value) return;
  const deadline = new Date(refs.deadline.value);
  refs.repeatStart.value = localDateValue(deadline);
  refs.repeatEnd.value = localDateValue(dateAfter(deadline, 1, "month"));
});

document.querySelector("#closeDialog").addEventListener("click", () => refs.dialog.close());
refs.dialog.addEventListener("close", () => { editingTaskId = null; });
document.querySelector("#manageCategories").addEventListener("click", () => {
  renderCategoryEditor();
  refs.categoryDialog.showModal();
});
document.querySelector("#closeCategoryDialog").addEventListener("click", () => refs.categoryDialog.close());
refs.notificationButton.addEventListener("click", enableNotifications);
refs.patButton.addEventListener("click", patVivian);
refs.vivianPortrait.addEventListener("click", patVivian);
refs.exportAllCalendar.addEventListener("click", exportAllToCalendar);

refs.categoryForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(refs.categoryForm);
  const label = String(data.get("categoryName") || "").trim();
  if (!label) return;
  categories.push({ id: `cat-${crypto.randomUUID()}`, label, color: data.get("categoryColor") || "#8b73d8", icon: "bookmark" });
  saveCategories();
  refs.categoryForm.reset();
  document.querySelector("#newCategoryColor").value = "#8b73d8";
  render();
  renderCategoryEditor();
  refs.newCategoryName.focus();
});

refs.form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(refs.form);
  const reminderMinutes = Number(data.get("reminder"));
  const stages = Number(data.get("stages")) === 3 ? 3 : 1;
  const scoldMode = scoldModes[data.get("scoldMode")] ? data.get("scoldMode") : "sharp";
  const priority = priorities[data.get("priority")] ? data.get("priority") : "medium";
  const repeat = data.get("repeat") === "custom" ? "custom" : "none";
  const repeatInterval = Math.max(1, Math.min(365, Number(data.get("repeatInterval")) || 1));
  const repeatUnit = repeatUnits[data.get("repeatUnit")] ? data.get("repeatUnit") : "day";
  const repeatStart = repeat === "custom" ? data.get("repeatStart") : "";
  const repeatEnd = repeat === "custom" ? data.get("repeatEnd") : "";
  if (repeat === "custom" && repeatEnd < repeatStart) {
    refs.repeatEnd.setCustomValidity("结束日期不能早于开始日期");
    refs.repeatEnd.reportValidity();
    return;
  }
  refs.repeatEnd.setCustomValidity("");
  const deadline = new Date(data.get("deadline"));
  if (repeat === "custom") applyStartDate(deadline, repeatStart);
  const existing = editingTaskId ? tasks.find(task => task.id === editingTaskId) : null;
  const progress = existing ? Math.min(stages, existing.progress) : 0;
  const updated = { id: existing?.id || crypto.randomUUID(), title: data.get("title").trim(), category: data.get("category"), deadline: deadline.toISOString(), stages, progress, reminderMinutes, scoldMode, priority, repeat, repeatInterval, repeatUnit, repeatStart, repeatEnd, nextGenerated: existing?.nextGenerated || false, notified: false, note: data.get("note").trim(), done: progress >= stages };
  if (existing) tasks = tasks.map(task => task.id === existing.id ? normalizeTask(updated) : task);
  else tasks.push(normalizeTask(updated));
  saveTasks(); editingTaskId = null; refs.form.reset(); syncRepeatSettings(); refs.dialog.close(); render();
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
