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
