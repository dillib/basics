import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractClipboard, fileToDataUrl, shrinkImage } from "@/lib/pasteContent";
import { TEST_PREP_LIMITS } from "@shared/test-prep";

export interface PasteInput {
  text: string;
  images: string[];
  imageUrls: string[];
}

/**
 * One box for whatever the student has: text copied from Google Docs (with
 * its images), screenshots, or photos of a worksheet.
 */
export default function PasteBox({ onSubmit, busy, initialText = "" }: { onSubmit(input: PasteInput): void; busy: boolean; initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (initialText) setText(initialText); }, [initialText]);

  const count = images.length + imageUrls.length;
  const room = TEST_PREP_LIMITS.images - count;

  async function addImages(dataUrls: string[], urls: string[] = []) {
    const fit = Math.max(0, room);
    if (dataUrls.length + urls.length > fit) setNote(`Up to ${TEST_PREP_LIMITS.images} images per set; extra ones were left out.`);
    const shrunk = await Promise.all(dataUrls.slice(0, fit).map((d) => shrinkImage(d).catch(() => null)));
    setImages((prev) => [...prev, ...shrunk.filter((x): x is string => !!x)]);
    setImageUrls((prev) => [...prev, ...urls.slice(0, Math.max(0, fit - dataUrls.length))]);
  }

  const tooLong = text.length > TEST_PREP_LIMITS.chars;
  const empty = !text.trim() && !count;

  return (
    <div className="space-y-3 text-left">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          // Text pastes normally; images that came with it are collected here.
          void extractClipboard(e.nativeEvent).then(({ images: imgs, imageUrls: urls }) => {
            if (imgs.length || urls.length) void addImages(imgs, urls);
          });
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (!files.length) return;
          e.preventDefault();
          void Promise.all(files.map(fileToDataUrl)).then((d) => addImages(d));
        }}
        placeholder="Paste your homework or test questions, images too"
        className="min-h-[220px] rounded-2xl bg-card border-2 border-foreground/10 text-base focus-visible:border-primary/50"
        aria-label="Paste your homework or test questions"
      />

      {count > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Attached images">
          {[...images, ...imageUrls].map((src, i) => (
            <div key={`${i}-${src.slice(-24)}`} className="relative h-20 w-20 overflow-hidden rounded-lg border bg-muted">
              <img src={src} alt={`Attached image ${i + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              <button
                type="button"
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"
                onClick={() => (i < images.length ? setImages(images.filter((_, j) => j !== i)) : setImageUrls(imageUrls.filter((_, j) => j !== i - images.length)))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => onSubmit({ text, images, imageUrls })} disabled={busy || empty || tooLong} size="lg">
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading your questions…</> : "Start studying"}
        </Button>
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={room <= 0}>
          <ImagePlus className="mr-2 h-4 w-4" /> Add a photo or screenshot
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void Promise.all(files.map(fileToDataUrl)).then((d) => addImages(d));
          }}
        />
        <span className={tooLong ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {tooLong ? `Too long: ${text.length.toLocaleString()} of ${TEST_PREP_LIMITS.chars.toLocaleString()} characters` : `${count}/${TEST_PREP_LIMITS.images} images`}
        </span>
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
