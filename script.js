// Search functionality
const searchBox = document.getElementById('searchBox');
const dropdown = document.getElementById('dropdown');
const resultsContainer = document.getElementById('resultsContainer');
const seasonContainer = document.getElementById('seasonContainer');
const episodeContainer = document.getElementById('episodeContainer');
const seasonDropdown = document.getElementById('seasonDropdown');
const episodeDropdown = document.getElementById('episodeDropdown');
const videoContainer = document.getElementById('videoContainer');
const videoPlayer = document.getElementById('videoPlayer');

// TMDB API Key
const TMDB_API_KEY = 'a5f1a167ac8db6e31a8fb9934919703c';
const OMDB_API_KEY = '49064e2e'

// Variable to store selected show's ID and TMDB ID
let selectedShowId;
let selectedTmdbId;

//Function to show search box
function showSearchBox() {
    const selectedCat = document.getElementById("selection").value;
    if (selectedCat != 0) {
        searchBox.style.display = "block";
        dropdown.style.display = 'none';
        dropdown.style.display = 'none';
        seasonContainer.style.display = 'none';
        episodeContainer.style.display = 'none';
        videoContainer.style.display = 'none';
    } else {
        searchBox.style.display = "none";
        dropdown.style.display = 'none';
        dropdown.style.display = 'none';
        seasonContainer.style.display = 'none';
        episodeContainer.style.display = 'none';
        videoContainer.style.display = 'none'; // Hide video container initially
        searchBox.style.display = "none";
    }
}
// Function to snow
const NUMBER_OF_SNOWFLAKES = 5;
const MAX_SNOWFLAKE_SIZE = 5;
const MAX_SNOWFLAKE_SPEED = 2;
const SNOWFLAKE_COLOUR = '#ddd';
const snowflakes = [];

// Create canvas and append to body
const canvas = document.createElement('canvas');
canvas.style.position = 'fixed'; // Ensure it stays in place
canvas.style.pointerEvents = 'none'; // Avoid interfering with clicks
canvas.style.top = '0';
canvas.style.left = '0'; // Align to the left
canvas.width = window.innerWidth; // Match full width
canvas.height = window.innerHeight; // Match full height
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

// Function to create a snowflake
const createSnowflake = () => ({
    x: Math.random() * canvas.width, // Random x position within the canvas width
    y: Math.random() * canvas.height, // Random y position
    radius: Math.floor(Math.random() * MAX_SNOWFLAKE_SIZE) + 1, // Random size
    color: SNOWFLAKE_COLOUR,
    speed: Math.random() * MAX_SNOWFLAKE_SPEED + 1, // Random fall speed
    sway: Math.random() - 0.5 // Side-to-side sway
});

// Function to draw a snowflake
const drawSnowflake = snowflake => {
    ctx.beginPath();
    ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
    ctx.fillStyle = snowflake.color;
    ctx.fill();
    ctx.closePath();
};

// Update snowflake position
const updateSnowflake = snowflake => {
    snowflake.y += snowflake.speed; // Move down
    snowflake.x += snowflake.sway; // Sway side-to-side
    if (snowflake.y > canvas.height || snowflake.x < 0 || snowflake.x > canvas.width) {
        Object.assign(snowflake, createSnowflake()); // Recycle snowflake
        snowflake.y = 0; // Start at the top
    }
};

// Animation function
const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    snowflakes.forEach(snowflake => {
        updateSnowflake(snowflake);
        drawSnowflake(snowflake);
    });
    requestAnimationFrame(animate); // Recursive animation call
};

// Initialize snowflakes
for (let i = 0; i < NUMBER_OF_SNOWFLAKES; i++) {
    snowflakes.push(createSnowflake());
}

// Adjust canvas on window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    snowflakes.length = 0; // Clear current snowflakes
    for (let i = 0; i < NUMBER_OF_SNOWFLAKES; i++) {
        snowflakes.push(createSnowflake()); // Recreate snowflakes
    }
});

// Start animation
animate();

// Function to fetch movies from TVmaze API
async function fetchMovies(query) {
    const response = await fetch(`https://www.omdbapi.com/?s=${query}&type=movie&apiKey=${OMDB_API_KEY}`);
    const data = await response.json();
    return data.Search.map(item => ({
        id: item.imdbID,
        name: item.Title,
        image: item.Poster,
        imdbId: item.imdbID, // Store IMDB ID
    }));
}

//Display drop down results for movies
function displayMovieDropdownResults(results) {
    dropdown.innerHTML = '';  // Clear previous results
    if (results.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    results.forEach(movie => {
        const item = document.createElement('div');
        item.classList.add('dropdown-item');
        
        const img = document.createElement('img');
        img.src = movie.image;
        img.alt = movie.name;
        const text = document.createElement('span');
        text.textContent = movie.name;

        item.appendChild(img);
        item.appendChild(text);
        dropdown.appendChild(item);

        // On click, display detailed info in resultsContainer and fetch seasons
        item.addEventListener('click', async () => {
            displayMovieFullResults([movie]);  // Display the selected movie 
            // Store selected movie's IMDb ID
            // Close the dropdown after selecting a movie
            dropdown.style.display = 'none';  // Hide dropdown
        });
    });

    dropdown.style.display = 'block';  // Show the dropdown
}

//Function to display full movie results
function displayMovieFullResults(results) {
    resultsContainer.innerHTML = '';  // Clear previous results

    results.forEach(movie => {
        const card = document.createElement('div');
        card.classList.add('show-card');

        const img = document.createElement('img');
        img.src = movie.image;
        img.alt = movie.name;
        const text = document.createElement('div');
        text.classList.add('show-title');
        text.textContent = movie.name;

        card.appendChild(img);
        card.appendChild(text);

        resultsContainer.appendChild(card);
        selectedMovieId = movie.imdbId;
        
        const embedUrl = `https://vidlink.pro/movie/${selectedMovieId}`;
        
        // Display the embed link in the iframe
        videoPlayer.src = embedUrl;
        dropdown.style.display = 'none';
        seasonContainer.style.display = 'none';
        episodeContainer.style.display = 'none';
        videoContainer.style.display = 'block';  // Show the video container
    });
}

// Function to fetch shows from TVmaze API
async function fetchShows(query) {
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${query}`);
    const data = await response.json();
    return data.map(item => ({
        id: item.show.id,
        name: item.show.name,
        image: item.show.image ? item.show.image.medium : 'https://via.placeholder.com/210x315?text=No+Image', // Fallback image
        imdbId: item.show.externals.imdb, // Store IMDB ID
        genre: item.show.genres.join(", "),
        description: item.show.summary ? item.show.summary.replace(/(<([^>]+)>)/gi, "") : "No description available."
    }));
}

// Function to fetch seasons from TVmaze API
async function fetchSeasons(showId) {
    const response = await fetch(`https://api.tvmaze.com/shows/${showId}/seasons`);
    return response.json();
}

// Function to fetch episodes from TVmaze API
async function fetchEpisodes(seasonId) {
    const response = await fetch(`https://api.tvmaze.com/seasons/${seasonId}/episodes`);
    return response.json();
}

// Function to convert IMDb ID to TMDB ID
async function imdbToTmdb(imdbId) {
    try {
        const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;

        const response = await fetch(url);
        const data = await response.json();

        // Check for TV show results
        if (data && data.tv_results.length > 0) {
            selectedTmdbId = data.tv_results[0].id; // Get the first TV show's TMDB ID
            console.log(`TMDB ID for IMDb ID "${imdbId}": ${selectedTmdbId}`);
        } else {
            console.log(`No TV show results found for IMDb ID "${imdbId}".`);
        }
    } catch (error) {
        console.error(`Error fetching data: ${error.message}`);
    }
}

// Function to display search results in the dropdown
function displayDropdownResults(results) {
    dropdown.innerHTML = '';  // Clear previous results
    if (results.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    results.forEach(show => {
        const item = document.createElement('div');
        item.classList.add('dropdown-item');
        
        const img = document.createElement('img');
        img.src = show.image;
        img.alt = show.name;
        const text = document.createElement('span');
        text.textContent = show.name;

        item.appendChild(img);
        item.appendChild(text);
        dropdown.appendChild(item);

        // On click, display detailed info in resultsContainer and fetch seasons
        item.addEventListener('click', async () => {
            displayFullResults([show]);  // Display the selected show
            await loadSeasons(show.id);  // Load seasons for the selected show
            
            // Store selected show's IMDb ID
            selectedShowId = show.imdbId;

            // Convert IMDb ID to TMDB ID
            await imdbToTmdb(selectedShowId);

            // Close the dropdown after selecting a show
            dropdown.style.display = 'none';  // Hide dropdown
        });
    });

    dropdown.style.display = 'block';  // Show the dropdown
}

// Function to load seasons into the dropdown
async function loadSeasons(showId) {
    const seasons = await fetchSeasons(showId);
    seasonDropdown.innerHTML = '<option value="">Select Season</option>';  // Clear previous options

    seasons.forEach(season => {
        // Fetch episodes for the season to check if it has any
        fetchEpisodes(season.id).then(episodes => {
            if (episodes.length > 0) {
                const option = document.createElement('option');
                option.value = season.id;
                option.textContent = `Season ${season.number}`;
                seasonDropdown.appendChild(option);
            }
        });
    });

    seasonContainer.style.display = 'block';  // Show season dropdown
}

// Event listener for season selection
seasonDropdown.addEventListener('change', async () => {
    const seasonId = seasonDropdown.value;
    if (seasonId) {
        const episodes = await fetchEpisodes(seasonId);
        episodeDropdown.innerHTML = '<option value="">Select Episode</option>';  // Clear previous options

        episodes.forEach(episode => {
            if (episode.name && episode.name !== 'TBA') {  // Exclude TBA episodes
                const option = document.createElement('option');
                option.value = episode.id;
                option.textContent = `Episode ${episode.number}: ${episode.name}`;  // Include episode number in title
                episodeDropdown.appendChild(option);
            }
        });

        episodeContainer.style.display = 'block';  // Show episode dropdown
    } else {
        episodeContainer.style.display = 'none';  // Hide if no season is selected
    }
});

// Event listener for episode selection
episodeDropdown.addEventListener('change', () => {
    const seasonId = seasonDropdown.value;
    const episodeId = episodeDropdown.value;

    if (seasonId && episodeId && selectedTmdbId) {
        const episodeNumber = episodeDropdown.options[episodeDropdown.selectedIndex].text.split(':')[0].split(' ')[1]; // Get episode number
        const seasonNumber = seasonDropdown.options[seasonDropdown.selectedIndex].text.split(' ')[1]; // Get season number

        // Construct the embed URL
        const embedUrl = `https://vidlink.pro/tv/${selectedTmdbId}/${seasonNumber}/${episodeNumber}`;
        
        // Display the embed link in the iframe
        videoPlayer.src = embedUrl;
        videoContainer.style.display = 'block';  // Show the video container
    }
});

// Function to handle search input
searchBox.addEventListener('input', async () => {
    const searchTerm = searchBox.value.trim();
    const selectedCat = document.getElementById("selection").value;

    if (selectedCat == "series" && searchTerm.length > 0) {
        const fetchedShows = await fetchShows(searchTerm);
        displayDropdownResults(fetchedShows);
    } else if (selectedCat == "movies" && searchTerm.length > 0){
        const fetchedMovies = await fetchMovies(searchTerm);
        displayMovieDropdownResults(fetchedMovies);
    } else {
        dropdown.style.display = 'none'; // Hide dropdown if input is empty
    }
});

// Function to display the full list of selected shows in resultsContainer
function displayFullResults(results) {
    resultsContainer.innerHTML = '';  // Clear previous results

    results.forEach(show => {
        const card = document.createElement('div');
        card.classList.add('show-card');

        const img = document.createElement('img');
        img.src = show.image;
        img.alt = show.name;
        const text = document.createElement('div');
        text.classList.add('show-title');
        text.textContent = show.name;

        card.appendChild(img);
        card.appendChild(text);

        resultsContainer.appendChild(card);
    });
}

// Initial state: Hide dropdowns
dropdown.style.display = 'none';
seasonContainer.style.display = 'none';
episodeContainer.style.display = 'none';
videoContainer.style.display = 'none'; // Hide video container initially
searchBox.style.display = "none";
