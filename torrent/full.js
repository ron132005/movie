// client-only version of your movie page script
// - tries to fetch the torrent URL as a blob and save with a custom filename
// - if CORS / opaque response prevents that, opens the original URL in a new tab as a fallback
// - NOTE: fetching large files may consume significant memory (see explanation below)

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get("id");
const trailerId = urlParams.get("trailerId");

// helper: derive extension from URL path (fallback to .torrent)
function getExtFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const idx = pathname.lastIndexOf(".");
    if (idx !== -1 && idx < pathname.length - 1) return pathname.slice(idx);
  } catch (e) {
    // ignore
  }
  return ".torrent";
}

// helper: attempt to download remote file via fetch -> blob -> anchor[download]
// returns true if succeeded, false if fallback required
async function downloadAndRename(url, filename) {
  try {
    // Try fetch the resource. This requires the remote server to allow CORS for your origin.
    // If it's blocked, the response may be "opaque" and we can't read the bytes.
    const res = await fetch(url, { method: "GET", mode: "cors" });

    // If the response is opaque (no CORS access), we cannot access the body or set our own filename.
    // In that case return false so caller can fallback to opening the URL directly.
    if (res.type === "opaque") {
      console.warn("Opaque response — CORS prevented reading the file body.");
      return false;
    }

    if (!res.ok) {
      console.error("Fetch failed:", res.status, res.statusText);
      return false;
    }

    // Convert to Blob and create object URL
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary anchor and trigger download with desired filename
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = filename; // this sets the filename the browser will suggest
    document.body.appendChild(a);
    a.click();

    // cleanup
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 1500);

    return true;
  } catch (err) {
    console.error("Error while attempting client-side download:", err);
    return false;
  }
}

// Fetch movie data from YTS and build UI (you had this already; mostly unchanged)
fetch(`https://yts.mx/api/v2/movie_details.json?movie_id=${movieId}&with_cast=true`)
  .then((response) => response.json())
  .then((data) => {
    const movie = data.data.movie;

    document.getElementById("movieTitle").textContent = movie.title;
    document.getElementById("movieYearGenre").textContent = `${movie.year} • ${movie.genres.join(", ")}`;
    document.getElementById("movieRating").textContent = `${movie.rating}/10`;

    // preload poster off-DOM
    const posterEl = document.getElementById("moviePoster");
    const tempImg = new Image();
    tempImg.src = movie.large_cover_image;
    tempImg.onload = () => {
      posterEl.src = tempImg.src;
    };
    tempImg.onerror = () => {
      posterEl.remove();
    };

    // tags
    const tagsContainer = document.querySelector(".tags");
    tagsContainer.innerHTML = "";
    movie.genres.forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tagsContainer.appendChild(span);
    });

    // torrent qualities
    const torrents = movie.torrents || [];
    const sortedTorrents = torrents.sort((a, b) => {
      const order = { "720p": 1, "1080p": 2, "2160p": 3, "3D": 4 };
      return (order[a.quality] || 99) - (order[b.quality] || 99);
    });

    const availableBox = document.querySelector(".available");
    const qualities = [...new Set(sortedTorrents.map((t) => t.quality))];
    availableBox.innerHTML = `Available in: <span>${qualities.join(", ")}</span>`;

    const downloadContainer = document.querySelector(".downloadButtons");
    downloadContainer.innerHTML = "";
    const addedQualities = new Set();

    sortedTorrents.forEach((torrent) => {
      if (!addedQualities.has(torrent.quality)) {
        addedQualities.add(torrent.quality);
        const btn = document.createElement("button");
        btn.textContent = `Download ${torrent.quality}`;

        // NEW client-side download handler
        btn.onclick = async (evt) => {
          evt.preventDefault();

          // Build desired filename: "Title (YEAR) [QUALITY] [getRONed].ext"
          const ext = getExtFromUrl(torrent.url);
          const safeTitle = (movie.title || "Unknown Title").trim();
          const safeYear = (movie.year || "unknown-year").toString().trim();
          const safeQuality = (torrent.quality || "unknown-quality").trim();
          const desiredFilename = `${safeTitle} (${safeYear}) [${safeQuality}] [getRONed]${ext}`;

          // Try client-side fetch + rename
          const ok = await downloadAndRename(torrent.url, desiredFilename);
          if (!ok) {
            // Fallback: open in new tab (user can still download, but browser/server will decide filename)
            // Explain to the user why we fallback
            // (You can replace alert() with nicer UI in production.)
            alert(
              "Could not download/rename directly due to cross-origin restrictions on the remote host. " +
                "A new tab will open so you can download the file (browser/server will determine the filename)."
            );
            window.open(torrent.url, "_blank", "noopener");
          }
        };

        downloadContainer.appendChild(btn);
      }
    });

    document.getElementById("movieDescription").textContent = movie.description_full || "No description available.";

    const topCast = movie.cast?.filter((person) => person.role !== "Director").slice(0, 5);
    document.getElementById("movieCast").textContent = topCast && topCast.length
      ? topCast.map((actor) => actor.name).join(", ")
      : "Unknown";
  })
  .catch((err) => {
    console.error("Error fetching movie:", err);
  });

// Youtube trailer embed (unchanged except small safety check)
function embedTrailer(trailerId) {
  const container = document.getElementById("trailerContainer");
  if (!container) {
    console.error("No #trailerContainer");
    return;
  }
  if (!trailerId || typeof trailerId !== "string") {
    console.warn("Invalid trailer ID");
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div
      id="player"
      class="plyr__video-embed"
      data-plyr-provider="youtube"
      data-plyr-embed-id="${trailerId}"
      data-plyr-embed-params="autoplay=0&cc_load_policy=1&cc_lang_pref=en"
    ></div>
  `;

  new Plyr("#player", {
  autoplay: false,
  muted: false,
  controls: [
    "play",
    "current-time",
    "progress",
    "captions",
    "settings",
    "fullscreen",
  ],
  settings: ["captions", "quality", "speed"],
  captions: {
    active: false,
    language: "en",
    update: true,
  },
  volume: 1, // sets volume to 100%
});
}

window.addEventListener("load", () => {
  if (trailerId !== " " && trailerId !== "undefined") {
    embedTrailer(trailerId);
  }
});
