// Сохраняет утренний или вечерний трек. Повторная отправка за тот же день перезаписывает эту часть.
import {
  json, readBody, checkPin, store, dayKey,
  MORNING_KEYS, EVENING_KEYS, ANSWERS, SCALE_VERSION,
} from "../lib/common.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Только POST" });
  const body = await readBody(req);
  if (!body) return json(400, { error: "Неверный запрос" });

  if (!(await checkPin(body.user, body.pin))) return json(401, { error: "Неверный PIN" });
  if (body.action === "login") return json(200, { ok: true });

  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(body.date || "");
  if (!m) return json(400, { error: "Неверная дата" });
  if (body.part !== "morning" && body.part !== "evening") return json(400, { error: "Неверный тип трека" });

  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = body.data || {};
  const part = { time: String(body.time || "").slice(0, 5) };
  if (body.part === "morning") {
    part.scale = SCALE_VERSION;
    MORNING_KEYS.forEach((k) => {
      const n = Number(d[k]);
      part[k] = n >= 1 && n <= 5 ? n : null;
    });
  } else {
    EVENING_KEYS.forEach((k) => (part[k] = ANSWERS.includes(d[k]) ? d[k] : null));
    part.note = String(d.note || "").slice(0, 2000);
  }

  try {
    const s = store();
    const key = dayKey(body.user, iso);
    const entry = (await s.get(key, { type: "json" })) || { date: iso };
    entry[body.part] = part;
    await s.setJSON(key, entry);
    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Не удалось сохранить. Попробуйте ещё раз." });
  }
};

export const config = { path: "/api/save" };
