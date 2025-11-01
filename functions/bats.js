const batContainer = document.getElementById('bats-container');

function createBat() {
  const bat = document.createElement('div');
  bat.classList.add('bat');
  bat.style.left = Math.random() * window.innerWidth + 'px';
  bat.style.top = '-50px';
  batContainer.appendChild(bat);

  const speed = 2 + Math.random() * 3;
  let y = -50;
  let x = parseFloat(bat.style.left);

  function fall() {
    y += speed;
    x += Math.sin(y / 50) * 2;
    bat.style.transform = `translate(${x}px, ${y}px)`;

    if (y < window.innerHeight + 50) {
      requestAnimationFrame(fall);
    } else {
      bat.remove();
    }
  }

  fall();
}

// spawn bats every 0.5 seconds
const batInterval = setInterval(createBat, 500);

// stop spawning after 8 seconds
setTimeout(() => {
  clearInterval(batInterval);
}, 15000);
