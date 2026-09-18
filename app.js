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
  { id: crypto.randomUUID(), title: "六级词汇 50 个", category: "cet6", deadline: at(0, 9), note: "复习昨天的错词", done: false },
  { id: crypto.randomUUID(), title: "催实验数据", category: "lab", deadline: at(0, 14, 30), note: "联系同组同学确认数据", done: false },
  { id: crypto.randomUUID(), title: "提交高数作业", category: "homework", deadline: at(0, 22), note: "检查第 4 题计算过程", done: false },
  { id: crypto.randomUUID(), title: "六级听力真题", category: "cet6", deadline: at(1, 19, 30), note: "2024 年 6 月第一套", done: false },
  { id: crypto.randomUUID(), title: "实验报告初稿", category: "lab", deadline: at(2, 18), note: "完成结果分析部分", done: false },
  { id: crypto.randomUUID(), title: "线性代数习题", category: "homework", deadline: at(4, 22), note: "第 3 章课后题", done: false },
];

let tasks = loadTasks();
let activeFilter = "all";

const refs = {
  todayLabel: document.querySelector("#todayLabel"),
  progressValue: document.querySelector("#progressValue"),
  remainingCount: document.querySelector("#remainingCount"),
  todayTasks: document.querySelector("#todayTasks"),
  allTasks: document.querySelector("#allTasks"),
  summaryGrid: document.querySelector("#summaryGrid"),
  insightText: document.querySelector("#insightText"),
  taskTemplate: document.querySelector("#taskTemplate"),
  dialog: document.querySelector("#taskDialog"),
  form: document.querySelector("#taskForm"),
  deadline: document.querySelector("#taskDeadline"),
};

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : seedTasks;
  } catch { return seedTasks; }
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
  card.classList.toggle("done", task.done);
  card.style.setProperty("--category", category.color);
  card.querySelector("h3").textContent = task.title;
  card.querySelector(".category-label").textContent = category.label;
  card.querySelector(".deadline").textContent = formatDeadline(task.deadline);
  card.querySelector(".task-note").textContent = task.note || "没有备注";
  card.querySelector(".check-button span").textContent = task.done ? "check_circle" : "radio_button_unchecked";
  card.querySelector(".check-button").addEventListener("click", () => toggleTask(task.id));
  card.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
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
  const percent = todayTasks.length ? Math.round(doneToday / todayTasks.length * 100) : 0;
  refs.progressValue.textContent = `${percent}%`;
  refs.progressValue.parentElement.style.setProperty("--progress", `${percent}%`);
  refs.remainingCount.textContent = `${todayTasks.length - doneToday} 项待完成`;

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
}

function toggleTask(id) {
  tasks = tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
  saveTasks(); render();
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

refs.form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(refs.form);
  tasks.push({ id: crypto.randomUUID(), title: data.get("title").trim(), category: data.get("category"), deadline: new Date(data.get("deadline")).toISOString(), note: data.get("note").trim(), done: false });
  saveTasks(); refs.form.reset(); refs.dialog.close(); render();
});

const preferredTheme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.body.classList.toggle("dark", preferredTheme === "dark");
document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

refs.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
render();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
