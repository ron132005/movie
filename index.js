// ASSIGNATION
const searchBox = document.getElementById("search-container");
const input = document.getElementById("searchBox");
const dropdown = document.getElementById("dropdown");
const resultsContainer = document.getElementById("resultsContainer");
const seasonContainer = document.getElementById("seasonContainer");
const episodeContainer = document.getElementById("episodeContainer");
const seasonDropdown = document.getElementById("seasonDropdown");
const episodeDropdown = document.getElementById("episodeDropdown");
const videoContainer = document.getElementById("videoContainer");
const videoPlayer = document.getElementById("videoPlayer");
const sentence = document.getElementById("sentence");
const announcement = document.getElementById("ann");


// VARIABLES
const TMDB_API_KEY = "a5f1a167ac8db6e31a8fb9934919703c";
let selectedShowId;
let selectedTmdbId;

async function extractAndAddToClassList() {
  const proxyUrl = "https://api.allorigins.win/get?url=";
  const targetUrl = "https://announcementsgetroned.netlify.app/";

  try {
    const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));

    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.contents) {
      throw new Error("No content returned from proxy.");
    }

    // Extract content between [ann] ... [ann]
    const match = data.contents.match(/\[ann\]([\s\S]*?)\[ann\]/);

    if (!match || !match[1]) {
      throw new Error("No announcement block found.");
    }

    const textBlock = match[1];

    // Split by "|" and clean each line
    const lines = textBlock
      .split("|")
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error("Announcement block found, but contains no valid text.");
    }

    // Clear previous announcements to avoid duplicates
    sentence.innerHTML = "";

    // Add each announcement as a paragraph
    lines.forEach(line => {
      const p = document.createElement("p");
      p.textContent = line;
      sentence.appendChild(p);
    });

    announcement.style.display = "block";
    console.log("Announcements successfully loaded.");

  } catch (err) {
    console.error("Announcement Error:", err.message);

    // Optional: display fallback message
    sentence.innerHTML = "<p>No announcements found.</p>";
    announcement.style.display = "block";
  }
}

//Function to show search box
function showSearchBox() {
  const selectedCat = document.getElementById("selection").value;
  if (selectedCat != 0) {
    searchBox.style.display = "block";
    dropdown.style.display = "none";
    dropdown.style.display = "none";
    seasonContainer.style.display = "none";
    episodeContainer.style.display = "none";
    videoContainer.style.display = "none";
  } else {
    searchBox.style.display = "none";
    dropdown.style.display = "none";
    dropdown.style.display = "none";
    seasonContainer.style.display = "none";
    episodeContainer.style.display = "none";
    videoContainer.style.display = "none";
    searchBox.style.display = "none";
  }
}

// Function to fetch movies from TVmaze API
async function fetchMovies(query) {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`
  );
  const data = await response.json();
  // Get the current year
  const currentYear = new Date().getFullYear();
  // Filter out movies released before 1995 or after the current year
  const filteredResults = data.results.filter((item) => {
    const releaseYear = new Date(item.release_date).getFullYear();
    return releaseYear >= 1995 && releaseYear <= currentYear;
  });
  // Map over the filtered results to include required fields
  const results = await Promise.all(
    filteredResults.map(async (item) => {
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${item.id}?api_key=${TMDB_API_KEY}`
      );
      const details = await detailsResponse.json();
      return {
        imdbId: details.imdb_id,
        name: item.title,
        image: `http://image.tmdb.org/t/p/w500${item.poster_path}`,
      };
    })
  );
  return results;
}

// Display drop down results for movies, but skip those whose image fails to load
async function displayMovieDropdownResults(results) {
  // Try loading each poster image; keep only movies whose image onload fires
  const loadChecks = results.map((movie) => {
    return new Promise((resolve) => {
      const imgTest = new Image();
      imgTest.onload = () => resolve(movie);
      imgTest.onerror = () => resolve(null);
      imgTest.src = movie.image;
    });
  });

  const loadable = (await Promise.all(loadChecks)).filter(Boolean);
  dropdown.innerHTML = ""; // Clear previous results

  if (loadable.length === 0) {
    dropdown.style.display = "none";
    return;
  }

  loadable.forEach((movie) => {
    const item = document.createElement("div");
    item.classList.add("dropdown-item");

    const img = document.createElement("img");
    img.src = movie.image;
    img.alt = movie.name;

    const text = document.createElement("span");
    text.textContent = movie.name;

    item.appendChild(img);
    item.appendChild(text);
    dropdown.appendChild(item);

    item.addEventListener("click", () => {
      displayMovieFullResults([movie]);
      dropdown.style.display = "none";
    });
  });

  dropdown.style.display = "block";
}

//Function to display full movie results
function displayMovieFullResults(results) {
  resultsContainer.innerHTML = ""; // Clear previous results

  results.forEach((movie) => {
    const card = document.createElement("div");
    card.classList.add("show-card");

    const img = document.createElement("img");
    img.src = movie.image;
    img.alt = movie.name;
    const text = document.createElement("div");
    text.classList.add("show-title");
    text.textContent = movie.name;

    card.appendChild(img);
    card.appendChild(text);

    resultsContainer.appendChild(card);
    selectedMovieId = movie.imdbId;

    const embedUrl = `https://vidlink.pro/movie/${selectedMovieId}`;
    //const embedUrl = `https://vidsrc.cc/v2/embed/movie/${selectedMovieId}?autoPlay=false`;

    // Display the embed link in the iframe
    videoPlayer.src = embedUrl;
    dropdown.style.display = "none";
    seasonContainer.style.display = "none";
    episodeContainer.style.display = "none";
    videoContainer.style.display = "block"; // Show the video container
  });
}

// Function to fetch shows from TVmaze API
async function fetchShows(query) {
  const response = await fetch(
    `https://api.tvmaze.com/search/shows?q=${query}`
  );
  const data = await response.json();
  return data.map((item) => ({
    id: item.show.id,
    name: item.show.name,
    image: item.show.image
      ? item.show.image.medium
      : "https://via.placeholder.com/210x315?text=No+Image", // Fallback image
    imdbId: item.show.externals.imdb, // Store IMDB ID
    genre: item.show.genres.join(", "),
    description: item.show.summary
      ? item.show.summary.replace(/(<([^>]+)>)/gi, "")
      : "No description available.",
  }));
}

// Function to fetch seasons from TVmaze API
async function fetchSeasons(showId) {
  const response = await fetch(
    `https://api.tvmaze.com/shows/${showId}/seasons`
  );
  return response.json();
}

// Function to fetch episodes from TVmaze API
async function fetchEpisodes(seasonId) {
  const response = await fetch(
    `https://api.tvmaze.com/seasons/${seasonId}/episodes`
  );
  return response.json();
}

// Function to convert IMDb ID to TMDB ID
async function imdbToTmdb(imdbId) {
  const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;

  const response = await fetch(url);
  const data = await response.json();

  if (data?.tv_results?.length > 0) {
    selectedTmdbId = data.tv_results[0].id;
  }
}

// Function to display search results in the dropdown
function displayDropdownResults(results) {
  dropdown.innerHTML = ""; // Clear previous results
  if (results.length === 0) {
    dropdown.style.display = "none";
    return;
  }

  results.forEach((show) => {
    const item = document.createElement("div");
    item.classList.add("dropdown-item");

    const img = document.createElement("img");
    img.src = show.image;
    img.alt = show.name;
    const text = document.createElement("span");
    text.textContent = show.name;

    item.appendChild(img);
    item.appendChild(text);
    dropdown.appendChild(item);

    // On click, display detailed info in resultsContainer and fetch seasons
    item.addEventListener("click", async () => {
      displayFullResults([show]); // Display the selected show
      await loadSeasons(show.id); // Load seasons for the selected show

      // Store selected show's IMDb ID
      selectedShowId = show.imdbId;

      // Convert IMDb ID to TMDB ID
      await imdbToTmdb(selectedShowId);

      // Close the dropdown after selecting a show
      dropdown.style.display = "none"; // Hide dropdown
    });
  });

  dropdown.style.display = "block"; // Show the dropdown
}

// Function to load seasons into the dropdown
async function loadSeasons(showId) {
  const seasons = await fetchSeasons(showId);
  seasonDropdown.innerHTML = '<option value="">Select Season</option>'; // Clear previous options

  seasons.forEach((season) => {
    // Fetch episodes for the season to check if it has any
    fetchEpisodes(season.id).then((episodes) => {
      if (episodes.length > 0) {
        const option = document.createElement("option");
        option.value = season.id;
        option.textContent = `Season ${season.number}`;
        seasonDropdown.appendChild(option);
      }
    });
  });

  seasonContainer.style.display = "block"; // Show season dropdown
}

// Event listener for season selection
seasonDropdown.addEventListener("change", async () => {
  const seasonId = seasonDropdown.value;
  if (seasonId) {
    const episodes = await fetchEpisodes(seasonId);
    episodeDropdown.innerHTML = '<option value="">Select Episode</option>'; // Clear previous options

    episodes.forEach((episode) => {
      if (episode.name && episode.name !== "TBA") {
        // Exclude TBA episodes
        const option = document.createElement("option");
        option.value = episode.id;
        option.textContent = `Episode ${episode.number}: ${episode.name}`; // Include episode number in title
        episodeDropdown.appendChild(option);
      }
    });

    episodeContainer.style.display = "block"; // Show episode dropdown
  } else {
    episodeContainer.style.display = "none"; // Hide if no season is selected
  }
});

// Event listener for episode selection
episodeDropdown.addEventListener("change", () => {
  const seasonId = seasonDropdown.value;
  const episodeId = episodeDropdown.value;

  if (seasonId && episodeId && selectedTmdbId) {
    const episodeNumber = episodeDropdown.options[
      episodeDropdown.selectedIndex
    ].text
      .split(":")[0]
      .split(" ")[1]; // Get episode number
    const seasonNumber =
      seasonDropdown.options[seasonDropdown.selectedIndex].text.split(" ")[1]; // Get season number

    // Construct the embed URL
    const embedUrl = `https://vidlink.pro/tv/${selectedTmdbId}/${seasonNumber}/${episodeNumber}`;
    //const embedUrl = `https://vidsrc.cc/v2/embed/tv/${selectedTmdbId}/${seasonNumber}/${episodeNumber}?autoPlay=false`;

    // Display the embed link in the iframe
    videoPlayer.src = embedUrl;
    videoContainer.style.display = "block"; // Show the video container
  }
});

// Function to handle search input
input.addEventListener("input", async () => {
  videoPlayer.src = "";
  const searchTerm = input.value.trim();
  const selectedCat = document.getElementById("selection").value;

  if (selectedCat == "series" && searchTerm.length > 0) {
    const fetchedShows = await fetchShows(searchTerm);
    displayDropdownResults(fetchedShows);
  } else if (selectedCat == "movies" && searchTerm.length > 0) {
    const fetchedMovies = await fetchMovies(searchTerm);
    displayMovieDropdownResults(fetchedMovies);
  } else {
    dropdown.style.display = "none";
  }
});

// Function to display the full list of selected shows in resultsContainer
function displayFullResults(results) {
  resultsContainer.innerHTML = ""; // Clear previous results

  results.forEach((show) => {
    const card = document.createElement("div");
    card.classList.add("show-card");

    const img = document.createElement("img");
    img.src = show.image;
    img.alt = show.name;
    const text = document.createElement("div");
    text.classList.add("show-title");
    text.textContent = show.name;

    card.appendChild(img);
    card.appendChild(text);

    resultsContainer.appendChild(card);
  });
}

// Initial state: Hide dropdowns
dropdown.style.display = "none";
seasonContainer.style.display = "none";
episodeContainer.style.display = "none";
videoContainer.style.display = "none"; // Hide video container initially
searchBox.style.display = "none";

// START
extractAndAddToClassList();
