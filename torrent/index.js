// Search functionality
const searchBox = document.getElementById("search-container");
const input = document.getElementById("searchBox");
const resultsContainer = document.getElementById("resultsContainer");

// Event listener when page is loaded
document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".number");
  const animationDuration = 2000; // Total animation time in ms
  const frameRate = 11;

  counters.forEach((counter) => {
    const target = +counter.getAttribute("data-target");
    const increment = target / (animationDuration / (1000 / frameRate)); // Increment per frame (assuming ~60fps)

    const updateCounter = () => {
      const current = +counter.innerText;

      if (current < target) {
        counter.innerText = Math.ceil(current + increment);
        setTimeout(updateCounter, 1000 / frameRate); // Call for the next frame
      } else {
        counter.innerText = target; // Ensure the final value matches the target
      }
    };

    updateCounter();
  });
});

// Function to fetch movies from YTS API
async function fetchMovies(query) {
  try {
    const response = await fetch(
      `https://yts.mx/api/v2/list_movies.json?query_term=${query}`
    );
    const data = await response.json();

    if (!data.data.movies) return []; // Safely handle no results

    return data.data.movies.map((item) => ({
      id: item.id,
      name: item.title,
      image: item.medium_cover_image,
      year: item.year,
      ytId: item.yt_trailer_code,
    }));
  } catch (err) {
    console.error("API error:", err);
    return [];
  }
}

// Function to handle Enter key press in the search box
input.addEventListener("keydown", async function (event) {
  const searchTerm = input.value.trim();

  if (event.key === "Enter" && searchTerm !== "") {
    const loadingBar = document.getElementById("loadingBar");
    if (loadingBar) {
      loadingBar.style.width = "50%"; // Start loading animation
    }

    let MoviesArray1 = [];
    try {
      MoviesArray1 = await fetchMovies(searchTerm);
    } catch (err) {
      console.error("Failed to fetch movies:", err);
    }

    const MoviesArray2 = encodeURIComponent(JSON.stringify(MoviesArray1 || []));
    const encodedQuery = encodeURIComponent(searchTerm);

    if (loadingBar) {
      loadingBar.style.width = "80%";
    }

    console.log("Redirecting with:", {
      query: searchTerm,
      array: MoviesArray1,
    });

    setTimeout(() => {
      // Always go to search.html, even if array is empty
      window.location.href = `search.html?array=${MoviesArray2}&query=${encodedQuery}`;
    }, 300);
  }
});
