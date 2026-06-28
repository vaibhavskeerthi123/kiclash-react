DROP YOUR STAGE MODELS HERE
===========================
Name files to match a stage id and they auto-load on `npm run dev`:

  public/stages/wasteland.glb   -> replaces the WASTELAND stage
  public/stages/lava.glb        -> replaces the LAVA WORLD stage
  public/stages/island.glb      -> replaces the GRASSY ISLE stage

GLB preferred. FBX also works.
The stage is auto-scaled to ~120 units across and its top surface is placed at
ground level (where fighters stand). Fighters move roughly x = -46..46.
If your stage sits too high/low, scale it in Blender or tell me and I'll add a
per-stage offset control.
