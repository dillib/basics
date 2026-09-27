import { Fragment } from "react";

// Lesson text is AI-written and sometimes uses markdown emphasis
// ("**Label:** do this", "an agent *performs tasks*"). Render just those two
// marks as real formatting instead of literal asterisks. Builds React nodes,
// never HTML, so model output can't inject markup.
const EMPHASIS = /(\*\*[^*\n]+?\*\*|\*[^*\s](?:[^*\n]*?[^*\s])?\*)/g;

export default function InlineText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <>
      {text.split(EMPHASIS).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
