const { leadsToCsv, listLeads, sendJson, sendText } = require("./_lib/storage");

function getToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return req.headers["x-admin-token"] || "";
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, OPTIONS");
    return sendJson(res, 204, {});
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return sendJson(res, 405, { ok: false, message: "Method not allowed." });
  }

  try {
    if (!process.env.RAWREACH_ADMIN_TOKEN) {
      return sendJson(res, 503, {
        ok: false,
        message: "RAWREACH_ADMIN_TOKEN is not configured."
      });
    }

    if (getToken(req) !== process.env.RAWREACH_ADMIN_TOKEN) {
      return sendJson(res, 401, { ok: false, message: "Unauthorized." });
    }

    const requestUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const limit = requestUrl.searchParams.get("limit") || 200;
    const format = requestUrl.searchParams.get("format");
    const leads = await listLeads(limit);

    if (format === "csv") {
      return sendText(res, 200, leadsToCsv(leads), "text/csv; charset=utf-8");
    }

    return sendJson(res, 200, {
      ok: true,
      count: leads.length,
      submissions: leads
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "Could not fetch submissions."
    });
  }
};
