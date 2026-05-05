const { sendJson } = require("./_lib/storage");

module.exports = async function handler(req, res) {
  return sendJson(res, 200, {
    ok: true,
    service: "rawreach-website",
    storage: process.env.UPSTASH_REDIS_REST_URL ? "upstash" : "local-json"
  });
};
