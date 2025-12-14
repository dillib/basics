import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import type { Topic, Principle } from "@shared/schema";

interface ReferenceSheetGeneratorProps {
  topic: Topic;
  principles: Principle[];
  variant?: "default" | "compact";
  className?: string;
}

export function generateReferenceSheetPDF(topic: Topic, principles: Principle[]): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const primaryColor = [88, 28, 135];
  const textColor = [30, 30, 30];
  const mutedColor = [100, 100, 100];
  const accentBg = [248, 245, 255];

  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 45, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  
  const titleLines = pdf.splitTextToSize(topic.title, contentWidth);
  pdf.text(titleLines, margin, 18);
  yPosition = 18 + titleLines.length * 8;

  if (topic.description) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(topic.description, contentWidth);
    const descToPrint = descLines.slice(0, 2);
    pdf.text(descToPrint, margin, yPosition + 2);
  }

  yPosition = 50;

  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  
  const metaItems = [];
  if (topic.category) metaItems.push(`Category: ${topic.category}`);
  if (topic.difficulty) metaItems.push(`Level: ${topic.difficulty}`);
  if (topic.estimatedMinutes) {
    const mins = topic.estimatedMinutes;
    const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    metaItems.push(`Est. Time: ${timeStr}`);
  }
  metaItems.push(`${principles.length} Principles`);
  
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.text(metaItems.join("  •  "), margin, yPosition);
  yPosition += 10;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("First Principles", margin, yPosition);
  yPosition += 8;

  principles.forEach((principle, index) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFillColor(accentBg[0], accentBg[1], accentBg[2]);
    pdf.setDrawColor(220, 215, 230);
    
    const principleStartY = yPosition;
    let contentHeight = 0;

    const titleText = `${index + 1}. ${principle.title}`;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    const titleLines = pdf.splitTextToSize(titleText, contentWidth - 10);
    contentHeight += titleLines.length * 5 + 4;

    let explanationLines: string[] = [];
    if (principle.explanation) {
      const shortExplanation = principle.explanation.substring(0, 250) + (principle.explanation.length > 250 ? "..." : "");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      explanationLines = pdf.splitTextToSize(shortExplanation, contentWidth - 10);
      contentHeight += explanationLines.length * 4 + 2;
    }

    let takeawayLines: string[][] = [];
    if (principle.keyTakeaways && principle.keyTakeaways.length > 0) {
      contentHeight += 6;
      principle.keyTakeaways.slice(0, 3).forEach((takeaway) => {
        const lines = pdf.splitTextToSize(`• ${takeaway}`, contentWidth - 15);
        takeawayLines.push(lines);
        contentHeight += lines.length * 4;
      });
    }

    contentHeight += 6;

    if (yPosition + contentHeight > pageHeight - 20) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.roundedRect(margin, yPosition, contentWidth, contentHeight, 2, 2, "FD");

    yPosition += 5;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.text(titleLines, margin + 5, yPosition);
    yPosition += titleLines.length * 5 + 2;

    if (explanationLines.length > 0) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text(explanationLines, margin + 5, yPosition);
      yPosition += explanationLines.length * 4;
    }

    if (takeawayLines.length > 0) {
      yPosition += 2;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.text("Key Takeaways:", margin + 5, yPosition);
      yPosition += 4;
      
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      takeawayLines.forEach((lines) => {
        pdf.text(lines, margin + 7, yPosition);
        yPosition += lines.length * 4;
      });
    }

    yPosition += 6;
  });

  const footerY = pageHeight - 10;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.text("Generated by BasicsTutor.com - Your First Principles Dictionary", pageWidth / 2, footerY, { align: "center" });

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  const fileName = `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-reference-sheet.pdf`;
  pdf.save(fileName);
}

export default function ReferenceSheetGenerator({ 
  topic, 
  principles, 
  variant = "default",
  className = "" 
}: ReferenceSheetGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      generateReferenceSheetPDF(topic, principles);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === "compact") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isGenerating || principles.length === 0}
        className={className}
        data-testid="button-download-sheet-compact"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="sr-only">Download Reference Sheet</span>
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      onClick={handleDownload}
      disabled={isGenerating || principles.length === 0}
      className={className}
      data-testid="button-download-sheet"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Download Reference Sheet
        </>
      )}
    </Button>
  );
}
