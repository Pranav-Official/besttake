import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { Project } from "../../../../types/constants";

const PROJECTS_DIR = path.join(process.cwd(), "public", "projects");

/**
 * Get project by ID (GET /api/projects/[id])
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const project = JSON.parse(content) as Project;
    return NextResponse.json(project);
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
}

/**
 * Delete project by ID (DELETE /api/projects/[id])
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
