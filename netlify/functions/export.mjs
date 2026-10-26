// Отдаёт все записи пользователя файлом CSV (открывается в Excel и Google Таблицах).
import { json, readBody, checkPin, store } from "../lib/common.mjs";

const HEADER = [
  "Дата",
  "Утро: время",
  "Сон", "Энергия", "Тревога", "Настроение", "Живот", "Концентрация",
  "Вечер: время",
  "Общение", "Дела", "Радость", "Негативные мысли", "Заметка",
];

const yesNo = (v) => (v === true ? "Да" : v === false ? "Нет" : "");

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
    const s = store();
    const { blobs } = await s.list({ prefix: `${body.user}/` });
    const keys = blobs.map((b) => b.key).sort();
    const entries = await Promise.all(keys.map((k) => s.get(k, { type: "json" })));

    const rows = entries.filter(Boolean).map((e) => {
      const [y, mo, d] = e.date.split("-");
      const m = e.morning || {};
      const ev = e.evening || {};
      return [
        `${d}.${mo}.${y}`,
        m.time, m.sleep, m.energy, m.anxiety, m.mood, m.stomach, m.focus,
        ev.time, yesNo(ev.social), yesNo(ev.tasks), yesNo(ev.joy), yesNo(ev.negative), ev.note,
      ];
    });

    const csv = "﻿" + [HEADER, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
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
