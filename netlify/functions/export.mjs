// Отдаёт все записи пользователя файлом CSV (открывается в Excel и Google Таблицах).
import { json, readBody, checkPin, loadAll } from "../lib/common.mjs";

const HEADER = [
  "Дата",
  "Утро: время",
  // Шкала везде одна: 1 — плохо, 5 — хорошо.
  "Сон", "Энергия", "Тревога", "Настроение", "Живот", "Концентрация",
  "Вечер: время",
  "Общение", "Дела", "Радость", "Негативные мысли", "Заметка",
];

const ANSWER_TEXT = { yes: "Да", partly: "Частично", no: "Нет" };
const answer = (v) => ANSWER_TEXT[v] || "";

// Excel в русской локали ждёт ";" как разделитель.
const cell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Только POST" });
  const body = await readBody(req);
  if (!body) return json(400, { error: "Неверный запрос" });
  if (!(await checkPin(body.user, body.pin))) return json(401, { error: "Неверный PIN" });

  try {
    const entries = await loadAll(body.user);
    const rows = entries.map((e) => {
      const [y, mo, d] = e.date.split("-");
      const m = e.morning || {};
      const ev = e.evening || {};
      return [
        `${d}.${mo}.${y}`,
        m.time, m.sleep, m.energy, m.anxiety, m.mood, m.stomach, m.focus,
        ev.time, answer(ev.social), answer(ev.tasks), answer(ev.joy), answer(ev.negative), ev.note,
      ];
    });

    const csv = "\uFEFF" + [HEADER, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="shtil-${body.user}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Не удалось выгрузить данные. Попробуйте ещё раз." });
  }
};

export const config = { path: "/api/export" };
