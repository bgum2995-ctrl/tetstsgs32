const USERS = { darya: "Дарья", danil: "Данил" };

const SLIDERS = [
  { key: "sleep", title: "Качество сна", hint: "частые и ранние пробуждения", good: "Крепкий сон", bad: "Почти без сна" },
  { key: "energy", title: "Энергия и силы", good: "Бодрость", bad: "Полное истощение" },
  { key: "anxiety", title: "Тревога", good: "Спокойствие", bad: "Сильный страх, паника" },
  { key: "mood", title: "Настроение", good: "Ровное, хорошее", bad: "Апатия, тоска" },
  { key: "stomach", title: "Живот", hint: "боль и дискомфорт", good: "Нет симптомов", bad: "Сильные спазмы, боль" },
  { key: "focus", title: "Концентрация", good: "Ясный ум", bad: "Туман в голове" },
];

const QUESTIONS = [
  { key: "social", text: "Было ли сегодня желание общаться?" },
  { key: "tasks", text: "Было ли желание и ресурс делать дела?" },
  { key: "joy", text: "Удалось ли испытать хоть малейшую радость?" },
  { key: "negative", text: "Были ли мысли «всё бессмысленно», «я не справлюсь»?" },
];

// 1 — хорошо, 5 — плохо
const LEVEL_COLORS = ["#8FAB9B", "#A9C0B1", "#E6C6AE", "#DDA88E", "#C98272"];

const $ = (s) => document.querySelector(s);

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function timeStr() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

let session = store("session");
let pickedUser = null;

/* ---------- Вход ---------- */

document.querySelectorAll(".profile").forEach((btn) => {
  btn.addEventListener("click", () => {
    pickedUser = btn.dataset.user;
    document.querySelectorAll(".profile").forEach((b) => b.classList.toggle("active", b === btn));
    $("#pin-form").hidden = false;
    $("#pin").focus();
  });
});

$("#pin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#login-msg");
  msg.textContent = "Проверяю…";
  msg.className = "msg";
  const pin = $("#pin").value.trim();
  try {
    await api({ action: "login", user: pickedUser, pin });
    session = { user: pickedUser, pin };
    store("session", session);
    $("#pin").value = "";
    msg.textContent = "";
    showApp();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
});

$("#logout").addEventListener("click", () => {
  store("session", null);
  session = null;
  showLogin();
});

async function api(payload) {
  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data.error || "Нет связи с сервером");
  return data;
}

/* ---------- Черновик ---------- */

const draftKey = () => `draft:${session.user}:${todayStr()}`;

function readForm() {
  const morning = {};
  SLIDERS.forEach((s) => (morning[s.key] = Number($(`#s-${s.key}`).value)));
  const evening = { note: $("#note").value };
  QUESTIONS.forEach((q) => {
    const checked = document.querySelector(`input[name="q-${q.key}"]:checked`);
    evening[q.key] = checked ? checked.value === "yes" : null;
  });
  return { morning, evening };
}

function saveDraft() {
  store(draftKey(), readForm());
}

function loadDraft() {
  const d = store(draftKey()) || {};
  SLIDERS.forEach((s) => {
    const input = $(`#s-${s.key}`);
    input.value = (d.morning && d.morning[s.key]) || 3;
    paintSlider(input);
  });
  QUESTIONS.forEach((q) => {
    document.querySelectorAll(`input[name="q-${q.key}"]`).forEach((r) => {
      const v = d.evening ? d.evening[q.key] : null;
      r.checked = v !== null && v !== undefined && (r.value === "yes") === v;
    });
  });
  $("#note").value = (d.evening && d.evening.note) || "";
}

/* ---------- Форма ---------- */

function buildForm() {
  $("#sliders").innerHTML = SLIDERS.map(
    (s) => `
    <div class="slider">
      <div class="slider-head">
        <label for="s-${s.key}">${s.title}${s.hint ? `<span class="hint">${s.hint}</span>` : ""}</label>
        <output id="o-${s.key}" class="badge"></output>
      </div>
      <input type="range" id="s-${s.key}" min="1" max="5" step="1" value="3">
      <div class="ticks">${[1, 2, 3, 4, 5].map((n) => `<span>${n}</span>`).join("")}</div>
      <div class="ends"><span>${s.good}</span><span>${s.bad}</span></div>
    </div>`
  ).join("");

  $("#questions").innerHTML = QUESTIONS.map(
    (q) => `
    <fieldset class="question">
      <legend>${q.text}</legend>
      <div class="yn">
        <label><input type="radio" name="q-${q.key}" value="yes"><span>Да</span></label>
        <label><input type="radio" name="q-${q.key}" value="no"><span>Нет</span></label>
      </div>
    </fieldset>`
  ).join("");

  document.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("input", () => {
      paintSlider(input);
      saveDraft();
    });
  });
  document.querySelectorAll('#evening input, #note').forEach((el) => el.addEventListener("input", saveDraft));

  $("#morning").addEventListener("submit", (e) => submit(e, "morning"));
  $("#evening").addEventListener("submit", (e) => submit(e, "evening"));
}

function paintSlider(input) {
  const v = Number(input.value);
  const color = LEVEL_COLORS[v - 1];
  const pct = ((v - 1) / 4) * 100;
  input.style.setProperty("--color", color);
  input.style.setProperty("--pct", pct + "%");
  const out = $(`#o-${input.id.slice(2)}`);
  out.textContent = v;
  out.style.background = color;
}

async function submit(e, part) {
  e.preventDefault();
  const form = e.currentTarget;
  const msg = form.querySelector(".msg");
  const btn = form.querySelector(".btn");
  const data = readForm()[part];

  if (part === "evening" && QUESTIONS.some((q) => data[q.key] === null)) {
    msg.textContent = "Ответьте, пожалуйста, на все четыре вопроса";
    msg.className = "msg error";
    return;
  }

  btn.disabled = true;
  msg.textContent = "Сохраняю…";
  msg.className = "msg";
  try {
    await api({ user: session.user, pin: session.pin, part, date: todayStr(), time: timeStr(), data });
    msg.textContent = part === "morning" ? "Сохранено. Хорошего дня 🌿" : "Сохранено. Спокойной ночи 🌙";
    msg.className = "msg ok";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
    if (err.message === "Неверный PIN") setTimeout(() => $("#logout").click(), 1500);
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Утро / вечер ---------- */

function setMode(mode) {
  const evening = mode === "evening";
  document.body.classList.toggle("night", evening);
  $("#toggle").setAttribute("aria-checked", String(evening));
  $("#morning").hidden = evening;
  $("#evening").hidden = !evening;
  document.querySelectorAll(".toggle-label").forEach((l) => l.classList.toggle("on", l.dataset.for === mode));
  document.querySelectorAll(".track .msg").forEach((m) => (m.textContent = ""));
}

$("#toggle").addEventListener("click", () => {
  setMode(document.body.classList.contains("night") ? "morning" : "evening");
});
document.querySelectorAll(".toggle-label").forEach((l) => l.addEventListener("click", () => setMode(l.dataset.for)));

/* ---------- Выгрузка ---------- */

$("#download").addEventListener("click", async () => {
  const btn = $("#download");
  const msg = $("#download-msg");
  btn.disabled = true;
  msg.textContent = "Готовлю файл…";
  msg.className = "msg";
  try {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: session.user, pin: session.pin }),
    });
    if (!res.ok) {
      let data = {};
      try {
        data = await res.json();
      } catch {}
      throw new Error(data.error || "Нет связи с сервером");
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `tracker-${session.user}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg.textContent = "";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Экраны ---------- */

function showLogin() {
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#pin-form").hidden = true;
  document.querySelectorAll(".profile").forEach((b) => b.classList.remove("active"));
  document.body.classList.remove("night");
}

function showApp() {
  $("#login").hidden = true;
  $("#app").hidden = false;
  $("#user-name").textContent = USERS[session.user];
  $("#today").textContent = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  loadDraft();
  setMode(new Date().getHours() < 15 ? "morning" : "evening");
}

buildForm();
if (session && USERS[session.user]) showApp();
else showLogin();
