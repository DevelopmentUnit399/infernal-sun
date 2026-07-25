const canvas = document.getElementById('flameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const particles = [];

// Track previous position and time to calculate velocity
let prevMouse = { x: -100, y: -100, time: Date.now() };
let currentVelocity = 0;

window.addEventListener('mousemove', (e) => {
  const now = Date.now();
  const dt = (now - prevMouse.time) || 1; // Time elapsed in ms

  // Calculate distance traveled (Pythagorean theorem)
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  const distance = Math.hypot(dx, dy);

  // Velocity in pixels per millisecond
  const rawVelocity = distance / dt;

  // Smooth velocity spikes for natural-looking flame transitions
  currentVelocity = currentVelocity * 0.4 + rawVelocity * 0.6;

  // Only spawn particles if moving at least a tiny bit
  if (currentVelocity > 0.05) {
    // 1. Particle Spawn Rate: Scales from 1 (slow) up to 5 (fast)
    const spawnCount = Math.min(Math.floor(currentVelocity * 3) + 1, 5);

    for (let i = 0; i < spawnCount; i++) {
      particles.push(createParticle(e.clientX, e.clientY, currentVelocity));
    }
  }

  // Update previous mouse coordinates
  prevMouse = { x: e.clientX, y: e.clientY, time: now };
});

function createParticle(x, y, speed) {
  // 2. Upward Speed: Faster velocity creates energetic, tall flames
  const speedFactor = Math.min(speed, 3);
  
  return {
    x: x + (Math.random() - 0.5) * (8 + speedFactor * 4),
    y: y + (Math.random() - 0.5) * (8 + speedFactor * 4),
    // 3. Particle Size: Scales slightly with movement speed
    size: Math.random() * (6 + speedFactor * 4) + 4,
    vx: (Math.random() - 0.5) * (1 + speedFactor),
    vy: -Math.random() * (1.5 + speedFactor * 1.5) - 0.8, // Upward drift speed
    life: 0,
    maxLife: Math.random() * 15 + 15 + speedFactor * 5
  };
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Gradually decay velocity when mouse stops moving
  currentVelocity *= 0.88;

  ctx.globalCompositeOperation = 'lighter';

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.size *= 0.94; // Shrink speed

    if (p.life >= p.maxLife || p.size <= 0.5) {
      particles.splice(i, 1);
      continue;
    }

    const progress = p.life / p.maxLife;
    let color;
    if (progress < 0.25) {
      color = `rgba(255, 240, 180, ${1 - progress})`;
    } else if (progress < 0.65) {
      color = `rgba(242, 140, 83, ${1 - progress})`;
    } else {
      color = `rgba(201, 73, 7, ${1 - progress})`;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  requestAnimationFrame(animate);
}

animate();