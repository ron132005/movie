// DISABLE DEVELOPER TOOLS
// Simple DevTools detection (not foolproof, can still be  bypass)
// Redirects to virus.com using window.location.replace(). Will not be able to use the back button.

const threshold = 160; // pixel threshold difference

const checker = setInterval(() => {
  try {
    // Check if DevTools changes window size
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      clearInterval(checker);
      window.location.replace("https://virus.com");
    }

    // Optional timing-based detection
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {}
    const delta = performance.now() - start;
    if (delta > 150) {
      clearInterval(checker);
      window.location.replace("https://virus.com");
    }
  } catch (err) {
    // Silently ignore the errors
  }
}, 800);

// Optional: detect hotkeys (Ctrl+Shift+I, F12)
document.addEventListener("keydown", (e) => {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "I")
  ) {
    e.preventDefault();
    window.location.replace("https://virus.com");
  }
});
