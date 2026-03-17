import { WordTranscription } from "../../types/constants";

export const mockTranscription: WordTranscription[] = [
  { text: "This", start: 0, end: 0.5 },
  { text: "is", start: 0.5, end: 0.8 },
  { text: "a", start: 0.8, end: 1.0 },
  { text: "speech", start: 1.0, end: 1.5 },
  { text: "based", start: 1.5, end: 2.0 },
  { text: "text", start: 2.0, end: 2.5 },
  { text: "assisted", start: 2.5, end: 3.0 },
  { text: "video", start: 3.0, end: 3.5 },
  { text: "cutting", start: 3.5, end: 4.0 },
  { text: "editor", start: 4.0, end: 4.5 },
  { text: "where", start: 4.5, end: 5.0 },
  { text: "you", start: 5.0, end: 5.3 },
  { text: "can", start: 5.3, end: 5.6 },
  { text: "upload", start: 5.6, end: 6.0 },
  { text: "video", start: 6.0, end: 6.5 },
  { text: "and", start: 6.5, end: 6.8 },
  { text: "edit", start: 6.8, end: 7.2 },
  { text: "it", start: 7.2, end: 7.5 },
  { text: "directly", start: 7.5, end: 8.0 },
  { text: "from", start: 8.0, end: 8.4 },
  { text: "the", start: 8.4, end: 8.7 },
  { text: "transcribed", start: 8.7, end: 9.3 },
  { text: "text", start: 9.3, end: 10.0 },
];

export const generateMockTranscription = (
  durationInSeconds: number,
): WordTranscription[] => {
  const words = [
    "Hello",
    "world",
    "this",
    "is",
    "a",
    "demo",
    "of",
    "the",
    "video",
    "editor",
    "interface",
    "built",
    "with",
    "remotion",
    "and",
    "nextjs",
    "leveraging",
    "the",
    "new",
    "ui",
    "ux",
    "skills",
  ];
  const transcription: WordTranscription[] = [];
  let currentTime = 0;

  while (currentTime < durationInSeconds) {
    const word = words[Math.floor(Math.random() * words.length)];
    const duration = 0.3 + Math.random() * 0.4;
    const end = Math.min(currentTime + duration, durationInSeconds);
    transcription.push({
      text: word,
      start: currentTime,
      end: end,
    });
    currentTime = end + 0.05; // gap between words
  }

  return transcription;
};
