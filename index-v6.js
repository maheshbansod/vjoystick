//@ts-check
/// <reference lib="dom" />
"use strict";

function init() {
  const wrapper = document.querySelector(".canvas-wrapper");
  if (!wrapper) {
    throw Error("nah");
  }
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  const canvas = wrapper.querySelector("canvas");
  if (!canvas) {
    throw new Error("where dah canvas go");
  }
  canvas.width = width;
  canvas.height = height;
  const joystickDraggableMax = 120;
  const maxParticles = 500;

  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
  if (!ctx) {
    throw new Error("where da ctx at though");
  }

  const playMargin = 10;
  const velocityVelocity = 10;
  let rocketFuelBurnVelocity = {x: 0, y: 0};
  const bounds = {
    left: playMargin,
    top: playMargin,
    right: width - playMargin,
    bottom: height - playMargin,
  };

  /**
   * @typedef {{position: Pair, lifetime: number, velocity: Pair, color: string, size: number}} ParticleData
   * @typedef {{position: Pair, distance: number, intensity: number, size: number, r: number}} StarData
   * @typedef {{x: number, y: number, width: number, height: number}} Bounds
   * @type {{
   * 	joyStickState: {x: number, y: number, ui?: {
   * 		bounds: Bounds
   * 	}},
   * 	dragState: {
   * 		dragStart?: Pair
   * 	},
   * 	playerState: {
   * 		velocity: Pair,
   * 		position: Pair
   * 	},
   * 	particles: {
   * 		p: ParticleData[]
   * 	},
   * 	stars: {
   * 		p: StarData[]
   * 	},
   * 	world: {
   * 	  velocity: Pair
   * 	}
   * }}
   */
  const state = {
    joyStickState: {
      x: 0,
      y: 0,
    },
    dragState: {
      dragStart: undefined,
    },
    playerState: {
      velocity: {
        x: 0,
        y: 0,
      },
      position: {
        x: (bounds.left + bounds.right) / 2,
        y: (bounds.top + bounds.bottom) / 2,
      },
    },
    particles: {
      p: [],
    },
    stars: {
      p: [],
    },
    world: {
      velocity: { x: 0, y: 0 },
    },
  };

  function initStars() {
    const n = 10;
    for (let i = 1; i <= n; i++) {
      /** @type {StarData} */
      const star = {
        position: randomPosition(),
        distance: randomDistance(),
        size: randomSize(),
        intensity: Math.random(),
        r: randomSpikes(),
      };
      state.stars.p.push(star);
    }

    state.stars.p.sort((a, b) => a.distance - b.distance);

    function randomSpikes() {
      return Math.floor(4 + Math.random() * 3);
    }
    function randomSize() {
      return 5 + Math.random() * 10;
    }
    function randomDistance() {
      return Math.random() * 5;
    }
    function randomPosition() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
      };
    }
  }
  initStars();

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawMap();
    drawStars();
    drawJoystick();
    drawParticles();
    drawPlayer();
  }

  function drawStars() {
    for (const star of state.stars.p) {
      drawStar(star);
    }
  }

  function drawParticles() {
    for (const particle of state.particles.p) {
      const { x, y } = particle.position;
      const { color, size } = particle;
      const prevFillStyle = ctx.fillStyle;
      ctx.fillStyle = color;
      fillCircle(x, y, size / 2);
      ctx.fillStyle = prevFillStyle;
    }
  }

  function drawMap() {
    const w = bounds.right - bounds.left;
    const h = bounds.bottom - bounds.top;
    ctx.strokeRect(bounds.top, bounds.left, w, h);
  }

  /** @param {StarData} star */
  function drawStar(star) {
    const { x: cx, y: cy } = star.position;
    const spikes = star.r;
    const distance = star.distance;
    const outerRadius = star.size / 2 * distance;
    const innerRadius = star.size / 4 * distance;
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.fillStyle = "skyblue";
    ctx.fill();
  }

  const playerSize = 30;
  function drawPlayer() {
    const fillStyle = ctx.fillStyle;
    ctx.fillStyle = "rgb(255, 255, 255)";
    const { x, y } = state.playerState.position;
    const center = {
      x: x + playerSize / 2,
      y: y + playerSize / 2,
    };
    fillCircle(center.x, center.y, playerSize / 2);
    ctx.fillStyle = fillStyle;
  }

  let previousTime = Date.now();
  function eventLoop() {
    draw();
    const dt = Date.now() - previousTime;
    previousTime = Date.now();
    updateState(dt);
    requestAnimationFrame(eventLoop);
  }
  eventLoop();

  /**
   * @param {number} dt
   */
  function updateState(dt) {
    updatePlayerState(dt);
    updateParticles(dt);
    updateStars(dt);
    updateWorld(dt);
  }

  /** @param {number} _dt */
  function updateWorld(_dt) {
    const { x: pvx, y: pvy } = state.playerState.velocity;
    if (pvx === 0 && pvy === 0) {
      return;
    }
    state.world.velocity.x = -pvx / 2;
    state.world.velocity.y = -pvy / 2;
  }

  /** @param {number} dt */
  function updateStars(dt) {
    for (const star of state.stars.p) {
      let { x: px, y: py } = star.position;
      py += (star.distance) * dt / 100 + state.world.velocity.y * dt;
      px += state.world.velocity.x * dt;
      if (px < 0) {
        px = width + px;
      }
      if (py < 0) {
        py = height + py;
      }
      px = px % width;
      py = py % height;
      star.position.x = px;
      star.position.y = py;
    }
  }

  /**
   * @param {number} dt
   */
  function updatePlayerState(dt) {
    /**
     * @param {number} a
     * @param {number} b
     */
    const reach = (a, b) => {
      const step = velocityVelocity * dt / 10000;
      if ((a > b && a - b < step) || (b > a && b - a < step)) {
        return b;
      }
      if (a > b) {
        return a - step;
      } else if (a < b) {
        return a + step;
      }
      return b;
    };

    state.playerState.velocity.x = reach(
      state.playerState.velocity.x,
      state.joyStickState.x,
    );
    state.playerState.velocity.y = reach(
      state.playerState.velocity.y,
      state.joyStickState.y,
    );

    const { x: vx, y: vy } = state.playerState.velocity;
    let { x: px, y: py } = state.playerState.position;
    px += vx * dt;
    py += vy * dt;
    const pMargin = 10;
    /** @type {{x: boolean, y: boolean}} */
    const throttledAxes = {
      x: false,
      y: false
    }
    if (px > bounds.right - playerSize - pMargin) {
      px = bounds.right - pMargin - playerSize;
      throttledAxes.x = true;
    } else if (px < bounds.left + pMargin) {
      px = bounds.left + pMargin;
      throttledAxes.x = true;
    }
    if (py > bounds.bottom - playerSize - pMargin) {
      py = bounds.bottom - pMargin - playerSize;
      throttledAxes.y = true;
    } else if (py < bounds.top + pMargin) {
      py = bounds.top + pMargin;
      throttledAxes.y = true;
    }

    state.playerState.position.x = px;
    state.playerState.position.y = py;

    /**
     * @param {number} n
     */
    const prevPos = (n) => {
      const d = 0.8;
      const center = {
        x: state.playerState.position.x + playerSize / 2,
        y: state.playerState.position.y + playerSize / 2,
      };
      const { velocity } = state.playerState;
      return {
        x: center.x - velocity.x * n * d,
        y: center.y - velocity.y * n * d,
      };
    };
    /** @param {number} n */
    const noise = (n) => {
      return n * Math.random();
    };

    if (vx !== 0 || vy !== 0) {
      if (!throttledAxes.x && !throttledAxes.y && (rocketFuelBurnVelocity.x !== 0 || rocketFuelBurnVelocity.y !== 0)){
        rocketFuelBurnVelocity = {
          x: throttledAxes.x ? -vx : 0,
          y: throttledAxes.y ? -vy : 0
        };
      }
      rocketFuelBurnVelocity.x = throttledAxes.x ? -vx : 0;
      rocketFuelBurnVelocity.y = throttledAxes.y ? -vy : 0;
      const n = 10;
      for (let i = 1; i <= n; i++) {
        const pos = prevPos(i * 10);
        const m = playerSize;
        const posNoiseMax = (2 * i - i * m + n * m - 2) / (n - 1);
        pos.x += noise(posNoiseMax) - posNoiseMax / 2;
        pos.y += noise(posNoiseMax) - posNoiseMax / 2;
        const dotSize = noise(10);
        const color = `rgb(${noise(255)}, ${noise(255)}, ${200 + noise(55)})`;
        if (state.particles.p.length < maxParticles) {
          state.particles.p.push({
            position: pos,
            velocity: rocketFuelBurnVelocity,
            lifetime: 300,
            color,
            size: dotSize,
          });
        }
      }
    }
  }
  /** @param {number} dt */
  function updateParticles(dt) {
    /** @type {ParticleData[]} */
    const markForDeletion = [];
    for (const particle of state.particles.p) {
      particle.lifetime -= dt;
      if (particle.lifetime <= 0) {
        markForDeletion.push(particle);
        continue;
      }

      const x = particle.position.x + particle.velocity.x * dt;
      const y = particle.position.y + particle.velocity.y * dt;

      particle.position.x = x;
      particle.position.y = y;
    }
    state.particles.p = state.particles.p.filter((p) =>
      !markForDeletion.includes(p)
    );
  }
  canvas.addEventListener("pointerdown", (e) => {
    const x = e.offsetX;
    const y = e.offsetY;
    state.dragState.dragStart = { x, y };
  });
  canvas.addEventListener("pointerup", (e) => {
    const x = e.offsetX;
    const y = e.offsetY;
    if (state.dragState.dragStart) {
      onDragEndEvent(e, state.dragState.dragStart, { x, y });
      state.dragState.dragStart = undefined;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const x = e.offsetX;
    const y = e.offsetY;
    if (state.dragState.dragStart) {
      onDragEvent(e, state.dragState.dragStart, { x, y });
    }
  });

  /**
   * @param {MouseEvent} e
   * @param {Pair} dragStart
   * @param {Pair} currentDragPos
   */
  function onDragEndEvent(e, dragStart, currentDragPos) {
    for (const listener of dragEndListeners) {
      listener(e, dragStart, currentDragPos);
    }
  }
  /**
   * @param {MouseEvent} e
   * @param {Pair} dragStart
   * @param {Pair} currentDragPos
   */
  function onDragEvent(e, dragStart, currentDragPos) {
    for (const listener of dragListeners) {
      listener(e, dragStart, currentDragPos);
    }
  }

  /**
   * @typedef {(e: MouseEvent, dragStart: Pair, currentDragPos: Pair) => any} DragListener
   * @typedef {{x: number, y: number}} Pair
   */
  /** @type {DragListener[]} */
  const dragListeners = [];
  /** @type {DragListener[]} */
  const dragEndListeners = [];
  /** @param {DragListener} listener **/
  function addDragListener(listener) {
    dragListeners.push(listener);
  }
  /** @param {DragListener} listener **/
  function addDragEndListener(listener) {
    dragEndListeners.push(listener);
  }

  addDragListener((_e, dragStart, currentDragPos) => {
    /**
     * @type {Pair|undefined}
     */
    let joystickPos;
    // deno-lint-ignore no-cond-assign
    if (joystickPos = getJoystickPosDiff(dragStart, currentDragPos)) {
      state.joyStickState.x = joystickPos.x / joystickDraggableMax;
      state.joyStickState.y = joystickPos.y / joystickDraggableMax;
    }
  });
  addDragEndListener(() => {
    state.joyStickState.x = 0;
    state.joyStickState.y = 0;
  });

  function getJoystickInitialConfiguration() {
    const radius = 100;
    const innerRadius = radius / 2;
    const margin = joystickDraggableMax - radius + innerRadius;
    const landscapeCenter = () => ({
      x: radius + margin,
      y: height - radius - margin,
    });
    const portraitCenter = () => ({
      x: width / 2,
      y: height - radius - margin,
    });
    const center = width > height ? landscapeCenter() : portraitCenter();

    return {
      radius,
      center,
      innerRadius,
    };
  }

  const joystickInitialConfiguration = getJoystickInitialConfiguration();

  const origin = { x: 0, y: 0 };

  /**
   * @param {Pair} dragStart
   * @param {Pair} currentDragPos
   */
  function getJoystickPosDiff(dragStart, currentDragPos) {
    const { radius, center } = joystickInitialConfiguration;

    const joystick = {
      x: center.x - radius,
      y: center.y - radius,
      right: center.x + radius,
      bottom: center.y + radius,
    };
    if (
      dragStart.x >= joystick.x && dragStart.x <= joystick.right &&
      dragStart.y >= joystick.y && dragStart.y <= joystick.bottom
    ) {
      let xDiff = currentDragPos.x - center.x;
      let yDiff = currentDragPos.y - center.y;
      const dragDist = dist({ x: xDiff, y: yDiff }, origin);
      if (dragDist > joystickDraggableMax) {
        if (xDiff === 0) {
          xDiff = 0;
          yDiff = joystickDraggableMax;
        } else {
          const m = yDiff / xDiff;
          const r = joystickDraggableMax;
          const xsign = xDiff > 0 ? 1 : -1;
          const x = xsign * r / Math.sqrt(m * m + 1);
          const y = m * x;
          xDiff = x;
          yDiff = y;
        }
      }
      // is inside
      return {
        x: xDiff,
        y: yDiff,
      };
    }

    return undefined;
  }

  /**
   * @param {Pair} p1
   * @param {Pair} p2
   */
  function dist(p1, p2) {
    const xDiff = p1.x - p2.x;
    const yDiff = p1.y - p2.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
  }

  function drawJoystick() {
    const { radius, center, innerRadius } = getJoystickInitialConfiguration();

    ctx.strokeStyle = "rgb(200, 200, 200)";

    // joystick base
    strokeCircle(center.x, center.y, radius);
    strokeCircle(center.x, center.y, innerRadius);

    // draggable
    // todo: change stroke color maybe
    const { x: xperc, y: yperc } = state.joyStickState;
    const draggableRadius = innerRadius;
    const draggableMax = joystickDraggableMax;
    const draggableCenter = {
      x: center.x + xperc * draggableMax,
      y: center.y + yperc * draggableMax,
    };
    const previousFillStyle = ctx.fillStyle;
    ctx.fillStyle = "rgb(255,255,255)";
    fillCircle(draggableCenter.x, draggableCenter.y, draggableRadius);
    ctx.fillStyle = previousFillStyle;
    strokeCircle(draggableCenter.x, draggableCenter.y, draggableRadius);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   */
  function strokeCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   */
  function fillCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

init();
