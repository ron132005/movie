// server.js
// Node + Express server that uses yt-dlp to get metadata & formats, and proxies HLS/TS/MP4 to the browser.

const express = require("express");
const { spawnSync } = require("child_process");
const fetch = require("node-fetch");
const path = require("path");
const { URL } = require("url");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Helper: run yt-dlp -j to get JSON metadata for the page
function ytDlpInfo(pageUrl) {
  // -j prints JSON metadata
  const proc = spawnSync("yt-dlp", ["-j", pageUrl], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (proc.error) throw proc.error;
  if (!proc.stdout || proc.stdout.trim() === "") {
    throw new Error("yt-dlp returned no JSON: " + (proc.stderr || "no stderr"));
  }
  // parse JSON (yt-dlp prints a JSON object)
  const json = JSON.parse(proc.stdout);
  return json;
}

// API: get metadata + formats
app.get("/api/info", async (req, res) => {
  const pageUrl = req.query.url;
  if (!pageUrl) return res.status(400).json({ error: "missing ?url" });

  try {
    const info = ytDlpInfo(pageUrl);

    // Basic metadata fields to show
    const meta = {
      id: info.id,
      title: info.title || "",
      description: info.description || "",
      uploader: info.uploader || "",
      uploader_id: info.uploader_id || "",
      uploader_url: info.uploader_url || "",
      thumbnail: info.thumbnail || "",
      duration: info.duration || null,
      view_count: info.view_count || null,
      like_count: info.like_count || null,
      upload_date: info.upload_date || null,
      tags: info.tags || [],
    };

    // Process formats into cleaner list (unique by url)
    const formats = (info.formats || []).map((f) => ({
      format_id: f.format_id,
      ext: f.ext,
      protocol: f.protocol,
      url: f.url,
      width: f.width || null,
      height: f.height || null,
      fps: f.fps || null,
      format_note: f.format_note || "",
      abr: f.abr || null,
      vbr: f.vbr || null,
    }));

    // dedupe by url (some formats repeat)
    const seen = new Set();
    const deduped = [];
    for (const f of formats) {
      if (!f.url) continue;
      if (seen.has(f.url)) continue;
      seen.add(f.url);
      deduped.push(f);
    }

    // categorize into mp4s and HLS master/variant playlists
    const mp4s = deduped.filter(
      (f) =>
        (f.ext && f.ext.toLowerCase() === "mp4") ||
        (f.protocol && f.protocol.includes("http"))
    );
    const hls = deduped.filter(
      (f) =>
        (f.ext && f.ext.toLowerCase().includes("m3u8")) ||
        (f.protocol && f.protocol.includes("hls"))
    );

    // Return metadata + available stream options
    res.json({ meta, streams: { mp4s, hls }, raw: info });
  } catch (err) {
    console.error("api/info error:", err && err.message);
    return res
      .status(500)
      .json({ error: "failed", message: String(err && err.message) });
  }
});

// /playlist?u=<encoded master.m3u8>
// Fetch the playlist text, rewrite every URI line to point at /segment?u=<encoded>, and return playlist content
app.get("/playlist", async (req, res) => {
  const encoded = req.query.u;
  if (!encoded) return res.status(400).send("missing u");
  let master;
  try {
    master = decodeURIComponent(encoded);
    new URL(master);
  } catch (e) {
    return res.status(400).send("invalid url");
  }

  try {
    const upstream = await fetch(master, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.pornhub.com/",
      },
    });
    if (!upstream.ok)
      return res
        .status(502)
        .send("failed to fetch playlist: " + upstream.status);

    const text = await upstream.text();
    const base = new URL(master);
    const lines = text.split(/\r?\n/);
    const out = lines
      .map((line) => {
        if (!line || line.startsWith("#")) return line;
        // Resolve relative URIs to absolute, then route through /segment
        try {
          const resolved = new URL(line, base).toString();
          return "/segment?u=" + encodeURIComponent(resolved);
        } catch (e) {
          return line;
        }
      })
      .join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(out);
  } catch (err) {
    console.error("playlist error:", err);
    return res.status(500).send("playlist proxy failed");
  }
});

// /segment?u=<encoded segment or variant>
// Proxy a segment (.ts) or nested playlist request, stream immediately, forward important headers
app.get("/segment", async (req, res) => {
  const encoded = req.query.u;
  if (!encoded) return res.status(400).send("missing u");
  let seg;
  try {
    seg = decodeURIComponent(encoded);
    new URL(seg);
  } catch (e) {
    return res.status(400).send("invalid url");
  }

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.pornhub.com/",
    };
    if (req.headers.range) headers.Range = req.headers.range;
    if (req.headers.accept) headers.Accept = req.headers.accept;

    const upstream = await fetch(seg, { headers });
    if (!upstream.ok) {
      console.warn("segment upstream not ok:", seg, upstream.status);
      return res.status(502).send("segment fetch error " + upstream.status);
    }

    res.status(upstream.status); // forward 200 or 206

    const ctype = upstream.headers.get("content-type");
    if (ctype) res.setHeader("Content-Type", ctype);

    const clen = upstream.headers.get("content-length");
    if (clen) res.setHeader("Content-Length", clen);

    const cr = upstream.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);

    const ar = upstream.headers.get("accept-ranges");
    if (ar) res.setHeader("Accept-Ranges", ar);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Transfer-Encoding", "chunked");
    if (res.flushHeaders) res.flushHeaders();

    const body = upstream.body;
    if (!body) return res.status(500).send("no body");
    body.pipe(res);
  } catch (err) {
    console.error("segment proxy error:", err);
    res.status(500).send("segment proxy failed");
  }
});

// Optional: return list of absolute URIs from a playlist (useful for downloading segments)
app.get("/segments_list", async (req, res) => {
  const encoded = req.query.u;
  if (!encoded) return res.status(400).send("missing u");
  let master;
  try {
    master = decodeURIComponent(encoded);
    new URL(master);
  } catch (e) {
    return res.status(400).send("invalid url");
  }

  try {
    const upstream = await fetch(master, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.pornhub.com/",
      },
    });
    if (!upstream.ok) return res.status(502).send("failed to fetch playlist");

    const text = await upstream.text();
    const base = new URL(master);
    const lines = text.split(/\r?\n/);
    const uris = lines
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => new URL(l, base).toString());
    res.json({ segments: uris });
  } catch (err) {
    console.error("segments_list error:", err);
    res.status(500).send("error");
  }
});

// --- NEW/UPDATED: /api/related?url=<pageUrl> ---
app.get("/api/related", async (req, res) => {
  const pageUrl = req.query.url;
  if (!pageUrl) return res.status(400).json({ error: "missing ?url" });

  try {
    const r = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.pornhub.com/",
      },
    });
    if (!r.ok)
      return res
        .status(502)
        .json({ error: "failed to fetch page", status: r.status });
    const html = await r.text();

    const $ = cheerio.load(html);
    const itemsMap = new Map();

    // Primary selector: anchors linking to view_video.php?viewkey=
    $('a[href*="view_video.php?viewkey="]').each((i, el) => {
      try {
        const href = $(el).attr("href");
        if (!href) return;
        const full = new URL(href, pageUrl).toString();
        if (itemsMap.has(full)) return;

        // Try to get a title and thumbnail
        let title =
          $(el).attr("title") ||
          $(el).find("img").attr("alt") ||
          $(el).text().trim();
        title = title ? title.replace(/\s+/g, " ").trim() : null;

        // Avoid placeholders like "Play All"
        if (!title || /play all/i.test(title)) return;

        // thumbnail candidates
        let thumb =
          $(el).find("img").attr("data-src") ||
          $(el).find("img").attr("data-thumb") ||
          $(el).find("img").attr("src") ||
          null;
        if (thumb && thumb.startsWith("//")) thumb = "https:" + thumb;
        if (thumb && thumb.startsWith("/"))
          thumb = new URL(thumb, pageUrl).toString();

        // Filter invalid thumbnails (data URIs, empty, or obvious placeholders)
        if (
          !thumb ||
          /^data:/.test(thumb) ||
          /blank|placeholder|noimage/i.test(thumb)
        ) {
          // try other nearby images (thumbnail inside parent)
          const parentImg =
            $(el)
              .closest(".videoPreview, .phvideo, .videoBox")
              .find("img")
              .first()
              .attr("src") ||
            $(el).closest(".item").find("img").first().attr("src");
          if (parentImg) {
            let p = parentImg;
            if (p.startsWith("//")) p = "https:" + p;
            if (p.startsWith("/")) p = new URL(p, pageUrl).toString();
            if (p && !/^data:/.test(p) && !/blank|placeholder|noimage/i.test(p))
              thumb = p;
          }
        }

        // If still no good thumbnail, skip (avoids "Play All" empty cards)
        if (!thumb) return;

        itemsMap.set(full, { url: full, title: title, thumbnail: thumb });
      } catch (e) {
        // ignore
      }
    });

    // Fallback selector if nothing found
    if (itemsMap.size === 0) {
      $(".videoPreview, .phvideo, .videoBox, .js-pop").each((i, el) => {
        const a = $(el).find('a[href*="view_video.php?viewkey="]').first();
        if (!a) return;
        const href = a.attr("href");
        if (!href) return;
        try {
          const full = new URL(href, pageUrl).toString();
          if (itemsMap.has(full)) return;
          let title =
            a.attr("title") ||
            a.find("img").attr("alt") ||
            $(el).find(".title").text().trim() ||
            null;
          title = title ? title.replace(/\s+/g, " ").trim() : null;
          if (!title || /play all/i.test(title)) return;
          let thumb =
            a.find("img").attr("data-src") || a.find("img").attr("src") || null;
          if (thumb && thumb.startsWith("//")) thumb = "https:" + thumb;
          if (thumb && thumb.startsWith("/"))
            thumb = new URL(thumb, pageUrl).toString();
          if (!thumb) return;
          itemsMap.set(full, { url: full, title, thumbnail: thumb });
        } catch (e) {}
      });
    }

    // Limit results and return
    const items = Array.from(itemsMap.values()).slice(0, 12);
    res.json({ related: items });
  } catch (err) {
    console.error("api/related error:", err && err.message);
    res
      .status(500)
      .json({ error: "failed", message: String(err && err.message) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
