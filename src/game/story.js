// STORY MODE data — a sequence of missions. Beat one to unlock the next.
//
// Each mission:
//   id       unique key
//   title    shown on the mission-select card
//   player   fighter id you control
//   foe      fighter id you fight
//   stage    stage id
//   dialogue pre-battle exchange (2-4 lines recommended). Each line:
//     { who:'player'|'foe', text:'...' }
//   sprites  OPTIONAL big cutscene sprites (different from in-game portraits):
//     public/story/<file>.png  — falls back to portraits/<id>.png, then a badge.
//
// Character ids: nitish, krish, aarush, zain, disha
export const MISSIONS = [
  {
    id:'m1', title:'Chapter 1 — The Challenger', player:'nitish', foe:'krish', stage:'wasteland',
    playerSprite:'nitish_story.png', foeSprite:'krish_story.png',
    dialogue:[
      { who:'foe',    text:"So you're the one they keep talking about. Hmph." },
      { who:'player', text:"Word travels fast. Are you here to test me?" },
      { who:'foe',    text:"I'm here to end you. Don't disappoint me." },
      { who:'player', text:"Then stop talking and show me what you've got!" },
    ],
  },
  {
    id:'m2', title:'Chapter 2 — Blinding Speed', player:'nitish', foe:'aarush', stage:'island',
    playerSprite:'nitish_story.png', foeSprite:'aarush_story.png',
    dialogue:[
      { who:'player', text:"You again. I heard nobody can lay a finger on you." },
      { who:'foe',    text:"You won't be the first to try and fail." },
      { who:'foe',    text:"Blink and you'll miss it." },
    ],
  },
  {
    id:'m3', title:'Chapter 3 — The Tactician', player:'nitish', foe:'zain', stage:'lava',
    playerSprite:'nitish_story.png', foeSprite:'zain_story.png',
    dialogue:[
      { who:'foe',    text:"Every move you make, I've already seen it." },
      { who:'player', text:"Reading me won't help if you can't keep up." },
      { who:'foe',    text:"We'll see about that. Checkmate is coming." },
    ],
  },
  {
    id:'m4', title:'Chapter 4 — Final Stand', player:'nitish', foe:'disha', stage:'wasteland',
    playerSprite:'nitish_story.png', foeSprite:'disha_story.png',
    dialogue:[
      { who:'foe',    text:"You've come far. But this is where it ends." },
      { who:'player', text:"I didn't come this far to lose now." },
      { who:'foe',    text:"Then give me everything. I'll turn it all back on you!" },
      { who:'player', text:"Let's finish this!" },
    ],
  },
];
