import { getSilentParts } from "@remotion/renderer";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoSrc,
      noiseThresholdInDecibels = -20,
      minDurationInSeconds = 0.5,
    } = body;

    if (!videoSrc) {
      return NextResponse.json(
        { error: "Missing video source" },
        { status: 400 },
      );
    }

    // Resolve absolute path to the video file
    // videoSrc is expected to be like "/uploads/filename.mp4"
    const publicDir = path.join(process.cwd(), "public");
    const absolutePath = path.join(publicDir, videoSrc);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: `Video file not found: ${videoSrc}` },
        { status: 404 },
      );
    }

    // Call Remotion's silence detection
    // Note: getSilentParts requires an absolute path
    const { silentParts, audibleParts, durationInSeconds } =
      await getSilentParts({
        src: absolutePath,
        noiseThresholdInDecibels,
        minDurationInSeconds,
      });

    return NextResponse.json({
      silentParts,
      audibleParts,
      durationInSeconds,
    });
  } catch (error) {
    console.error("Silence detection error:", error);
    return NextResponse.json(
      { error: "Silence detection failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}
