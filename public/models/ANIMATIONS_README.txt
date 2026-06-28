HOW TO ADD MIXAMO ANIMATIONS (so your fighters punch, kick, etc.)
==================================================================

Your models currently stand in a T-pose because they are RIGGED (have a
skeleton) but have NO animation clips. Here is how to give them animations
for free using Mixamo.

STEP 1 — Rig & collect animations on Mixamo
  1. Go to https://www.mixamo.com (free Adobe account).
  2. Upload your character model (or pick one of theirs).
  3. Choose an animation (e.g. "Punching", "Roundhouse Kick", "Idle",
     "Walking", "Jump", "Hit Reaction", "Knockdown").
  4. Click DOWNLOAD with these settings:
       Format: FBX Binary (.fbx)
       Skin:   "Without Skin"     <-- IMPORTANT (animation only, smaller file)
       Frames per Second: 30
  5. Repeat for each animation you want.

STEP 2 — Name the files and drop them in a folder per fighter
  Create a folder:  public/models/<fighterId>_anims/
  (fighter ids are: sora, rygar, vela)

  Rename each download to the ACTION it represents:
     public/models/sora_anims/idle.fbx
     public/models/sora_anims/walk.fbx
     public/models/sora_anims/punch.fbx
     public/models/sora_anims/kick.fbx
     public/models/sora_anims/jump.fbx
     public/models/sora_anims/block.fbx
     public/models/sora_anims/charge.fbx
     public/models/sora_anims/hit.fbx        (stagger)
     public/models/sora_anims/death.fbx
     public/models/sora_anims/cast.fbx       (used for ki blast / ultimate)

  You don't need all of them — load what you have. Missing ones fall back to
  a sensible alternative (e.g. kick falls back to punch, charge to idle).

STEP 3 — Run the game
  npm run dev
  The game auto-loads these clips and plays the right one per action:
     standing        -> idle
     moving          -> walk
     light attack J  -> punch
     heavy attack K  -> kick
     ki blast / ult  -> cast
     getting hit     -> hit
     KO              -> death

REQUIREMENT: the animation FBX must come from the SAME rigged character (same
skeleton / bone names) as the model in public/models/<id>.glb. If you rig your
own model on Mixamo and download both the model AND its animations from Mixamo,
the bone names match automatically.

NOTE: If a model has NO skeleton at all, no animation can be applied — it will
only do the simple whole-body lean/lunge motion. Rig it on Mixamo first.
