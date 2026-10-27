const USERS = { darya: "Дарья", danil: "Данил" };

// Шкала слайдеров: 1 — плохо, 5 — хорошо. levels[0] — текст для 1, levels[4] — для 5.
const SLIDERS = [
  {
    key: "sleep", title: "Качество сна", short: "Сон",
    levels: ["Почти не спалось", "Частые и ранние пробуждения", "Несколько пробуждений", "Долгое засыпание", "Крепкий сон"],
  },
  {
    key: "energy", title: "Энергия и силы", short: "Энергия",
    levels: ["Полное истощение", "Сил очень мало", "Хватает на базовое", "Достаточно сил", "Бодрость"],
  },
  {
    key: "anxiety", title: "Тревога", short: "Тревога",
    levels: ["Паника", "Сильный фоновый страх", "Заметное беспокойство", "Лёгкое волнение", "Спокойствие"],
  },
  {
    key: "mood", title: "Настроение", short: "Настроение",
    levels: ["Тоска", "Апатия", "Подавленность", "Ровное", "Хорошее"],
  },
  {
    key: "stomach", title: "Живот", hint: "боль и дискомфорт", short: "Живот",
    levels: ["Сильная боль, спазмы", "Заметная боль", "Дискомфорт", "Лёгкий дискомфорт", "Ничего не беспокоит"],
  },
  {
    key: "focus", title: "Концентрация", short: "Концентрация",
    levels: ["Сильный туман", "Трудно сосредоточиться", "Рассеянность", "В целом ясно", "Ясный ум"],
  },
];

const QUESTIONS = [
  { key: "social", text: "Было ли сегодня желание общаться?", short: "Желание общаться" },
  { key: "tasks", text: "Было ли желание и ресурс делать дела?", short: "Желание делать дела" },
  { key: "joy", text: "Удалось ли испытать хоть малейшую радость?", short: "Радость" },
  { key: "negative", text: "Были ли мысли «всё бессмысленно», «я не справлюсь»?", short: "Негативные мысли" },
];

const ANSWERS = [
  { value: "yes", text: "Да", color: "#7A9E8A" },
  { value: "partly", text: "Частично", color: "#E6C6AE" },
  { value: "no", text: "Нет", color: "#CDBFB5" },
];

// 1 — плохо (терракота), 5 — хорошо (шалфей)
const LEVEL_COLORS = ["#C98272", "#DDA88E", "#E6C6AE", "#A9C0B1", "#8FAB9B"];

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_GEN = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

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

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function todayStr() {
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function timeStr() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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
    await api("/api/save", { action: "login", user: pickedUser, pin });
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
  statsData = null;
  showLogin();
});

async function api(url, payload) {
  const res = await fetch(url, {
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

// draft2: черновики по новой шкале (1 — плохо), старые не подхватываются.
const draftKey = () => `draft2:${session.user}:${todayStr()}`;

function readForm() {
  const morning = {};
  SLIDERS.forEach((s) => (morning[s.key] = Number($(`#s-${s.key}`).value)));
  const evening = { note: $("#note").value };
  QUESTIONS.forEach((q) => {
    const checked = document.querySelector(`input[name="q-${q.key}"]:checked`);
    evening[q.key] = checked ? checked.value : null;
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
      r.checked = !!d.evening && d.evening[q.key] === r.value;
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
      <p class="level" id="l-${s.key}" aria-live="polite"></p>
    </div>`
  ).join("");

  $("#questions").innerHTML = QUESTIONS.map(
    (q) => `
    <fieldset class="question">
      <legend>${q.text}</legend>
      <div class="yn">
        ${ANSWERS.map((a) => `<label><input type="radio" name="q-${q.key}" value="${a.value}"><span>${a.text}</span></label>`).join("")}
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
  const key = input.id.slice(2);
  const color = LEVEL_COLORS[v - 1];
  input.style.setProperty("--color", color);
  input.style.setProperty("--pct", ((v - 1) / 4) * 100 + "%");
  input.setAttribute("aria-valuetext", `${v}: ${SLIDERS.find((s) => s.key === key).levels[v - 1]}`);
  const out = $(`#o-${key}`);
  out.textContent = v;
  out.style.background = color;
  $(`#l-${key}`).textContent = SLIDERS.find((s) => s.key === key).levels[v - 1];
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
    await api("/api/save", { user: session.user, pin: session.pin, part, date: todayStr(), time: timeStr(), data });
    msg.textContent = part === "morning" ? "Сохранено. Хорошего дня 🌿" : "Сохранено. Спокойной ночи 🌙";
    msg.className = "msg ok";
    statsData = null;
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

/* ---------- Вкладки ---------- */

function setView(view) {
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.dataset.view === view;
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", String(on));
  });
  $("#track-view").hidden = view !== "track";
  $("#stats-view").hidden = view !== "stats";
  hideTip();
  if (view === "stats") {
    document.body.classList.remove("night");
    loadStats();
  } else {
    setMode(document.querySelector('.toggle-label[data-for="evening"]').classList.contains("on") ? "evening" : "morning");
  }
}

document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setView(t.dataset.view)));

/* ---------- Статистика ---------- */

let statsData = null; // записи с сервера, null — нужно загрузить заново
let statsDays = store("statsDays") === 30 ? 30 : 7;
let calMonth = null; // первое число показанного месяца

async function loadStats() {
  const msg = $("#stats-msg");
  if (statsData) return renderStats();
  msg.textContent = "Загружаю…";
  msg.className = "msg";
  $("#stats").innerHTML = "";
  try {
    const { entries } = await api("/api/stats", { user: session.user, pin: session.pin });
    statsData = entries;
    msg.textContent = "";
    renderStats();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
}

// Последние n дней, заканчивая сегодняшним: [{ iso, date }]
function lastDays(n, offset = 0) {
  const out = [];
  const today = new Date();
  for (let i = n - 1 + offset; i >= offset; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push({ iso: isoOf(d), date: d });
  }
  return out;
}

const fmtNum = (n) => n.toFixed(1).replace(".", ",");
const fmtDay = (d) => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

function dayWellbeing(entry) {
  if (!entry || !entry.morning) return null;
  return avg(SLIDERS.map((s) => entry.morning[s.key]).filter((v) => typeof v === "number"));
}

function renderStats() {
  const byDate = new Map(statsData.map((e) => [e.date, e]));
  if (!statsData.length) {
    $("#stats").innerHTML = `<div class="card empty">Пока нет записей. Заполните дневник, и здесь появится статистика.</div>`;
    return;
  }
  if (!calMonth) {
    const t = new Date();
    calMonth = new Date(t.getFullYear(), t.getMonth(), 1);
  }
  const days = lastDays(statsDays);
  $("#stats").innerHTML = [
    renderWeek(byDate),
    renderCalendar(byDate),
    `<div class="period" role="group" aria-label="Период">
      ${[7, 30].map((n) => `<button type="button" class="chip${n === statsDays ? " on" : ""}" data-days="${n}" aria-pressed="${n === statsDays}">${n} дней</button>`).join("")}
    </div>`,
    renderCharts(days, byDate),
    renderEvening(days, byDate),
    renderNotes(days, byDate),
  ].join("");
}

function renderWeek(byDate) {
  const cur = lastDays(7);
  const prev = lastDays(7, 7);
  const values = (list, key) =>
    list.map((d) => byDate.get(d.iso)).filter((e) => e && e.morning && typeof e.morning[key] === "number").map((e) => e.morning[key]);

  const rows = SLIDERS.map((s) => {
    const now = avg(values(cur, s.key));
    const before = avg(values(prev, s.key));
    let delta = `<span class="delta">нет данных за прошлую неделю</span>`;
    if (now === null) delta = `<span class="delta">нет записей</span>`;
    else if (before !== null) {
      const diff = Math.round((now - before) * 10) / 10;
      if (diff > 0) delta = `<span class="delta up">↑ ${fmtNum(diff)} лучше</span>`;
      else if (diff < 0) delta = `<span class="delta down">↓ ${fmtNum(-diff)} хуже</span>`;
      else delta = `<span class="delta">без изменений</span>`;
    }
    const dot = now === null ? "" : `<span class="dot" style="background:${LEVEL_COLORS[Math.round(now) - 1]}"></span>`;
    return `<li><span class="w-name">${s.short}</span><span class="w-val">${dot}${now === null ? "—" : fmtNum(now)}</span>${delta}</li>`;
  }).join("");

  return `<div class="card">
    <h2>Эта неделя</h2>
    <p class="card-sub">Среднее за последние 7 дней и сравнение с неделей до них. 5 — хорошо.</p>
    <ul class="week">${rows}</ul>
  </div>`;
}

function renderCalendar(byDate) {
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const total = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // понедельник — первый день
  const todayIso = isoOf(new Date());
  const now = new Date();
  const isCurrent = y === now.getFullYear() && m === now.getMonth();

  let cells = "";
  for (let i = 0; i < lead; i++) cells += `<span class="cal-cell blank"></span>`;
  for (let d = 1; d <= total; d++) {
    const date = new Date(y, m, d);
    const iso = isoOf(date);
    const w = dayWellbeing(byDate.get(iso));
    const cls = ["cal-cell"];
    if (iso === todayIso) cls.push("today");
    if (iso > todayIso) cls.push("future");
    if (w === null) {
      cells += `<span class="${cls.join(" ")}">${d}</span>`;
    } else {
      const lvl = Math.round(w);
      cls.push("filled");
      cells += `<span class="${cls.join(" ")}" style="background:${LEVEL_COLORS[lvl - 1]}" data-tip="${fmtDay(date)} · среднее ${fmtNum(w)}" tabindex="0">${d}</span>`;
    }
  }

  const legend = LEVEL_COLORS.map((c, i) => `<span class="lg-item"><span class="swatch" style="background:${c}"></span>${i + 1}</span>`).join("");

  return `<div class="card">
    <div class="cal-head">
      <button type="button" class="cal-nav" data-cal="-1" aria-label="Предыдущий месяц">‹</button>
      <h2>${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} ${y}</h2>
      <button type="button" class="cal-nav" data-cal="1" aria-label="Следующий месяц"${isCurrent ? " disabled" : ""}>›</button>
    </div>
    <p class="card-sub">Цвет дня — среднее по утренним показателям.</p>
    <div class="cal-grid">
      ${["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => `<span class="cal-dow">${d}</span>`).join("")}
      ${cells}
    </div>
    <div class="legend"><span>плохо</span>${legend}<span>хорошо</span></div>
  </div>`;
}

function renderCharts(days, byDate) {
  const W = 320, H = 118, L = 22, R = 10, T = 10, B = 24;
  const x = (i) => L + (days.length === 1 ? 0 : (i * (W - L - R)) / (days.length - 1));
  const y = (v) => T + ((5 - v) * (H - T - B)) / 4;
  const colW = (W - L - R) / Math.max(days.length - 1, 1);
  const labelIdx = days.length === 7 ? [0, 3, 6] : [0, 10, 20, 29];

  const charts = SLIDERS.map((s) => {
    const pts = days.map((d, i) => {
      const e = byDate.get(d.iso);
      const v = e && e.morning ? e.morning[s.key] : null;
      return typeof v === "number" ? { i, v, d } : { i, v: null, d };
    });

    // Линия рвётся там, где день пропущен.
    let path = "";
    pts.forEach((p, k) => {
      if (p.v === null) return;
      const prev = pts[k - 1];
      path += `${prev && prev.v !== null ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`;
    });

    const grid = [1, 2, 3, 4, 5].map((v) =>
      `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/>` +
      (v % 2 ? `<text x="${L - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>` : "")
    ).join("");
    const xLabels = labelIdx.map((i) =>
      `<text x="${x(i)}" y="${H - 6}" class="axis" text-anchor="${i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}">${pad(days[i].date.getDate())}.${pad(days[i].date.getMonth() + 1)}</text>`
    ).join("");
    const dots = pts.filter((p) => p.v !== null).map((p) =>
      `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="${days.length > 7 ? 3.5 : 5}" fill="${LEVEL_COLORS[p.v - 1]}" class="pt"/>`
    ).join("");
    const hits = pts.map((p) => {
      const tip = p.v === null ? `${fmtDay(p.d.date)} · нет записи` : `${fmtDay(p.d.date)} · ${p.v} — ${s.levels[p.v - 1]}`;
      return `<rect x="${x(p.i) - colW / 2}" y="0" width="${colW}" height="${H - B + 4}" class="hit" data-tip="${escapeHtml(tip)}" data-x="${x(p.i)}"/>`;
    }).join("");
    const filled = pts.filter((p) => p.v !== null).length;

    return `<figure class="chart">
      <figcaption><span>${s.title}</span><span class="count">${filled} из ${days.length} дней</span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${s.title} за ${days.length} дней">
        ${grid}${xLabels}
        <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" hidden/>
        <path d="${path}" class="line"/>
        ${dots}${hits}
      </svg>
    </figure>`;
  }).join("");

  return `<div class="card">
    <h2>Утро по дням</h2>
    <p class="card-sub">1 — плохо, 5 — хорошо. Нажмите на день, чтобы увидеть ответ.</p>
    ${charts}
  </div>`;
}

function renderEvening(days, byDate) {
  const evenings = days.map((d) => byDate.get(d.iso)).filter((e) => e && e.evening);
  if (!evenings.length) {
    return `<div class="card"><h2>Вечер</h2><p class="card-sub">За ${statsDays} дней вечерних записей нет.</p></div>`;
  }
  const rows = QUESTIONS.map((q) => {
    const counts = ANSWERS.map((a) => ({ ...a, n: evenings.filter((e) => e.evening[q.key] === a.value).length }));
    const total = counts.reduce((s, c) => s + c.n, 0) || 1;
    const bar = counts.filter((c) => c.n).map((c) =>
      `<span class="seg" style="flex:${c.n};background:${c.color}" data-tip="${c.text}: ${c.n} из ${total}" tabindex="0"></span>`
    ).join("");
    const labels = counts.map((c) => `<span>${c.text} ${Math.round((c.n / total) * 100)}%</span>`).join("");
    return `<div class="share">
      <div class="share-title">${q.short}</div>
      <div class="bar">${bar}</div>
      <div class="share-labels">${labels}</div>
    </div>`;
  }).join("");
  const legend = ANSWERS.map((a) => `<span class="lg-item"><span class="swatch" style="background:${a.color}"></span>${a.text}</span>`).join("");

  return `<div class="card">
    <h2>Вечер</h2>
    <p class="card-sub">Ответы за ${statsDays} дней, вечерних записей: ${evenings.length}.</p>
    <div class="legend">${legend}</div>
    ${rows}
  </div>`;
}

function renderNotes(days, byDate) {
  const notes = days
    .map((d) => ({ d, e: byDate.get(d.iso) }))
    .filter(({ e }) => e && e.evening && e.evening.note && e.evening.note.trim())
    .reverse();
  const list = notes.length
    ? `<ul class="notes">${notes.map(({ d, e }) => {
        const w = dayWellbeing(e);
        const dot = w === null ? "" : `<span class="dot" style="background:${LEVEL_COLORS[Math.round(w) - 1]}" title="Среднее утром: ${fmtNum(w)}"></span>`;
        return `<li><div class="note-date">${dot}${fmtDay(d.date)}</div><div class="note-text">${escapeHtml(e.evening.note)}</div></li>`;
      }).join("")}</ul>`
    : `<p class="card-sub">За ${statsDays} дней заметок нет.</p>`;
  return `<div class="card"><h2>Заметки</h2>${list}</div>`;
}

$("#stats").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    statsDays = Number(chip.dataset.days);
    store("statsDays", statsDays);
    renderStats();
    return;
  }
  const nav = e.target.closest(".cal-nav");
  if (nav) {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(nav.dataset.cal), 1);
    renderStats();
    return;
  }
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t, e);
});

/* ---------- Подсказки при наведении и нажатии ---------- */

let tipTimer = null;

function showTip(el, ev) {
  const tip = $("#tip");
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const svg = el.ownerSVGElement;
  document.querySelectorAll(".cross").forEach((c) => c.setAttribute("hidden", ""));
  if (svg && el.dataset.x) {
    const cross = svg.querySelector(".cross");
    cross.setAttribute("x1", el.dataset.x);
    cross.setAttribute("x2", el.dataset.x);
    cross.removeAttribute("hidden");
  }
  const r = el.getBoundingClientRect();
  const cx = ev && ev.clientX ? ev.clientX : r.left + r.width / 2;
  const top = r.top + window.scrollY - tip.offsetHeight - 8;
  const left = Math.min(Math.max(cx - tip.offsetWidth / 2, 8), document.documentElement.clientWidth - tip.offsetWidth - 8);
  tip.style.top = Math.max(top, window.scrollY + 8) + "px";
  tip.style.left = left + "px";
  clearTimeout(tipTimer);
  tipTimer = setTimeout(hideTip, 3000);
}

function hideTip() {
  $("#tip").hidden = true;
  document.querySelectorAll(".cross").forEach((c) => c.setAttribute("hidden", ""));
}

$("#stats").addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse") return;
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t, e);
});
$("#stats").addEventListener("pointerout", (e) => {
  if (e.pointerType === "mouse" && e.target.closest("[data-tip]")) hideTip();
});
$("#stats").addEventListener("focusin", (e) => {
  if (e.target.dataset && e.target.dataset.tip) showTip(e.target);
});
$("#stats").addEventListener("focusout", hideTip);

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
    link.download = `shtil-${session.user}.csv`;
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
  setView("track");
}

buildForm();
if (session && USERS[session.user]) showApp();
else showLogin();
