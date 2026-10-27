// Общее для функций: проверка PIN и доступ к хранилищу Netlify Blobs.
import { getStore } from "@netlify/blobs";

const USERS = {
  darya: "DARYA_PIN",
  danil: "DANIL_PIN",
};

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Возвращает true, если PIN верный. При неверном PIN ждёт, чтобы затруднить перебор.
export async function checkPin(user, pin) {
  const envName = USERS[user];
  const expected = envName && String(process.env[envName] || "").trim();
  if (envName && !expected) console.warn(`Переменная ${envName} не задана в Netlify`);
  if (expected && String(pin || "").trim() === expected) return true;
  await new Promise((r) => setTimeout(r, 800));
  return false;
}

// Одна запись на день: ключ "<user>/<ГГГГ-ММ-ДД>".
export const store = () => getStore({ name: "tracker", consistency: "strong" });
export const dayKey = (user, isoDate) => `${user}/${isoDate}`;

export const MORNING_KEYS = ["sleep", "energy", "anxiety", "mood", "stomach", "focus"];
export const EVENING_KEYS = ["social", "tasks", "joy", "negative"];
export const ANSWERS = ["yes", "partly", "no"];

// Текущая шкала слайдеров: 1 — плохо, 5 — хорошо. Записи до 27.10.2026 сохранены
// без поля scale по старой шкале (1 — хорошо, 5 — плохо) и переворачиваются при чтении.
export const SCALE_VERSION = 2;

// Приводит запись к текущему формату: шкала 1 — плохо, ответы "yes" / "partly" / "no".
export function normalize(entry) {
  const out = { date: entry.date, morning: null, evening: null };
  if (entry.morning) {
    const old = entry.morning.scale !== SCALE_VERSION;
    out.morning = { time: entry.morning.time || "" };
    MORNING_KEYS.forEach((k) => {
      const v = entry.morning[k];
      out.morning[k] = typeof v === "number" ? (old ? 6 - v : v) : null;
    });
  }
  if (entry.evening) {
    out.evening = { time: entry.evening.time || "", note: entry.evening.note || "" };
    EVENING_KEYS.forEach((k) => {
      const v = entry.evening[k];
      out.evening[k] = v === true ? "yes" : v === false ? "no" : ANSWERS.includes(v) ? v : null;
    });
  }
  return out;
}

// Все записи пользователя по возрастанию даты, в текущем формате.
export async function loadAll(user) {
  const s = store();
  const { blobs } = await s.list({ prefix: `${user}/` });
  const keys = blobs.map((b) => b.key).sort();
  const entries = await Promise.all(keys.map((k) => s.get(k, { type: "json" })));
  return entries.filter(Boolean).map(normalize);
}
