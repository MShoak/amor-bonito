/**
 * ============================================================================
 * SCRIPT INTERACTIVO: EXPERIENCIA ROMÁNTICA "MI AMOR BONITO"
 * Gestiona la animación de apertura del corazón 3D, el motor de partículas
 * en Canvas (lluvia y explosión de corazones), música romántica sintetizada
 * y la interactividad táctil para celulares y computadoras.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Referencias al DOM
  const heartSplitCard = document.getElementById('heartSplitCard');
  const heartBoxWrapper = document.getElementById('heartBoxWrapper');
  const revealedContent = document.getElementById('revealedContent');
  const btnReplay = document.getElementById('btnReplay');
  const btnBurst = document.getElementById('btnBurst');
  const btnMusic = document.getElementById('btnMusic');
  const musicIcon = document.getElementById('musicIcon');
  const musicText = document.getElementById('musicText');
  const btnShowQR = document.getElementById('btnShowQR');
  const btnCloseQR = document.getElementById('btnCloseQR');
  const qrModal = document.getElementById('qrModal');
  const qrUrlText = document.getElementById('qrUrlText');

  // Actualizar texto de URL con la dirección actual
  if (qrUrlText && window.location.origin) {
    qrUrlText.textContent = window.location.href;
  }

  // Estado de la experiencia
  let isOpened = false;
  let isMusicPlaying = false;
  let audioCtx = null;
  let musicInterval = null;

  // ==========================================================================
  // MOTOR DE PARTÍCULAS EN CANVAS (ULTRA FLUIDO: 60-120 FPS)
  // Utiliza sprites vectoriales pre-renderizados en GPU para cero lag
  // ==========================================================================
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let particles = [];
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Redimensionar canvas al cambiar el tamaño de ventana
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Pre-renderizar sprites de corazones una sola vez en memoria
  const spriteColors = ['#ff2a6d', '#ff758c', '#d81159', '#ffbe0b', '#ffffff'];
  const heartSprites = spriteColors.map(color => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 44;
    offCanvas.height = 44;
    const offCtx = offCanvas.getContext('2d');
    
    offCtx.translate(22, 16);
    offCtx.fillStyle = color;
    offCtx.beginPath();
    // Trazado de corazón paramétrico suave
    offCtx.moveTo(0, 3);
    offCtx.bezierCurveTo(-14, -12, -22, 6, 0, 22);
    offCtx.bezierCurveTo(22, 6, 14, -12, 0, 3);
    offCtx.fill();

    // Brillo sutil blanco
    offCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    offCtx.beginPath();
    offCtx.arc(-6, -2, 2.5, 0, Math.PI * 2);
    offCtx.fill();

    return offCanvas;
  });

  // Clase para partículas individuales
  class Particle {
    constructor(x, y, isExplosion = false) {
      this.x = x;
      this.y = y;
      this.isExplosion = isExplosion;
      this.sprite = heartSprites[Math.floor(Math.random() * heartSprites.length)];
      
      if (isExplosion) {
        // Velocidad radial en explosión
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.5 + 2.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 2.0;
        this.size = Math.random() * 18 + 14;
        this.opacity = 1;
        this.decay = Math.random() * 0.02 + 0.012;
        this.gravity = 0.10;
        this.rotation = Math.random() * Math.PI;
        this.vRotation = (Math.random() - 0.5) * 0.12;
      } else {
        // Lluvia ambiental suave que sube flotando elegantemente
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = -(Math.random() * 1.4 + 0.8);
        this.size = Math.random() * 16 + 12;
        this.opacity = Math.random() * 0.6 + 0.35;
        this.decay = 0.0035;
        this.gravity = 0;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.035 + 0.02;
        this.rotation = (Math.random() - 0.5) * 0.3;
        this.vRotation = (Math.random() - 0.5) * 0.015;
      }
    }

    update() {
      if (this.isExplosion) {
        this.vy += this.gravity;
        this.vx *= 0.97;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity -= this.decay;
        this.rotation += this.vRotation;
      } else {
        this.wobble += this.wobbleSpeed;
        this.x += this.vx + Math.sin(this.wobble) * 0.6;
        this.y += this.vy;
        this.opacity -= this.decay;
        this.rotation += this.vRotation;
      }
    }

    draw(ctx) {
      if (this.opacity <= 0.01) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));
      const half = this.size / 2;
      ctx.drawImage(this.sprite, -half, -half, this.size, this.size);
      ctx.restore();
    }
  }

  // Crear ráfaga de corazones limpia y sin saturar
  function createBurst(x, y, count = 28) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, true));
    }
  }

  // Generador continuo de corazones flotantes de fondo (máximo 22 partículas)
  let ambientCounter = 0;
  function addAmbientHeart() {
    if (particles.length < 22) {
      const x = Math.random() * width;
      const y = height + 20;
      particles.push(new Particle(x, y, false));
    }
  }

  // Bucle principal de animación de partículas
  function animateParticles() {
    ctx.clearRect(0, 0, width, height);

    ambientCounter++;
    if (ambientCounter % 20 === 0) {
      addAmbientHeart();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.opacity <= 0 || p.y < -50 || p.y > height + 60) {
        particles.splice(i, 1);
      }
    }

    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // ==========================================================================
  // SÍNTESIS DE AUDIO ROMÁNTICO (WEB AUDIO API)
  // Crea notas suaves de piano/caja de música sin dependencias externas
  // ==========================================================================
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Tocar una nota musical suave con armónicos cálidos
  function playMelodyNote(freq, timeOffset = 0, duration = 1.2) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime + timeOffset;

    // Oscilador principal
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Oscilador armónico para calidez tipo celesta / campana
    const oscHarmonic = audioCtx.createOscillator();
    const gainHarmonic = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(freq * 2, now);

    // Envolvente acústica suave (fade in rápido y fade out relajado)
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    gainHarmonic.gain.setValueAtTime(0.001, now);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    // Conexión al destino
    osc.connect(gain);
    oscHarmonic.connect(gainHarmonic);
    gain.connect(audioCtx.destination);
    gainHarmonic.connect(audioCtx.destination);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + duration);
    oscHarmonic.stop(now + duration);
  }

  // Efecto sonoro mágico de apertura
  function playOpenChime() {
    initAudio();
    // Arpegio ascendente romántico (Do - Mi - Sol - Si - Do)
    const arpeggio = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25];
    arpeggio.forEach((freq, index) => {
      playMelodyNote(freq, index * 0.12, 1.8);
    });
  }

  // Melodía romántica en bucle suave
  const romanticScale = [
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25
  ];
  
  function startRomanticMelody() {
    initAudio();
    if (musicInterval) clearInterval(musicInterval);

    // Patrón melódico cálido
    const sequence = [
      { note: 329.63, delay: 0 },    // Mi
      { note: 392.00, delay: 600 },  // Sol
      { note: 523.25, delay: 1200 }, // Do
      { note: 493.88, delay: 1800 }, // Si
      { note: 392.00, delay: 2400 }, // Sol
      { note: 440.00, delay: 3000 }, // La
      { note: 349.23, delay: 3600 }, // Fa
      { note: 329.63, delay: 4200 }, // Mi
    ];

    let step = 0;
    musicInterval = setInterval(() => {
      const item = sequence[step % sequence.length];
      playMelodyNote(item.note, 0, 1.5);
      step++;
    }, 700);

    isMusicPlaying = true;
    musicIcon.textContent = '⏸️';
    musicText.textContent = 'Pausar';
  }

  function stopRomanticMelody() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
    isMusicPlaying = false;
    musicIcon.textContent = '🎵';
    musicText.textContent = 'Música';
  }

  // Alternar música al pulsar el botón
  btnMusic.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMusicPlaying) {
      stopRomanticMelody();
    } else {
      startRomanticMelody();
    }
  });

  // ==========================================================================
  // ACCIÓN DE APERTURA DEL CORAZÓN
  // ==========================================================================
  function openHeartBox() {
    if (isOpened) return;
    isOpened = true;

    // Reproducir sonido mágico
    playOpenChime();

    // Iniciar música romántica automáticamente
    setTimeout(() => {
      if (!isMusicPlaying) {
        startRomanticMelody();
      }
    }, 900);

    // Activar animación de separación en el corazón exterior
    heartSplitCard.classList.add('opened');

    // Explosión de corazones desde el centro (ligera y fluida)
    const rect = heartSplitCard.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    createBurst(centerX, centerY, 24);

    // Ocultar caja exterior y revelar el corazón con la foto y textos
    setTimeout(() => {
      heartBoxWrapper.classList.add('opened');
      revealedContent.classList.add('visible');
      revealedContent.setAttribute('aria-hidden', 'false');

      // Segunda ráfaga suave de celebración
      createBurst(centerX, centerY - 40, 14);
    }, 650);
  }

  // Abrir con clic o toque
  heartSplitCard.addEventListener('click', openHeartBox);
  heartSplitCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openHeartBox();
    }
  });

  // ==========================================================================
  // BOTONES DE INTERACCIÓN TRAS LA REVELACIÓN
  // ==========================================================================

  // Repetir la animación de apertura
  btnReplay.addEventListener('click', (e) => {
    e.stopPropagation();
    revealedContent.classList.remove('visible');
    revealedContent.setAttribute('aria-hidden', 'true');

    setTimeout(() => {
      heartBoxWrapper.classList.remove('opened');
      heartSplitCard.classList.remove('opened');
      isOpened = false;
    }, 400);
  });

  // Botón "Más amor" (ráfaga de corazones)
  btnBurst.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = btnBurst.getBoundingClientRect();
    createBurst(rect.left + rect.width / 2, rect.top, 18);
    playMelodyNote(523.25, 0, 0.8);
    playMelodyNote(659.25, 0.1, 0.8);
  });

  // Toques en cualquier punto de la pantalla para crear corazoncitos flotantes
  window.addEventListener('pointerdown', (e) => {
    // Si no es un botón ni modal, generar corazones en la posición del toque
    if (!e.target.closest('button') && !e.target.closest('.qr-modal-card')) {
      createBurst(e.clientX, e.clientY, 6);
    }
  });

  // ==========================================================================
  // MODAL DEL CÓDIGO QR
  // ==========================================================================
  btnShowQR.addEventListener('click', () => {
    qrModal.classList.add('active');
  });

  btnCloseQR.addEventListener('click', () => {
    qrModal.classList.remove('active');
  });

  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      qrModal.classList.remove('active');
    }
  });
});
