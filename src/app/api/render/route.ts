import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getRenderStore } from "../../../lib/render-store";

// Cache the bundle for faster subsequent renders
let cachedBundle: string | null = null;

/**
 * Status check endpoint (GET /api/render?id=...)
 * Returns the current progress and status of a local render.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "No ID provided" }, { status: 400 });

  const store = getRenderStore();
  const status = store.get(id);

  if (!status) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }

  return NextResponse.json(status);
}

/**
 * Start render endpoint (POST /api/render)
 * Initiates a local video render using Remotion's bundle and renderMedia.
 * The render runs in the background and updates a local store for polling.
 *
 * Body:
 * - videoSrc: string (Path to the video file in public/uploads)
 * - clips: Clip[] (Array of clip definitions)
 * - dimensions: { width: number, height: number } (Target output resolution)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoSrc, clips, sourceFiles } = body;

    if (!clips) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const renderId = `render-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const store = getRenderStore();
    store.set(renderId, {
      progress: 0,
      status: "Starting bundle...",
      url: null,
      error: null,
      done: false,
    });

    // We respond with the renderId immediately and run the render in the background
    // This allows the frontend to start polling for progress.
    (async () => {
      try {
        // 1. Prepare Paths
        const entry = path.join(process.cwd(), "src", "remotion", "index.ts");
        const outputDir = path.join(process.cwd(), "public", "renders");
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFilename = `${renderId}.mp4`;
        const outputPath = path.join(outputDir, outputFilename);

        // 2. Bundle (using cache if available)
        if (!cachedBundle) {
          store.set(renderId, {
            ...store.get(renderId)!,
            status: "Bundling Remotion project...",
          });
          cachedBundle = await bundle({
            entryPoint: entry,
            webpackOverride: (config) => config,
          });
        }

        // 3. Setup Props
        const inputProps = {
          videoSrc,
          sourceFiles,
          clips,
          title: "Exported Video",
        };

        const compositionId = "MyComp";

        // 4. Select Composition
        store.set(renderId, {
          ...store.get(renderId)!,
          status: "Selecting composition...",
        });
        const composition = await selectComposition({
          serveUrl: cachedBundle,
          id: compositionId,
          inputProps,
        });

        // 5. Render
        store.set(renderId, {
          ...store.get(renderId)!,
          status: "Rendering frames...",
        });
        await renderMedia({
          composition,
          serveUrl: cachedBundle,
          codec: "h264",
          outputLocation: outputPath,
          inputProps,
          concurrency: 4, // Balanced for stability and speed with OffthreadVideo
          onProgress: ({ progress }) => {
            store.set(renderId, {
              ...store.get(renderId)!,
              progress,
              status: `Rendering frames (${Math.round(progress * 100)}%)...`,
            });
          },
        });

        // Done
        store.set(renderId, {
          progress: 1,
          status: "Complete!",
          url: `/renders/${outputFilename}`,
          error: null,
          done: true,
        });
      } catch (err) {
        console.error("Async render error:", err);
        store.set(renderId, {
          ...store.get(renderId)!,
          done: true,
          error: (err as Error).message,
        });
      }
    })();

    return NextResponse.json({ id: renderId });
  } catch (error) {
    console.error("Render initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate render" },
      { status: 500 },
    );
  }
}
