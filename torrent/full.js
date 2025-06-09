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
      // only once fully loaded, swap it in
      posterEl.src = tempImg.src;
    };
    tempImg.onerror = () => {
      // fallback or remove if broken
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

    // Update quality availability text
    const availableBox = document.querySelector(".available");
    const qualities = [...new Set(sortedTorrents.map((t) => t.quality))];
    availableBox.innerHTML = `Available in: <span>${qualities.join(
      ", "
    )}</span>`;

    // Create buttons for each unique quality
    const downloadContainer = document.querySelector(".downloadButtons");
    downloadContainer.innerHTML = "";
    const addedQualities = new Set();

    sortedTorrents.forEach((torrent) => {
      if (!addedQualities.has(torrent.quality)) {
        addedQualities.add(torrent.quality);

        const btn = document.createElement("button");
        btn.textContent = `Download ${torrent.quality}`;
        btn.onclick = () => {
          const serverDownloadUrl = `https://servers-0eqt.onrender.com/download?url=${encodeURIComponent(
            torrent.url
          )}&title=${encodeURIComponent(movie.title)}&year=${
            movie.year
          }&quality=${encodeURIComponent(torrent.quality)}`;

          window.location.href = serverDownloadUrl;
        };
        downloadContainer.appendChild(btn);
      }
    });

    // Plot summary
    document.getElementById("movieDescription").textContent =
      movie.description_full || "No description available.";

    // Top cast (up to 5 actors)
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
  if (!trailerId || typeof trailerId !== "string") {
    console.warn("Invalid or missing trailer ID.");
    if (container) container.style.display = "none"; // Hide container
    return;
  }

  if (!container) {
    console.error('Container element with ID "trailerContainer" not found.');
    return;
  }

  container.style.display = "block"; // Show container

  // Clear existing content
  container.innerHTML = "";

  // Embed the trailer
  container.innerHTML = `
    <iframe
      width="100%"
      height="100%"
      src="https://www.youtube.com/embed/${trailerId}"
      frameborder="0"
      allowfullscreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      style="aspect-ratio: 16 / 9; border-radius: 8px;"
    ></iframe>
  `;
}
if (trailerId !== " " && trailerId !== "undefined") {
  embedTrailer(trailerId);
}
