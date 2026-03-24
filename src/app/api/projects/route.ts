import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { Project } from "../../../types/constants";

const PROJECTS_DIR = path.join(process.cwd(), "public", "projects");

/**
 * List all projects (GET /api/projects)
 */
export async function GET() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    const files = await fs.readdir(PROJECTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const projects = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(PROJECTS_DIR, file);
        const content = await fs.readFile(filePath, "utf-8");
        const project = JSON.parse(content) as Project;
        return {
          id: project.id,
          name: project.name,
          lastModified: project.lastModified,
        };
      }),
    );

    // Sort by last modified descending
    projects.sort((a, b) => b.lastModified - a.lastModified);

    return NextResponse.json(projects);
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 },
    );
  }
}

/**
 * Save/Update project (POST /api/projects)
 */
export async function POST(request: NextRequest) {
  try {
    const project = (await request.json()) as Project;

    if (!project.id || !project.name) {
      return NextResponse.json(
        { error: "Missing project ID or name" },
        { status: 400 },
      );
    }

    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    const filePath = path.join(PROJECTS_DIR, `${project.id}.json`);

    // Update last modified
    project.lastModified = Date.now();

    await fs.writeFile(filePath, JSON.stringify(project, null, 2));

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Save project error:", error);
    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 },
    );
  }
}
