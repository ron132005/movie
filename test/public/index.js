// small helper to format seconds to mm:ss or hh:mm:ss
function fmtDuration(s) {
  if (!s && s !== 0) return "";
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    (h > 0 ? h + ":" : "") +
    String(m).padStart(h > 0 ? 2 : 1, "0") +
    ":" +
    String(sec).padStart(2, "0")
  );
}

let infoData = null;
let hls = null;

document.getElementById("loadBtn").addEventListener("click", async () => {
  const pageUrl = document.getElementById("pageUrl").value.trim();
  if (!pageUrl) return alert("Paste a Pornhub page URL");

  resetUI();
  document.getElementById("titleText").textContent = "Resolving...";

  try {
    const r = await fetch("/api/info?url=" + encodeURIComponent(pageUrl));
    const js = await r.json();
    if (js.error) {
      document.getElementById("titleText").textContent =
        "Failed: " + (js.message || js.error);
      return;
    }
    infoData = js;
    populateInfo(js);
    // load related suggestions
    loadRelated(pageUrl);
  } catch (err) {
    console.error(err);
    document.getElementById("titleText").textContent = "Error resolving";
  }
});

function resetUI() {
  // destroy hls instance if exists
  if (hls) {
    hls.destroy();
    hls = null;
  }
  const player = document.getElementById("player");
  player.pause();
  player.removeAttribute("src");
  player.load();
  document.getElementById("tags").innerHTML = "";
  document.getElementById("desc").textContent = "";
  document.getElementById("thumb").src = "";
  document.getElementById("rightTitle").textContent = "";
  document.getElementById("rightUploader").textContent = "";
  document.getElementById("rightStats").textContent = "";
  document.getElementById("relatedSection").style.display = "none";
  document.getElementById("relatedGrid").innerHTML = "";
  document.getElementById("uploaderBlock").style.display = "none";
}

function populateInfo(js) {
  const meta = js.meta || {};
  const mp4s = js.streams.mp4s || [];
  const hls = js.streams.hls || [];

  document.getElementById("titleText").textContent = meta.title || "Untitled";
  document.getElementById("desc").textContent = meta.description || "";
  document.getElementById("thumb").src = meta.thumbnail || "";
  document.getElementById("rightTitle").textContent = meta.title || "";
  document.getElementById("rightUploader").textContent = meta.uploader || "";
  document.getElementById("rightStats").textContent =
    (meta.view_count ? meta.view_count.toLocaleString() + " views" : "") +
    (meta.duration ? " • " + fmtDuration(meta.duration) : "");

  if (meta.uploader) {
    document.getElementById("uploaderBlock").style.display = "flex";
    document.getElementById("uploaderName").textContent = meta.uploader;
    document.getElementById("uploaderExtra").textContent = meta.uploader_id
      ? meta.uploader_id
      : "";
    document.getElementById("uploaderAvatar").src = meta.thumbnail || "";
  }

  // tags
  const tagsBox = document.getElementById("tags");
  (meta.tags || []).forEach((t) => {
    const el = document.createElement("div");
    el.className = "tag";
    el.textContent = t;
    tagsBox.appendChild(el);
  });

  // build stream options
  const options = [];

  mp4s.forEach((f) => {
    options.push({ height: f.height || 0, url: f.url, type: "mp4" });
  });
  hls.forEach((f) => {
    let u = f.url;
    if (u.includes("index-v1-a1.m3u8"))
      u = u.replace("index-v1-a1.m3u8", "index.m3u8");
    options.push({ height: f.height || 0, url: u, type: "hls" });
  });

  if (options.length === 0 && js.raw && js.raw.formats) {
    js.raw.formats.forEach((f) => {
      if (!f.url) return;
      let type = f.ext && f.ext.includes("m3u8") ? "hls" : "mp4";
      let u = f.url;
      if (u.includes("index-v1-a1.m3u8"))
        u = u.replace("index-v1-a1.m3u8", "index.m3u8");
      options.push({ height: f.height || 0, url: u, type });
    });
  }

  // --- AUTO PICK LOGIC ---
  let selected = null;

  // find exact 720p
  selected = options.find((o) => o.height === 720);

  if (!selected) {
    // find highest below 720
    const below = options.filter((o) => o.height && o.height < 720);
    if (below.length > 0) {
      below.sort((a, b) => b.height - a.height);
      selected = below[0];
    }
  }

  if (!selected && options.length > 0) {
    // fallback highest overall
    options.sort((a, b) => b.height - a.height);
    selected = options[0];
  }

  if (!selected) {
    document.getElementById("titleText").textContent = "No streams found";
    return;
  }

  // immediately play without user interaction
  playStream(selected.url, selected.type);
}

function playStream(url, type) {
  const player = document.getElementById("player");

  if (window._hlsInstance) {
    window._hlsInstance.destroy();
    window._hlsInstance = null;
  }

  if (type === "hls" || url.includes(".m3u8")) {
    const prox = "/playlist?u=" + encodeURIComponent(url);
    if (Hls.isSupported()) {
      const hlsLib = new Hls();
      window._hlsInstance = hlsLib;
      hlsLib.loadSource(prox);
      hlsLib.attachMedia(player);
      hlsLib.on(Hls.Events.MANIFEST_PARSED, () => {
        player.play().catch(() => {});
      });
      hlsLib.on(Hls.Events.ERROR, (event, data) => {
        console.error("hls error", data);
        document.getElementById("titleText").textContent =
          "Playback error: " + (data && data.type);
      });
    } else if (player.canPlayType("application/vnd.apple.mpegurl")) {
      player.src = prox;
      player.play().catch(() => {});
    } else {
      alert("HLS not supported in this browser");
    }
  } else {
    player.src = "/segment?u=" + encodeURIComponent(url);
    player.play().catch(() => {});
  }
}

// --- RELATED loading (unchanged) ---
async function loadRelated(pageUrl) {
  try {
    const r = await fetch("/api/related?url=" + encodeURIComponent(pageUrl));
    const js = await r.json();
    if (js.error || !js.related) {
      console.log("no related", js);
      return;
    }
    const related = js.related;
    if (!related || related.length === 0) return;

    const grid = document.getElementById("relatedGrid");
    grid.innerHTML = "";
    related.forEach((item) => {
      const card = document.createElement("div");
      card.className = "related-card";
      card.title = item.title || "";

      card.innerHTML = `
          <img src="${item.thumbnail || ""}" alt="">
          <div style="flex:1"><div class="r-title">${
            item.title || "Untitled"
          }</div></div>
        `;
      card.addEventListener("click", () => {
        document.getElementById("pageUrl").value = item.url;
        document.getElementById("loadBtn").click();
      });
      grid.appendChild(card);
    });

    document.getElementById("relatedSection").style.display = "block";
  } catch (err) {
    console.error("loadRelated error", err);
  }
}
