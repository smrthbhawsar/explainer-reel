import React from "react";
import { Composition } from "remotion";
import { RagReel, DURATION as RAG_DURATION } from "./reels/RagReel";
import { McpReel, DURATION as MCP_DURATION } from "./reels/McpReel";
import { UpiReel, DURATION as UPI_DURATION } from "./reels/UpiReel";
import { LookTest, LOOK_TEST_DURATION } from "./kit/three/LookTest";
import { Proto3DReel, DURATION as PROTO3D_DURATION } from "./reels/Proto3DReel";
import { FastagReel, DURATION as FASTAG_DURATION } from "./reels/FastagReel";
import { ScamDetectionReel, DURATION as SCAM_DURATION } from "./reels/ScamDetectionReel";
import { DrsHawkeyeReel, DURATION as DRS_DURATION } from "./reels/DrsHawkeyeReel";
import { Rag3DReel, DURATION as RAG3D_DURATION } from "./reels/Rag3DReel";
import { UltraEdgeReel, DURATION as ULTRAEDGE_DURATION } from "./reels/UltraEdgeReel";
import { OutroPreview, OUTRO_DURATION } from "./kit/Outro";
import { calculateSfxTrackMetadata, SfxTrack } from "./kit/SfxTrack";
import { CoverSpec, GridPreview, gridPreviewHeight, ReelCover, ReelCoverGrid } from "./kit/ReelCover";
import COVERS from "./reels/covers.json";

const COVER_ITEMS = COVERS.order.map((slug) => ({
  slug,
  spec: (COVERS.covers as Record<string, CoverSpec>)[slug],
}));

// Every reel is 1080x1920 @30fps; only the component and length differ.
const REEL = { fps: 30, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RagReel"
        component={RagReel}
        durationInFrames={RAG_DURATION}
        {...REEL}
      />
      <Composition
        id="McpReel"
        component={McpReel}
        durationInFrames={MCP_DURATION}
        {...REEL}
      />
      <Composition
        id="UpiReel"
        component={UpiReel}
        durationInFrames={UPI_DURATION}
        {...REEL}
      />
      <Composition
        id="Proto3DReel"
        component={Proto3DReel}
        durationInFrames={PROTO3D_DURATION}
        {...REEL}
      />
      {/* 3D look sampler (hinglish-3d-reel skill): one per look. */}
      {(["clay", "neon", "studio", "tactical"] as const).map((look) => (
        <Composition
          key={look}
          id={`LookTest-${look}`}
          component={LookTest}
          durationInFrames={LOOK_TEST_DURATION}
          defaultProps={{ look }}
          {...REEL}
        />
      ))}
      <Composition
        id="FastagReel"
        component={FastagReel}
        durationInFrames={FASTAG_DURATION}
        {...REEL}
      />
      <Composition id="ScamDetectionReel" component={ScamDetectionReel} durationInFrames={SCAM_DURATION} {...REEL} />
      <Composition id="DrsHawkeyeReel" component={DrsHawkeyeReel} durationInFrames={DRS_DURATION} {...REEL} />
      <Composition id="Rag3DReel" component={Rag3DReel} durationInFrames={RAG3D_DURATION} {...REEL} />
      <Composition id="UltraEdgeReel" component={UltraEdgeReel} durationInFrames={ULTRAEDGE_DURATION} {...REEL} />
      {/* Brand end card preview (src/kit/Outro.tsx). */}
      <Composition id="OutroPreview" component={OutroPreview} durationInFrames={OUTRO_DURATION} {...REEL} />
      {/* SFX-only audio track, mixed onto existing renders (src/kit/SfxTrack.tsx). */}
      <Composition id="SfxTrack" component={SfxTrack} durationInFrames={1} calculateMetadata={calculateSfxTrackMetadata} defaultProps={{ reel: "fastag" as const, speed: 1 }} {...REEL} />
      {/* Instagram publish kit (scripts/publish-kit.cjs): cover, grid crop, profile grid preview. */}
      {COVER_ITEMS.map(({ slug, spec }) => (
        <React.Fragment key={slug}>
          <Composition id={`Cover-${slug}`} component={ReelCover} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ slug, spec }} />
          <Composition id={`CoverGrid-${slug}`} component={ReelCoverGrid} durationInFrames={1} fps={30} width={1080} height={1440} defaultProps={{ slug, spec }} />
        </React.Fragment>
      ))}
      <Composition id="GridPreview" component={GridPreview} durationInFrames={1} fps={30} width={1080} height={gridPreviewHeight(COVER_ITEMS.length)} defaultProps={{ items: COVER_ITEMS }} />
      {/* New reels from the hinglish-explainer-reel skill are registered here. */}
    </>
  );
};
