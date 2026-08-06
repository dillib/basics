import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Award, Loader2 } from "lucide-react";
import type { Topic, Progress, User } from "@shared/schema";
import { isLevel, LEVEL_LABELS } from "@shared/levels";

interface CertificateGeneratorProps {
  user: User | undefined;
  topic: Topic;
  progress: Progress | undefined;
  className?: string;
}

/** A topic only earns a certificate once its quiz has actually been passed -- see server/routes.ts, completedAt is only set when score >= config.quiz.passingScore. */
export function isCertificateEligible(progress: Progress | undefined): boolean {
  return !!progress?.completedAt;
}

export function generateCertificatePDF(user: User | undefined, topic: Topic, progress: Progress): void {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const primaryColor = [88, 28, 135];
  const textColor = [30, 30, 30];
  const mutedColor = [100, 100, 100];

  // Decorative double border.
  pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setLineWidth(1);
  pdf.rect(8, 8, pageWidth - 16, pageHeight - 16);
  pdf.setLineWidth(0.3);
  pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

  const center = pageWidth / 2;
  let y = 32;

  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("BASICSTUTOR", center, y, { align: "center" });
  y += 14;

  pdf.setFontSize(30);
  pdf.text("Certificate of Mastery", center, y, { align: "center" });
  y += 16;

  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text("This certifies that", center, y, { align: "center" });
  y += 12;

  const recipientName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "A First Principles Learner";
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(recipientName, center, y, { align: "center" });
  y += 14;

  const levelSuffix = isLevel(topic.level) && topic.level !== "adult" ? ` (${LEVEL_LABELS[topic.level]} level)` : "";
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text("has mastered, from first principles,", center, y, { align: "center" });
  y += 12;

  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  const titleLines = pdf.splitTextToSize(`${topic.title}${levelSuffix}`, pageWidth - 60);
  pdf.text(titleLines, center, y, { align: "center" });
  y += titleLines.length * 9 + 10;

  const dateStr = (progress.completedAt ? new Date(progress.completedAt) : new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const scoreStr = progress.bestScore != null ? `Quiz score: ${progress.bestScore}%` : "";

  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const metaLine = [dateStr, scoreStr].filter(Boolean).join("   •   ");
  pdf.text(metaLine, center, y, { align: "center" });

  const footerY = pageHeight - 18;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(30, footerY - 6, pageWidth - 30, footerY - 6);
  pdf.setFontSize(9);
  pdf.text("BasicsTutor.com — Your First Principles Academy", center, footerY, { align: "center" });

  const fileName = `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-certificate.pdf`;
  pdf.save(fileName);
}

export default function CertificateGenerator({ user, topic, progress, className = "" }: CertificateGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const eligible = isCertificateEligible(progress);

  const handleDownload = async () => {
    if (!progress) return;
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      generateCertificatePDF(user, topic, progress);
    } catch (error) {
      console.error("Failed to generate certificate:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!eligible) return null;

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isGenerating}
      className={className}
      data-testid="button-download-certificate"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Award className="h-4 w-4 mr-2" />
          Get Certificate
        </>
      )}
    </Button>
  );
}
