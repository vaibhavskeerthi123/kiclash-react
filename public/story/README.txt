STORY-MODE DIALOGUE SPRITES (placeholders — swap freely)
========================================================
Large character images shown facing each other during pre-battle dialogue.
These are SEPARATE from the small in-game portraits, so you can use dramatic
full-body / bust art here. Referenced by filename in src/game/story.js:

  public/story/nitish_story.png
  public/story/krish_story.png
  public/story/aarush_story.png
  public/story/zain_story.png
  public/story/disha_story.png

Transparent-background PNGs look best (they sit over the battle scene).
Tall portrait images (e.g. 600x900) work well.

Fallback order if a file is missing:
  story/<file>.png  ->  portraits/<id>.png  ->  colored badge with initial

To edit the conversations, open src/game/story.js and change each mission's
`dialogue` array (2-4 lines recommended). Each line is:
  { who:'player', text:'...' }   or   { who:'foe', text:'...' }
