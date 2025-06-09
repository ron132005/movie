// Function to snow
const NUMBER_OF_SNOWFLAKES = 5;
const MAX_SNOWFLAKE_SIZE = 5;
const MAX_SNOWFLAKE_SPEED = 2;
const SNOWFLAKE_COLOUR = "#ddd";
const snowflakes = [];

// Create canvas and append to body
const canvas = document.createElement("canvas");
canvas.style.position = "fixed"; // Ensure it stays in place
canvas.style.pointerEvents = "none"; // Avoid interfering with clicks
canvas.style.top = "0";
canvas.style.left = "0"; // Align to the left
canvas.width = window.innerWidth; // Match full width
canvas.height = window.innerHeight; // Match full height
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

// Function to create a snowflake
const createSnowflake = () => ({
  x: Math.random() * canvas.width, // Random x position within the canvas width
  y: Math.random() * canvas.height, // Random y position
  radius: Math.floor(Math.random() * MAX_SNOWFLAKE_SIZE) + 1, // Random size
  color: SNOWFLAKE_COLOUR,
  speed: Math.random() * MAX_SNOWFLAKE_SPEED + 1, // Random fall speed
  sway: Math.random() - 0.5, // Side-to-side sway
});

// Function to draw a snowflake
const drawSnowflake = (snowflake) => {
  ctx.beginPath();
  ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
  ctx.fillStyle = snowflake.color;
  ctx.fill();
  ctx.closePath();
};

// Update snowflake position
const updateSnowflake = (snowflake) => {
  snowflake.y += snowflake.speed; // Move down
  snowflake.x += snowflake.sway; // Sway side-to-side
  if (
    snowflake.y > canvas.height ||
    snowflake.x < 0 ||
    snowflake.x > canvas.width
  ) {
    Object.assign(snowflake, createSnowflake()); // Recycle snowflake
    snowflake.y = 0; // Start at the top
  }
};

// Animation function
const animate = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
  snowflakes.forEach((snowflake) => {
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
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  snowflakes.length = 0; // Clear current snowflakes
  for (let i = 0; i < NUMBER_OF_SNOWFLAKES; i++) {
    snowflakes.push(createSnowflake()); // Recreate snowflakes
  }
});

// Start animation
animate();
