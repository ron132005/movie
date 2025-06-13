// 1. Get movie ID from URL
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get("id");
const trailerId = urlParams.get("trailerId");

// 2. Fetch data from YTS API with cast info
fetch(
  `https://yts.mx/api/v2/movie_details.json?movie_id=${movieId}&with_cast=true`
)
  .then((response) => response.json())
  .then((data) => {
    const movie = data.data.movie;

    // 3. Fill in HTML with movie data
    document.getElementById("movieTitle").textContent = movie.title;
    document.getElementById("movieYearGenre").textContent = `${
      movie.year
    } • ${movie.genres.join(", ")}`;
    document.getElementById("movieRating").textContent = `${movie.rating}/10`;

    // —— Preload poster off-DOM ——
    const posterEl = document.getElementById("moviePoster");
    const tempImg = new Image();
    tempImg.src = movie.large_cover_image; // starts fetching immediately
    tempImg.onload = () => {
      posterEl.src = tempImg.src;
    };
    tempImg.onerror = () => {
      posterEl.remove();
    };

    // Tags
    const tagsContainer = document.querySelector(".tags");
    tagsContainer.innerHTML = "";
    movie.genres.forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tagsContainer.appendChild(span);
    });

    // Torrent qualities
    const torrents = movie.torrents;
    const sortedTorrents = torrents.sort((a, b) => {
      const order = { "720p": 1, "1080p": 2, "2160p": 3, "3D": 4 };
      return (order[a.quality] || 99) - (order[b.quality] || 99);
    });

    const availableBox = document.querySelector(".available");
    const qualities = [...new Set(sortedTorrents.map((t) => t.quality))];
    availableBox.innerHTML = `Available in: <span>${qualities.join(
      ", "
    )}</span>`;

    const downloadContainer = document.querySelector(".downloadButtons");
    downloadContainer.innerHTML = "";
    const addedQualities = new Set();

    sortedTorrents.forEach((torrent) => {
      if (!addedQualities.has(torrent.quality)) {
        addedQualities.add(torrent.quality);
        const btn = document.createElement("button");
        btn.textContent = `Download ${torrent.quality}`;
        btn.onclick = () => {
          const serverDownloadUrl = `https://servers-fj5o.onrender.com/download?url=${encodeURIComponent(
            torrent.url
          )}&title=${encodeURIComponent(movie.title)}&year=${
            movie.year
          }&quality=${encodeURIComponent(torrent.quality)}`;
          window.location.href = serverDownloadUrl;
        };
        downloadContainer.appendChild(btn);
      }
    });

    document.getElementById("movieDescription").textContent =
      movie.description_full || "No description available.";

    const topCast = movie.cast
      ?.filter((person) => person.role !== "Director")
      .slice(0, 5);
    document.getElementById("movieCast").textContent =
      topCast && topCast.length
        ? topCast.map((actor) => actor.name).join(", ")
        : "Unknown";
  })
  .catch((err) => {
    console.error("Error fetching movie:", err);
  });

//Youtube Trailer
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
      "progress",
      "current-time",
      "mute",
      "volume",
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
  });
}

// Delay embedding trailer until full window load to prevent layout shifts
window.addEventListener("load", () => {
  if (trailerId !== " " && trailerId !== "undefined") {
    embedTrailer(trailerId);
  }
});
