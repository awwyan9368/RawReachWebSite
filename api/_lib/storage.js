const fs = require("fs/promises");
const path = require("path");

const MAX_BODY_BYTES = 32 * 1024;
const LEADS_KEY = process.env.UPSTASH_LEADS_KEY || "rawreach:contact-submissions";
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function setBaseHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
}

function sendJson(res, statusCode, payload) {
  setBaseHeaders(res);
  res.statusCode = statusCode;
  if (statusCode === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = statusCode;
  res.end(text);
}

function isUpstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function localFilePath() {
  return path.join(PROJECT_ROOT, "data", "submissions.json");
}

async function readRawBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body;

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (raw && typeof raw === "object") return raw;
  if (!raw || !String(raw).trim()) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.statusCode = 400;
    error.message = "Invalid JSON payload.";
    throw error;
  }
}

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

async function upstash(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result;
}

async function saveLead(lead) {
  if (isUpstashConfigured()) {
    await upstash(["LPUSH", LEADS_KEY, JSON.stringify(lead)]);
    await upstash(["LTRIM", LEADS_KEY, 0, 4999]);
    return { storage: "upstash" };
  }

  if (process.env.VERCEL) {
    throw new Error("Persistent storage is not configured. Add Upstash Redis environment variables in Vercel.");
  }

  const filePath = localFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let leads = [];
  try {
    leads = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  leads.unshift(lead);
  await fs.writeFile(filePath, JSON.stringify(leads, null, 2));
  return { storage: "local-json" };
}

async function listLeads(limit = 200) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));

  if (isUpstashConfigured()) {
    const items = await upstash(["LRANGE", LEADS_KEY, 0, safeLimit - 1]);
    return items
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  const filePath = localFilePath();
  try {
    const leads = JSON.parse(await fs.readFile(filePath, "utf8"));
    return leads.slice(0, safeLimit);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function checkRateLimit(ip) {
  const max = Math.max(1, Number(process.env.RAWREACH_RATE_LIMIT_PER_MINUTE) || 8);
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rawreach:rate:${ip}:${bucket}`;

  if (isUpstashConfigured()) {
    try {
      const count = Number(await upstash(["INCR", key]));
      if (count === 1) {
        await upstash(["EXPIRE", key, 70]);
      }
      return { allowed: count <= max, remaining: Math.max(0, max - count) };
    } catch {
      return { allowed: true, remaining: max };
    }
  }

  globalThis.__rawreachRateMap = globalThis.__rawreachRateMap || new Map();
  const map = globalThis.__rawreachRateMap;
  const current = map.get(key) || 0;
  map.set(key, current + 1);

  for (const existingKey of map.keys()) {
    if (!existingKey.endsWith(`:${bucket}`)) map.delete(existingKey);
  }

  return { allowed: current + 1 <= max, remaining: Math.max(0, max - current - 1) };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function leadsToCsv(leads) {
  const fields = [
    "id",
    "createdAt",
    "name",
    "email",
    "company",
    "websiteUrl",
    "service",
    "budget",
    "message",
    "source",
    "ip"
  ];

  const rows = leads.map((lead) => fields.map((field) => csvEscape(lead[field])).join(","));
  return [fields.join(","), ...rows].join("\n");
}

module.exports = {
  checkRateLimit,
  getIp,
  leadsToCsv,
  listLeads,
  readJsonBody,
  saveLead,
  sendJson,
  sendText
};
