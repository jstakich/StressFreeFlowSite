const { Octokit } = require("@octokit/rest");

const REPO = "StressFreeFlowSite";
const OWNER = "jstakich";
const FILE_PATH = "data/likes.json";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function cleanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

function normalizeSupporters(data) {
  const supporters = Array.isArray(data && data.supporters) ? data.supporters : [];
  return supporters
    .map(function (entry) {
      return { name: cleanName(entry && entry.name ? entry.name : "") };
    })
    .filter(function (entry) {
      return entry.name;
    });
}

function dedupeSupporters(supporters) {
  const seen = new Set();
  const result = [];

  supporters.forEach(function (entry) {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push({ name: entry.name });
  });

  return result;
}

async function readSupporters(octokit) {
  const response = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path: FILE_PATH,
  });

  const content = Buffer.from(response.data.content, response.data.encoding).toString("utf8");
  return {
    supporters: dedupeSupporters(normalizeSupporters(JSON.parse(content))),
    sha: response.data.sha,
  };
}

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(function ([key, value]) {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(503).json({ error: "Supporter API is not configured yet." });
  }

  const octokit = new Octokit({ auth: token });

  try {
    if (req.method === "GET") {
      const current = await readSupporters(octokit);
      return res.status(200).json({ supporters: current.supporters });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const secret = body.secret || "";
    const name = cleanName(body.name);

    if (secret !== process.env.SUPPORTER_SUBMIT_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const current = await readSupporters(octokit);
    const exists = current.supporters.some(function (entry) {
      return entry.name.toLowerCase() === name.toLowerCase();
    });

    if (!exists) {
      current.supporters.push({ name: name });
    }

    const payload = {
      supporters: current.supporters,
    };

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: FILE_PATH,
      message: exists ? "Update supporters list" : "Add supporter " + name,
      content: Buffer.from(JSON.stringify(payload, null, 2) + "\n").toString("base64"),
      sha: current.sha,
    });

    return res.status(200).json({ supporters: current.supporters, added: !exists });
  } catch (error) {
    return res.status(500).json({ error: "Could not save supporter" });
  }
};
