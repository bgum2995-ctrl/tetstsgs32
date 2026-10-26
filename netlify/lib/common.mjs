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
