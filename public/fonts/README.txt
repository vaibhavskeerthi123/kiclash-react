TITLE FONT — Emotions Condensed
===============================
Drop the font file in THIS folder. The CSS accepts any of these names, so you
don't have to rename if it matches one of them:
  EmotionsCondensed.ttf          <- simplest, recommended
  EmotionsCondensed.otf
  EmotionsCondensed.woff2
  Emotions Condensed.ttf         (with a space)
  Emotions-Condensed.ttf
  emotions-condensed.ttf
  EmotionsCondensed-Regular.ttf
  Emotions_Condensed.ttf

EASIEST: rename your file to exactly  EmotionsCondensed.ttf

After adding it, HARD-REFRESH the browser (Ctrl+Shift+R). Fonts are cached
aggressively, so a normal refresh may keep showing the fallback.

To verify it loaded: open DevTools -> Network tab -> filter "Font" -> refresh.
You should see the file load with status 200 (not 404).

If the file is missing/misnamed, the title falls back to a similar bold
condensed font automatically (so it still looks fine).
