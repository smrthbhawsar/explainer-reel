/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
// PNG frames (lossless) + low CRF keep the @60secstack watermark and small text razor-sharp.
Config.setVideoImageFormat("png");
Config.setCrf(14);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// WebGL (3D reels via @remotion/three) needs a GPU-backed GL in headless Chrome on Windows.
Config.setChromiumOpenGlRenderer("angle");
