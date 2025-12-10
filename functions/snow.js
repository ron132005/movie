const NUMBER_OF_SNOWFLAKES = 7;
const MAX_SNOWFLAKE_SIZE = 5;
const MAX_SNOWFLAKE_SPEED = 2;
const SNOWFLAKE_COLOUR = "#ddd";

let snowflakes = [];
let running = true;
let startTime = null;

// Canvas
const canvas = document.createElement("canvas");
canvas.style.position = "fixed";
canvas.style.pointerEvents = "none";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

// Create one snowflake
function createSnowflake() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * MAX_SNOWFLAKE_SIZE + 1,
    s: Math.random() * MAX_SNOWFLAKE_SPEED + 1,
    sway: Math.random() - 0.5
  };
}

// Init pool
for (let i = 0; i < NUMBER_OF_SNOWFLAKES; i++) {
  snowflakes.push(createSnowflake());
}

// Animation
function animate(timestamp) {
  if (!startTime) startTime = timestamp;

  // After 6 seconds, stop creating new snowflakes
  if (timestamp - startTime >= 6000) {
    running = false;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let f of snowflakes) {
    // update
    f.y += f.s;
    f.x += f.sway;

    // If off-screen
    if (f.y > canvas.height || f.x < 0 || f.x > canvas.width) {

      if (!running) {
        // Do not respawn — remove it
        f.y = Infinity;
        continue;
      }

      // Respawn normally while still within time
      Object.assign(f, createSnowflake());
      f.y = 0;
    }

    // draw
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = SNOWFLAKE_COLOUR;
    ctx.fill();
  }

  requestAnimationFrame(animate);
}

// Resize handling
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  snowflakes = [];
  for (let i = 0; i < NUMBER_OF_SNOWFLAKES; i++) {
    snowflakes.push(createSnowflake());
  }
});

// Start animation
requestAnimationFrame(animate);
