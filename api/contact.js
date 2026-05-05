const crypto = require("crypto");
const {
  checkRateLimit,
  getIp,
  readJsonBody,
  saveLead,
  sendJson
} = require("./_lib/storage");

function clean(value, maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 204, {});
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 405, { ok: false, message: "Method not allowed." });
  }

  try {
    const allowedOrigin = process.env.RAWREACH_ALLOWED_ORIGIN;
    const origin = req.headers.origin;
    if (allowedOrigin && origin && !allowedOrigin.split(",").map((item) => item.trim()).includes(origin)) {
      return sendJson(res, 403, { ok: false, message: "Origin is not allowed." });
    }

    const body = await readJsonBody(req);

    if (clean(body.website, 120)) {
      return sendJson(res, 200, { ok: true, message: "Thanks. Your inquiry has been received." });
    }

    const lead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: clean(body.name, 120),
      email: clean(body.email, 180).toLowerCase(),
      company: clean(body.company, 160),
      websiteUrl: clean(body.websiteUrl, 220),
      service: clean(body.service, 120),
      budget: clean(body.budget, 80),
      message: clean(body.message, 1500),
      source: clean(req.headers.referer || "Raw Reach website", 300),
      ip: getIp(req),
      userAgent: clean(req.headers["user-agent"], 300)
    };

    const errors = [];
    if (!lead.name) errors.push("Name is required.");
    if (!validEmail(lead.email)) errors.push("A valid email is required.");
    if (!lead.company) errors.push("Company is required.");
    if (!lead.service) errors.push("Service interest is required.");
    if (!lead.message || lead.message.length < 12) errors.push("Please add a little more detail.");
    if (!validUrl(lead.websiteUrl)) errors.push("Website must start with http:// or https://.");

    if (errors.length) {
      return sendJson(res, 400, { ok: false, message: errors[0], errors });
    }

    const rateLimit = await checkRateLimit(lead.ip);
    if (!rateLimit.allowed) {
      return sendJson(res, 429, {
        ok: false,
        message: "Too many submissions. Please try again in a minute."
      });
    }

    const result = await saveLead(lead);
    return sendJson(res, 201, {
      ok: true,
      id: lead.id,
      storage: result.storage,
      message: "Thanks. Your inquiry has been received."
    });
  } catch (error) {
    const status = error.statusCode || (error.message.includes("Persistent storage") ? 503 : 500);
    return sendJson(res, status, {
      ok: false,
      message: status === 503 ? error.message : "Could not save the inquiry right now."
    });
  }
};
