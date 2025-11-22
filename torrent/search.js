// Grab elements
const input = document.getElementById("searchBox");
const TMDB_API_KEY = "a5f1a167ac6db6e31a8fb9934919703c"; // example
const resultsContainer = document.getElementById("resultsContainer");

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const arrayParam = urlParams.get("array");
const prevQuery = urlParams.get("query");
const moviesArray = arrayParam
  ? JSON.parse(decodeURIComponent(arrayParam))
  : [];

// If there's a previous query, populate the search box
if (prevQuery) {
  input.value = prevQuery;
}

// Display "No results" message
function showNoResults(query) {
  const msg = document.createElement("p");
  msg.classList.add("no-results");
  msg.textContent = query
    ? `No results found for "${query}".`
    : "No results found.";
  resultsContainer.appendChild(msg);
}

// Display movie cards
async function displayMovieResults(results) {
  const currentYear = new Date().getFullYear();

  // If empty, show no results and return
  if (!results || results.length === 0) {
    showNoResults(input.value.trim() || prevQuery);
    return;
  }

  // Sort descending by year
  results.sort((a, b) => parseInt(b.year) - parseInt(a.year));

  // 1) Kick off all the downloads immediately (off-DOM)
  const cache = results.map((movie) => {
    const img = new Image();
    img.src = movie.image; // starts fetching
    return img;
  });

  // 2) Build & append your cards right away — browsers will paint cached images instantly
  results.forEach((movie, i) => {
    const year = String(movie.year).trim();
    if (
      !movie.id ||
      !movie.name ||
      year === "Unknown" ||
      parseInt(year) > currentYear
    ) {
      return;
    }

    const card = document.createElement("div");
    card.classList.add("movie-card");

    // Reuse the <img> you busted out above
    const img = cache[i];
    img.alt = movie.name;
    img.classList.add("movie-poster");
    img.onerror = () => card.remove();

    const info = document.createElement("div");
    info.classList.add("movie-info");
    info.innerHTML = `<h3>${movie.name}</h3><p>${year}</p>`;

    card.append(img, info);
    card.addEventListener("click", () => {
      window.location.href = `full.html?id=${movie.id}&trailerId=${movie.ytId}`;
    });
    resultsContainer.appendChild(card);
  });
}

// Initial render
displayMovieResults(moviesArray);

// Handle Enter key to search again
input.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  const searchTerm = input.value.trim();
  if (!searchTerm) return;

  // Trigger loading bar
  const loadingBar = document.getElementById("loadingBar");
  if (loadingBar) {
    loadingBar.style.width = "50%"; // Start loading animation
  }

  // Fetch new results
  const fetched = await fetchMovies(searchTerm);
  const encoded = encodeURIComponent(JSON.stringify(fetched));
  const qParam = encodeURIComponent(searchTerm);

  // Optional: expand to 80% just before redirect for smoother effect
  if (loadingBar) {
    loadingBar.style.width = "80%";
  }

  // Delay a bit to show the animation before redirect
  setTimeout(() => {
    window.location.href = `search.html?array=${encoded}&query=${qParam}`;
  }, 300);
});

// Fetch movies from YTS
// Change from  .mx to  .lt
async function fetchMovies(query) {
  const resp = await fetch(
    `https://yts.lt/api/v2/list_movies.json?query_term=${encodeURIComponent(
      query
    )}`
  );
  const data = await resp.json();
  return (
    data.data.movies?.map((item) => ({
      id: item.id,
      name: item.title,
      image: item.medium_cover_image,
      year: item.year,
      ytId: item.yt_trailer_code,
    })) || []
  );
}
