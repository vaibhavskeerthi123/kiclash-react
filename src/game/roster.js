// Original characters — not based on any existing franchise.
//
// modelAdjust lets you fix imported GLB/FBX models without editing code logic:
//   rotX/rotY/rotZ : extra rotation in radians (use rotX:-Math.PI/2 if a model lies flat / is Z-up)
//   scale          : multiply the auto-fit size (1 = auto height of ~2.5 units)
//   yOffset        : nudge up/down after grounding
//   autoStand      : if true, auto-detect a lying-down model and stand it up (default true)
export const ROSTER = [
  {
    id: "nitish",
    name: "NITISH",
    arch: "Balanced Rushdown",
    hair: "spiky",
    body: [1.0, 0.62, 0.18],
    ki: [1.0, 0.85, 0.2],
    rim: [1.0, 0.7, 0.2],
    hp: 1000,
    speed: 7.2,
    atk: 1.0,
    def: 1.0,
    kiRegen: 14,
    modelAdjust: {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1,
      yOffset: 0,
      autoStand: true,
    },
    // renderStyle: 'textured' keeps the model's own textures (recommended for your GLBs).
    // 'cel' replaces them with a flat anime tint. outline:true adds an ink edge.
    renderStyle: "textured",
    outline: true,
    intro: {
      lines: [
        "So you want to test your strength?",
        "Then come at me with everything!",
      ],
      pose: "charge",
    },
    trans: {
      name: "ASCENDED",
      body: [1.0, 0.85, 0.25],
      ki: [1.0, 0.95, 0.4],
      rim: [1.0, 0.9, 0.3],
    },
  },
  {
    id: "krish",
    name: "KRISH",
    arch: "Power Bruiser",
    hair: "mane",
    body: [0.55, 0.18, 0.55],
    ki: [0.4, 0.6, 1.0],
    rim: [0.45, 0.7, 1.0],
    hp: 1180,
    speed: 5.8,
    atk: 1.22,
    def: 1.16,
    kiRegen: 11,
    modelAdjust: {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1,
      yOffset: 0,
      autoStand: true,
    },
    renderStyle: "textured",
    outline: true,
    intro: {
      lines: [
        "You stand before a wall of muscle.",
        "I will break you in half!",
      ],
      pose: "charge",
    },
    trans: {
      name: "OVERDRIVE",
      body: [0.7, 0.25, 0.7],
      ki: [0.5, 0.75, 1.0],
      rim: [0.55, 0.85, 1.0],
    },
  },
  {
    id: "aarush",
    name: "AARUSH",
    arch: "Speed Striker",
    hair: "flat",
    body: [0.2, 0.55, 0.62],
    ki: [0.3, 1.0, 0.85],
    rim: [0.4, 1.0, 0.8],
    hp: 900,
    speed: 8.4,
    atk: 0.92,
    def: 0.9,
    kiRegen: 17,
    modelAdjust: {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1,
      yOffset: 0,
      autoStand: true,
    },
    renderStyle: "textured",
    outline: true,
    intro: {
      lines: ["You won't even see me move.", "This ends in a flash!"],
      pose: "charge",
    },
    trans: {
      name: "FLASH STEP",
      body: [0.3, 0.75, 0.82],
      ki: [0.5, 1.0, 0.95],
      rim: [0.5, 1.0, 0.9],
    },
  },
  {
    id: "zain",
    name: "ZAIN",
    arch: "Zoner Tactician",
    hair: "spiky",
    body: [0.35, 0.3, 0.7],
    ki: [0.6, 0.4, 1.0],
    rim: [0.7, 0.5, 1.0],
    hp: 960,
    speed: 7.0,
    atk: 1.02,
    def: 0.98,
    kiRegen: 18,
    modelAdjust: {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1,
      yOffset: -1.3,
      autoStand: true,
    },
    renderStyle: "textured",
    outline: true,
    intro: {
      lines: ["Every move you make, I have already read.", "Checkmate."],
      pose: "charge",
    },
    trans: {
      name: "MINDBREAK",
      body: [0.55, 0.4, 1.0],
      ki: [0.7, 0.55, 1.0],
      rim: [0.8, 0.6, 1.0],
    },
  },
  {
    id: "disha",
    name: "DISHA",
    arch: "Technical Counter",
    hair: "flat",
    body: [0.85, 0.25, 0.45],
    ki: [1.0, 0.4, 0.6],
    rim: [1.0, 0.5, 0.65],
    hp: 980,
    speed: 7.6,
    atk: 0.98,
    def: 1.06,
    kiRegen: 15,
    modelAdjust: {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1,
      yOffset: 0,
      autoStand: true,
    },
    renderStyle: "textured",
    outline: true,
    intro: {
      lines: [
        "Come on then. Show me what you have.",
        "I will turn it right back on you.",
      ],
      pose: "charge",
    },
    trans: {
      name: "RIPOSTE",
      body: [1.0, 0.4, 0.6],
      ki: [1.0, 0.55, 0.7],
      rim: [1.0, 0.6, 0.75],
    },
  },
];

// STAGES. For a CUSTOM uploaded stage (public/stages/<id>.glb), the optional
// `adjust` controls where the fighters stand relative to the model:
//   floor:   'bottom' (default) drops the model's lowest point to the floor so
//            fighters stand INSIDE it; 'top' puts them on top of the model.
//   floorY:  fine nudge up(+)/down(-) in world units to place fighters exactly
//            on the arena floor of your model.
//   spread:  how wide the stage scales around the fighters (default 120).
//   offsetX/offsetZ: slide the whole stage model sideways/forward.
// Tweak these until the fighters are standing in the right spot of your model.
export const STAGES = [
  {
    id: "wasteland",
    label: "WASTELAND",
    // Tuned for a custom model with a small house INTERIOR. Adjust these numbers
    // to place the fighters exactly in the room:
    //   spread  : LOWER = the model is scaled larger around the fighters (zoom in)
    //   floorY  : raise(+)/lower(-) fighters onto the room's floor
    //   offsetX/Z: slide the model so the interior is centered on the fighters
    //   bounds  : how far fighters can walk left/right (keeps them inside the room)
    adjust: {
      floor: "bottom",
      floorY: -27.2,
      spread: 120,
      offsetX: -3,
      offsetZ: -5,
      bounds: 14,
    },
  },
  {
    id: "lava",
    label: "LAVA WORLD",
    adjust: { floor: "bottom", floorY: 0, spread: 120 },
  },
  {
    id: "island",
    label: "GRASSY ISLE",
    adjust: { floor: "bottom", floorY: 0, spread: 120 },
  },
];

// Attack frame data (seconds). Medium combo system with launchers + air combos.
export const ATTACKS = {
  L1: {
    startup: 0.05,
    active: 0.07,
    recovery: 0.12,
    dmg: 30,
    stun: 0.2,
    kb: 2.2,
    kiGain: 6,
    reach: 1.6,
    next: "L2",
  },
  L2: {
    startup: 0.05,
    active: 0.07,
    recovery: 0.12,
    dmg: 34,
    stun: 0.2,
    kb: 2.4,
    kiGain: 6,
    reach: 1.6,
    next: "L3",
  },
  L3: {
    startup: 0.07,
    active: 0.08,
    recovery: 0.2,
    dmg: 46,
    stun: 0.3,
    kb: 3,
    kiGain: 8,
    reach: 1.7,
    launch: true,
    next: null,
  },
  H: {
    startup: 0.15,
    active: 0.1,
    recovery: 0.3,
    dmg: 80,
    stun: 0.42,
    kb: 9,
    kiGain: 10,
    reach: 1.8,
    launch: true,
  },
  AIR_L: {
    startup: 0.05,
    active: 0.08,
    recovery: 0.14,
    dmg: 32,
    stun: 0.25,
    kb: 2.5,
    kiGain: 6,
    reach: 1.6,
    air: true,
    next: "AIR_L2",
  },
  AIR_L2: {
    startup: 0.05,
    active: 0.08,
    recovery: 0.14,
    dmg: 36,
    stun: 0.25,
    kb: 2.8,
    kiGain: 6,
    reach: 1.6,
    air: true,
    next: "AIR_H",
  },
  AIR_H: {
    startup: 0.1,
    active: 0.1,
    recovery: 0.22,
    dmg: 70,
    stun: 0.4,
    kb: 11,
    kiGain: 10,
    reach: 1.7,
    air: true,
    spike: true,
  },
};

export const ST = {
  IDLE: 0,
  WALK: 1,
  DASH: 2,
  JUMP: 3,
  ATK: 4,
  BLOCK: 5,
  STAGGER: 6,
  KNOCK: 7,
  CHARGE: 8,
  SPECIAL: 9,
  DEAD: 10,
  AIR_ATK: 11,
};
