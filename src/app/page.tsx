import Link from "next/link";
import type { NextPage } from "next";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#011626] text-[#f1f2f3] flex flex-col font-sans">
      {/* Header */}
      <header className="h-12 border-b border-[#1d417c] bg-[#022540] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#9cb2d7] rounded-md flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#011626]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
          </div>
          <span className="font-bold tracking-tight">Best Take</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <Badge
          variant="primary"
          className="mb-6 bg-[#9cb2d7]/10 border-[#9cb2d7]/20 text-[#9cb2d7]"
        >
          Beta v0.1
        </Badge>

        <h1 className="text-5xl font-black tracking-tightest mb-6 text-center">
          Speech-based Video Editing
        </h1>

        <p className="text-lg text-[#9cb2d7] max-w-2xl text-center mb-12">
          Edit video by editing text. Upload your video, transcribe it
          automatically, and cut unwanted words or silence with a click.
        </p>

        <Link href="/editor">
          <Button size="lg" className="px-10">
            Open Editor
          </Button>
        </Link>
      </main>
    </div>
  );
};

export default Home;
