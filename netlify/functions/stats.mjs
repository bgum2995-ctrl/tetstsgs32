// Отдаёт все записи пользователя для вкладки «Статистика». Считает статистику сам сайт.
import { json, readBody, checkPin, loadAll } from "../lib/common.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Только POST" });
  const body = await readBody(req);
  if (!body) return json(400, { error: "Неверный запрос" });
  if (!(await checkPin(body.user, body.pin))) return json(401, { error: "Неверный PIN" });

  try {
    return json(200, { entries: await loadAll(body.user) });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Не удалось загрузить статистику. Попробуйте ещё раз." });
  }
};

export const config = { path: "/api/stats" };
