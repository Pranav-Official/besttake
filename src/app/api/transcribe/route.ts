import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoSrc } = body;

    if (!videoSrc) {
      return NextResponse.json({ error: "Missing videoSrc" }, { status: 400 });
    }

    // Resolve path: /uploads/... is inside public/uploads/...
    const absoluteVideoPath = path.join(process.cwd(), "public", videoSrc);

    if (!fs.existsSync(absoluteVideoPath)) {
      return NextResponse.json(
        { error: `File not found at ${absoluteVideoPath}` },
        { status: 404 },
      );
    }

    // Call the Python script in the background
    const pythonInterpreter = path.join(
      process.cwd(),
      "venv",
      "Scripts",
      "python.exe",
    );
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

      pyProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`Transcription failed with code ${code}: ${stderr}`);
          resolve(
            NextResponse.json(
              { error: "Transcription failed", details: stderr },
              { status: 500 },
            ),
          );
        } else {
          try {
            const transcription = JSON.parse(stdout);
            resolve(NextResponse.json(transcription));
          } catch (err) {
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
