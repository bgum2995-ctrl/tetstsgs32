// Записывает утренний или вечерний трек в Google Таблицу пользователя.
// Одна строка на день: если строка с этой датой уже есть, она перезаписывается.
import crypto from "node:crypto";

const USERS = {
  darya: { pin: "DARYA_PIN", sheet: "DARYA_SHEET_ID" },
  danil: { pin: "DANIL_PIN", sheet: "DANIL_SHEET_ID" },
};

const HEADER = [
  "Дата",
  "Утро: время",
  "Сон", "Энергия", "Тревога", "Настроение", "Живот", "Концентрация",
  "Вечер: время",
  "Общение", "Дела", "Радость", "Негативные мысли", "Заметка",
];

const MORNING_KEYS = ["sleep", "energy", "anxiety", "mood", "stomach", "focus"];
const EVENING_KEYS = ["social", "tasks", "joy", "negative"];

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Не настроен сервисный аккаунт Google");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(key).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error("Google не выдал доступ: " + (await res.text()));
  return (await res.json()).access_token;
}

async function sheets(token, sheetId, path, options = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!res.ok) throw new Error("Ошибка Google Таблицы: " + (await res.text()));
  return res.json();
}

const yesNo = (v) => (v === true ? "Да" : v === false ? "Нет" : "");

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Только POST" });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Неверный запрос" });
  }

  const user = USERS[body.user];
  const expectedPin = user && process.env[user.pin];
  if (!user || !expectedPin || String(body.pin) !== String(expectedPin)) {
    await new Promise((r) => setTimeout(r, 800));
    return json(401, { error: "Неверный PIN" });
  }
  if (body.action === "login") return json(200, { ok: true });

  const sheetId = process.env[user.sheet];
  if (!sheetId) return json(500, { error: "Не указана таблица для пользователя" });
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(body.date || "")) return json(400, { error: "Неверная дата" });
  if (body.part !== "morning" && body.part !== "evening") return json(400, { error: "Неверный тип трека" });

  try {
    const token = await getAccessToken();

    // Данные пишутся на первый лист таблицы.
    const meta = await sheets(token, sheetId, "?fields=sheets.properties.title");
    const tab = `'${meta.sheets[0].properties.title.replace(/'/g, "''")}'`;

    const existing = await sheets(token, sheetId, `/values/${encodeURIComponent(tab + "!A:A")}`);
    const dates = (existing.values || []).map((r) => r[0]);

    if (dates[0] !== HEADER[0]) {
      await sheets(token, sheetId, `/values/${encodeURIComponent(tab + "!A1:N1")}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [HEADER] }),
      });
      if (dates.length === 0) dates.push(HEADER[0]);
      else dates[0] = HEADER[0];
    }

    let row = dates.indexOf(body.date) + 1;
    if (row === 0) row = dates.length + 1;

    const d = body.data || {};
    const updates = [{ range: `${tab}!A${row}`, values: [[body.date]] }];
    if (body.part === "morning") {
      const vals = MORNING_KEYS.map((k) => {
        const n = Number(d[k]);
        return n >= 1 && n <= 5 ? n : "";
      });
      updates.push({ range: `${tab}!B${row}:H${row}`, values: [[body.time || "", ...vals]] });
    } else {
      const vals = EVENING_KEYS.map((k) => yesNo(d[k]));
      const note = String(d.note || "").slice(0, 2000);
      updates.push({ range: `${tab}!I${row}:N${row}`, values: [[body.time || "", ...vals, note]] });
    }

    await sheets(token, sheetId, "/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
    });

    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Не удалось сохранить. Попробуйте ещё раз." });
  }
};

export const config = { path: "/api/save" };
