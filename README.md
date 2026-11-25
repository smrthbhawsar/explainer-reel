# Explainer Reels

Vertical (1080x1920, 30fps) Hinglish tech-explainer reels built with [Remotion](https://remotion.dev):
dark-mode motion graphics, a voiceover, and word-synced captions.

## Make a new reel

In Claude Code, run `/hinglish-explainer-reel` (or ask "make a reel about <topic>"). It will:

1. ask for the topic,
2. write an ElevenLabs-ready Hinglish voiceover script,
3. ask for the generated MP3,
4. align captions to the audio, build the scenes, and render the video.

## Layout

| Path | Contents |
|---|---|
| `public/<slug>/` | `script.txt`, `voiceover.mp3`, `captions.json`, `captions.srt` |
| `src/reels/` | one composition per reel (`RagReel.tsx`, `McpReel.tsx`, …) |
| `src/kit/` | shared, topic-neutral UI kit, captions component, timing helpers |
| `src/Root.tsx` | registers every reel |
| `renders/` | **final videos** (`<slug>.mp4`) — git-ignored |
| `out/stills/<slug>/` | preview stills — scratch, git-ignored |

## Commands

```console
npm i                                         # install
npm run dev                                   # Remotion Studio preview
npm run align -- --script public/<slug>/script.txt --audio public/<slug>/voiceover.mp3 --out public/<slug>
npm run still -- <ReelId> <slug> 300 900      # stills -> out/stills/<slug>/
npm run render -- <ReelId> <slug>             # video  -> renders/<slug>.mp4
```
