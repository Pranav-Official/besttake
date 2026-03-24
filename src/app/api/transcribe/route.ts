import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/**
 * Video transcription endpoint (POST /api/transcribe)
 * Calls a Python script (using Whisper) to generate word-level timestamps for a video.
 * Caches the result in a .json file next to the video.
 *
 * Body:
 * - videoSrc: string (Path to the video file in public/uploads, e.g., "/uploads/file.mp4")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoSrc } = body;

    if (!videoSrc) {
      return NextResponse.json({ error: "Missing videoSrc" }, { status: 400 });
    }

    // Resolve path: /uploads/... is inside public/uploads/...
    const absoluteVideoPath = path.join(process.cwd(), "public", videoSrc);
    const transcriptionCachePath = `${absoluteVideoPath}.json`;

    if (!fs.existsSync(absoluteVideoPath)) {
      return NextResponse.json(
        { error: `File not found at ${absoluteVideoPath}` },
        { status: 404 },
      );
    }

    // 1. Check if transcription is already cached
    if (fs.existsSync(transcriptionCachePath)) {
      try {
        const cachedData = await fs.promises.readFile(
          transcriptionCachePath,
          "utf-8",
        );
        return NextResponse.json(JSON.parse(cachedData));
      } catch (err) {
        console.error("Failed to read transcription cache:", err);
        // Fall through to run transcription if cache is invalid
      }
    }

    // 2. Call the Python script in the background
    const pythonInterpreter =
      process.platform === "win32"
        ? path.join(process.cwd(), "venv", "Scripts", "python.exe")
        : path.join(process.cwd(), "venv", "bin", "python");
    const runnerScript = path.join(
      process.cwd(),
      "src",
      "runner",
      "transcribe.py",
    );

    return new Promise((resolve) => {
      console.log(`Starting transcription for ${videoSrc}...`);
      const pyProcess = spawn(pythonInterpreter, [
        runnerScript,
        absoluteVideoPath,
      ]);

      let stdout = "";
      let stderr = "";

      pyProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pyProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pyProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error(`Transcription failed with code ${code}:`);
          console.error("stdout:", stdout);
          console.error("stderr:", stderr);
          resolve(
            NextResponse.json(
              { error: "Transcription failed", details: stderr || stdout },
              { status: 500 },
            ),
          );
        } else {
          try {
            const transcription = JSON.parse(stdout);

            // 3. Save to cache
            try {
              await fs.promises.writeFile(
                transcriptionCachePath,
                JSON.stringify(transcription, null, 2),
                "utf-8",
              );
            } catch (cacheErr) {
              console.error("Failed to save transcription cache:", cacheErr);
            }

            resolve(NextResponse.json(transcription));
          } catch {
            console.error("Failed to parse transcription output:", stdout);
            resolve(
              NextResponse.json(
                { error: "Invalid JSON from transcription", details: stdout },
                { status: 500 },
              ),
            );
          }
        }
      });
    });
  } catch (error) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { error: "Failed to process transcription" },
      { status: 500 },
    );
  }
}
