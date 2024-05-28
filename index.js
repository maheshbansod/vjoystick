//@ts-check
'use strict'

function init() {
	const wrapper = document.querySelector('.canvas-wrapper');
	if (!wrapper) {
		throw Error('nah');
	}
	const width = wrapper.clientWidth;
	const height = wrapper.clientHeight;
	const canvas = wrapper.querySelector('canvas');
	if (!canvas) {
		throw new Error('where dah canvas go');
	}
	canvas.width = width;
	canvas.height = height;
	const joystickDraggableMax = 100;

	const ctx = /** @type {CanvasRenderingContext2D} */(canvas.getContext('2d'));
	if (!ctx) {
		throw new Error('where da ctx at though');
	}

	const playMargin = 10;
	const bounds = {
		left: playMargin,
		top: playMargin,
		right: width - playMargin,
		bottom: height - playMargin
	};

	/**
	 * @typedef {{x: number, y: number, width: number, height: number}} Bounds
	 * @type {{
	 *	joyStickState: {x: number, y: number, ui?: {
	 *		bounds: Bounds
	 *	}},
	 *	dragState: {
	 *		dragStart?: Pair
	 *	},
	 *	playerState: {
	 *		velocity: Pair,
	 *		position: Pair
	 *	}
	 * }}
	 */
	const state = {
		joyStickState: {
			x: 0,
			y: 0
		},
		dragState: {
			dragStart: undefined
		},
		playerState: {
			velocity: {
				x: 0, y: 0
			},
			position: {
				x: (bounds.left + bounds.right) / 2,
				y: (bounds.top + bounds.bottom) / 2,
			}
		}
	};

	function draw() {
		ctx.clearRect(0, 0, width, height);
		drawMap();
		drawPlayer();
		drawJoystick();
	}

	function drawMap() {
		const w = bounds.right - bounds.left;
		const h = bounds.bottom - bounds.top;
		ctx.strokeRect(bounds.top, bounds.left, w, h);
	}

	const playerSize = 10;
	function drawPlayer() {
		ctx.fillRect(state.playerState.position.x, state.playerState.position.y, playerSize, playerSize);
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
	 * */
	function updateState(dt) {
		updatePlayerState(dt);
	}

	/**
	 * @param {number} dt
	 * */
	function updatePlayerState(dt) {
		state.playerState.velocity.x = state.joyStickState.x;
		state.playerState.velocity.y = state.joyStickState.y;

		const { x: vx, y: vy } = state.playerState.velocity;
		let { x: px, y: py } = state.playerState.position;
		px += vx * dt;
		py += vy * dt;
		const pMargin = 10;
		if (px > bounds.right - pMargin) {
			px = bounds.right - pMargin;
		} else if (px < bounds.left + pMargin) {
			px = bounds.left + pMargin;
		}
		if (py > bounds.bottom - pMargin) {
			py = bounds.bottom - pMargin;
		} else if (py < bounds.top + pMargin) {
			py = bounds.top + pMargin;
		}

		state.playerState.position.x = px;
		state.playerState.position.y = py;
	}
	canvas.addEventListener('pointerdown', e => {
		const x = e.offsetX;
		const y = e.offsetY;
		state.dragState.dragStart = { x, y };
	});
	canvas.addEventListener('pointerup', e => {
		const x = e.offsetX;
		const y = e.offsetY;
		if (state.dragState.dragStart) {
			onDragEndEvent(e, state.dragState.dragStart, { x, y });
			state.dragState.dragStart = undefined;
		}
	});

	canvas.addEventListener('pointermove', e => {
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
	 *
	 * */
	function onDragEndEvent(e, dragStart, currentDragPos) {
		for (const listener of dragEndListeners) {
			listener(e, dragStart, currentDragPos);
		}
	}
	/**
	 * @param {MouseEvent} e
	 * @param {Pair} dragStart
	 * @param {Pair} currentDragPos
	 *
	 * */
	function onDragEvent(e, dragStart, currentDragPos) {
		for (const listener of dragListeners) {
			listener(e, dragStart, currentDragPos);
		}
	}

	/**
	 * @typedef {(e: MouseEvent, dragStart: Pair, currentDragPos: Pair) => any} DragListener
	 * @typedef {{x: number, y: number}} Pair
	 * */
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
		const center = {
			x: radius + margin,
			y: height - radius - margin
		};

		return {
			radius,
			center,
			innerRadius
		}
	}

	const joystickInitialConfiguration = getJoystickInitialConfiguration();

	const origin = { x: 0, y: 0 };

	/**
	 * @param {Pair} dragStart
	 * @param {Pair} currentDragPos
	 *
	 * */
	function getJoystickPosDiff(dragStart, currentDragPos) {
		const { radius, center } = joystickInitialConfiguration;

		const joystick = {
			x: center.x - radius,
			y: center.y - radius,
			right: center.x + radius,
			bottom: center.y + radius,
		};
		if (dragStart.x >= joystick.x && dragStart.x <= joystick.right
			&& dragStart.y >= joystick.y && dragStart.y <= joystick.bottom) {
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
				y: yDiff
			}
		}

		return undefined;
	}

	/**
	 * @param {Pair} p1
	 * @param {Pair} p2
	 * */
	function dist(p1, p2) {
		const xDiff = p1.x - p2.x;
		const yDiff = p1.y - p2.y;
		return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
	}

	function drawJoystick() {
		const { radius, center, innerRadius } = getJoystickInitialConfiguration();


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
			y: center.y + yperc * draggableMax
		};
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
}

init();
