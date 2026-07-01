HOW TO ADD MIXAMO ANIMATIONS (so your fighters punch, kick, etc.)
==================================================================

Character ids are now:  nitish, krish, aarush, zain, disha
(these replaced sora, rygar, vela — rename your model/animation folders to match)

STEP 1 — Get animations from Mixamo (https://www.mixamo.com, free)
  Upload your rigged model, pick an animation, and DOWNLOAD with:
     Format: FBX Binary (.fbx)
     Skin:   "Without Skin"
     FPS:    30

STEP 2 — Put each animation in the character's _anims folder, named by ACTION.
  public/models/<id>_anims/<action>.fbx

  Each MOVE HAS ITS OWN SEPARATE ANIMATION FILE. Use these exact names:
     idle.fbx       standing
     walk.fbx       moving left/right
     punch.fbx      light attack (J)
     kick.fbx       heavy attack (K)
     jump.fbx       jump
     block.fbx      guarding (I)
     charge.fbx     powering up (U)
     hit.fbx        getting hit / stagger
     death.fbx      knocked out
     kiblast.fbx    KI BLAST (L)          <-- separate from ultimate now
     ultimate.fbx   ULTIMATE / super (P)  <-- separate from ki blast now
     rush.fbx       rush attack (O)  (optional; falls back to punch)
     dash.fbx       air dash         (optional; falls back to run/walk)

  IMPORTANT: kiblast and ultimate are now DIFFERENT animations (previously both
  were "cast"). Download two different Mixamo animations — e.g. a quick energy
  throw for kiblast.fbx, and a big charged beam/finisher for ultimate.fbx.

  Example for Nitish:
     public/models/nitish_anims/idle.fbx
     public/models/nitish_anims/punch.fbx
     public/models/nitish_anims/kiblast.fbx
     public/models/nitish_anims/ultimate.fbx
     ...

  You don't need all of them — missing ones fall back to a sensible alternative
  (kick->punch, charge->idle, ultimate->kiblast->cast, etc.).

STEP 3 — models go at public/models/<id>.glb (or .fbx). Run: npm run dev
  Press F during a battle to see which clips loaded and bound to the bones.

REQUIREMENT: the animation FBX must share the SAME skeleton (bone names) as the
model. Rig the model on Mixamo and download its animations from Mixamo so the
bone names match automatically. If the F-panel shows "0/NN" tracks bound, the
animation came from a different skeleton than the model.
