# Publish kit: Instagram (cover, grid, caption, hashtags) + YouTube Shorts (title, description)

Every rendered reel ships with a publish kit. It's built after the final MP4 is rendered and
checked. Both skills (2D and 3D) use this.

| Output | Path | Use |
|---|---|---|
| Reel cover, 1080x1920 | `renders/<slug>/cover.png` | Upload as the reel's cover ("Edit cover → Add from camera roll") |
| Grid crop, 1080x1440 | `renders/<slug>/grid.png` | What the 3:4 profile grid shows of the cover (for checking) |
| Profile grid preview | `renders/grid-preview.png` | All reels in posting order, newest first, as the profile will look |
| Instagram caption + hashtags | `renders/<slug>/caption.txt` | Paste as the post caption |
| YouTube Shorts title + description | `renders/<slug>/youtube.txt` | Paste into the Short's title and description |

## 1. Add the cover entry

Add `<slug>` to `src/reels/covers.json`: append it to `"order"` (the posting order; ask the user if
it should go somewhere else) and add an entry under `"covers"`:

```json
"<slug>": {
  "reelId": "<ReelId>",
  "frame": 1680,
  "series": "HOW IT WORKS",
  "title": ["Paise kat gaye,", "phir bhi {PENDING}?"],
  "sub": "UPI · NPCI · Idempotency",
  "accent": "#F59E0B",
  "crop": { "y": 200, "h": 760, "scale": 1 }
}
```

- **series:** `HOW IT WORKS` for everyday tech (payments, devices, apps people use); `AI ARCHITECTURE`
  or `SYSTEM DESIGN` for developer topics. It should match the reel's header label family.
- **title:** the hook as a question or paradox, in Hinglish. **Exactly 2 lines of ≤ 17 characters
  each** (longer lines auto-shrink, but short and big reads best in the grid). Wrap one word in
  `{}` for the accent colour: the word that creates the curiosity (PENDING, battery, nahi, haath).
  Don't just name the topic ("What is RAG") — tease the problem.
- **sub:** 2–3 key terms separated by ` · ` (the reel's keywords).
- **accent:** the hook's emotion. Amber `#F59E0B` warning, red `#EF4444` failure/problem, cyan
  `#38BDF8` neutral tech, purple `#A78BFA` AI, emerald `#10B981` solution. Neighbouring posts in
  the grid should differ.
- **frame:** the single most intriguing visual of the reel, usually the problem state from the
  hook (the PENDING badge, the hallucinated answer, the 100-connector mess). Pick it from a
  contact sheet: `ffmpeg -i renders/<slug>.mp4 -vf "fps=1/4,scale=216:384,tile=8x2" -frames:v 1 out/stills/sheets/<slug>.png`.
  Frame = seconds × 30. Avoid frames where the visual is still animating in.
- **crop:** which band of that frame (source y, height 760) shows in the cover's visual window.
  2D reels: content lives at y 190–1400, so start around y 170–250. 3D reels: y 260–520. Keep the
  reel's own header and captions out of the band.

## 2. Render

```bash
npm run publish-kit -- <slug>            # cover + grid crop for <slug>, then the grid preview
npm run publish-kit -- <slug> --refresh  # also re-render the cover visual after changing "frame"
```

Look at `renders/<slug>/cover.png` and `renders/grid-preview.png`. Check that the title is 2 lines
with no overlap, the visual is the right moment, and the grid tile reads at thumbnail size.

## 3. Write `renders/<slug>/caption.txt`

Hinglish, same "tum" voice as the script, roughly 600–900 characters:

1. **Line 1 = the hook,** reworded from the script (Instagram cuts the caption after ~125 characters,
   so the hook must land before "…more"). End with a question or emoji beat.
2. **3–5 short lines of value:** the mechanism in steps, one emoji bullet each. Facts must match
   the script exactly; no new claims.
3. **Payoff line:** the punchline or "Na …, na …" contrast.
4. **One engagement prompt:** pick one per reel and vary it across posts: save ("Save karo 📌 —
   interview mein kaam aayega"), share ("us dost ko bhejo jo…"), or comment ("Kaunsa … ? 👇").
5. **Follow line, always this:** `Follow @60secstack — har tech, sirf sixty seconds mein ⚡`
6. **Blank line, then exactly 5 hashtags** (Instagram's current limit). Mix: 1–2 topic tags
   (#UPI, #RAG), 1 category (#SystemDesign / #HowItWorks / #AIExplained), 1 broad
   (#TechExplained / #GenerativeAI), and always `#HinglishTech`.

## 4. Write `renders/<slug>/youtube.txt` (YouTube Shorts)

Same facts and voice as the Instagram caption, adapted for YouTube (search-driven, no Save button,
"Subscribe" not "Follow"). Format exactly:

```text
TITLE
<title>

DESCRIPTION
<description>
```

- **Title (≤ 70 characters, hard max 100):** the hook as a question with the **English search
  term people actually type**, plus one emoji. Dev topics: `<Topic> Explained in Hindi 🤖 <hook>`
  (e.g. "RAG Explained in Hindi 🤖 ChatGPT Tumhara Data Kyun Nahi Jaanta?"). Everyday topics:
  `<Search phrase>? <emoji> <hook>` (e.g. "UPI Payment Pending Kyun Hota Hai? 😬 Paise Kat Gaye Par Mile Nahi").
  Title Case.
- **Description:** start with the Instagram caption's hook and value bullets, then:
  - an engagement line that asks for a **comment or share** (no "Save karo"; Shorts has no save)
  - `Subscribe karo @60secstack — har tech, sirf sixty seconds mein ⚡`
  - a **keyword line:** 5–7 comma-separated English/Hinglish search phrases ("UPI payment pending,
    UPI kaise kaam karta hai, NPCI, …, Hinglish tech explained")
  - **exactly 3 hashtags**, `#shorts` first, then the topic tag and one category/broad tag
    (YouTube shows the first 3 above the title).

## 5. Report to the user

Give the paths (cover, grid, grid preview, caption.txt, youtube.txt) and show the cover and the
grid preview images. Paste the Instagram caption and the YouTube title in the reply so they can copy them.
