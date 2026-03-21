import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Library API (GET /api/library)
 * Lists all video files in the public/uploads directory.
 */
export async function GET() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      return NextResponse.json([]);
    }

    const files = await fs.promises.readdir(UPLOADS_DIR);

    // List of video files only (exclude transcription .json files)
    const videoFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".mp4", ".mov", ".webm", ".avi", ".mkv"].includes(ext);
    });

    const libraryItems = await Promise.all(
      videoFiles.map(async (file) => {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = await fs.promises.stat(filePath);

        return {
          id: file, // Using filename as ID for simplicity
          name: file.replace(/^\d+-/, ""), // Remove timestamp prefix for display
          filename: file,
          url: `/uploads/${file}`,
          size: stats.size,
          mtime: stats.mtime,
          hasTranscription: fs.existsSync(`${filePath}.json`),
        };
      }),
    );

    // Sort by most recent
    libraryItems.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return NextResponse.json(libraryItems);
  } catch (error) {
    console.error("Library GET error:", error);
    return NextResponse.json({ error: "Failed to list library" }, { status: 500 });
  }
}

/**
 * Delete Library Item (DELETE /api/library?filename=...)
 * Deletes the video file and its associated transcription JSON.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const videoPath = path.join(UPLOADS_DIR, filename);
    const transcriptionPath = `${videoPath}.json`;

    if (fs.existsSync(videoPath)) {
      await fs.promises.unlink(videoPath);
    }

    if (fs.existsSync(transcriptionPath)) {
      await fs.promises.unlink(transcriptionPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Library DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
