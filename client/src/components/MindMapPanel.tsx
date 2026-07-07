import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./MindMapPanel.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Maximize2, Minimize2, X, RefreshCw } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useTheme } from "./ThemeProvider";

interface MindMapNode {
  id: string;
  label: string;
  type: "topic" | "principle" | "concept";
  summary?: string;
}

interface MindMapEdge {
  source: string;
  target: string;
  label?: string;
}

interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

interface MindMapPanelProps {
  data: MindMapData;
  topicTitle: string;
}

interface Palette {
  topic: { bg: string; border: string; text: string; glow: string };
  principle: { bg: string; border: string; text: string; shadow: string };
  concept: { bg: string; border: string; text: string };
  edgePrimary: string;
  edgeSecondary: string;
  dots: string;
}

// The central topic uses the same purple gradient in both themes (it pops on
// light and dark alike); everything else flips so nodes read as solid cards on
// the dark app instead of the old washed-out near-white boxes.
const TOPIC_GRADIENT = "linear-gradient(135deg, hsl(262 83% 62%), hsl(283 80% 55%))";

const LIGHT_PALETTE: Palette = {
  topic: { bg: TOPIC_GRADIENT, border: "hsl(262 83% 48%)", text: "#ffffff", glow: "0 8px 24px hsl(262 83% 50% / 0.4)" },
  principle: { bg: "#ffffff", border: "hsl(262 55% 78%)", text: "hsl(262 45% 32%)", shadow: "0 2px 8px hsl(262 40% 40% / 0.1)" },
  concept: { bg: "hsl(262 40% 98%)", border: "hsl(262 35% 86%)", text: "hsl(262 30% 45%)" },
  edgePrimary: "hsl(262 83% 60%)",
  edgeSecondary: "hsl(262 25% 80%)",
  dots: "hsl(262 20% 90%)",
};

const DARK_PALETTE: Palette = {
  topic: { bg: TOPIC_GRADIENT, border: "hsl(262 70% 62%)", text: "#ffffff", glow: "0 8px 26px hsl(262 83% 40% / 0.55)" },
  principle: { bg: "hsl(262 30% 17%)", border: "hsl(262 45% 45%)", text: "hsl(262 40% 90%)", shadow: "0 2px 10px hsl(262 60% 6% / 0.6)" },
  concept: { bg: "hsl(262 24% 13%)", border: "hsl(262 28% 34%)", text: "hsl(262 25% 80%)" },
  edgePrimary: "hsl(262 83% 64%)",
  edgeSecondary: "hsl(262 20% 40%)",
  dots: "hsl(262 15% 24%)",
};

function calculateNodePositions(data: MindMapData, palette: Palette): { nodes: Node[]; edges: Edge[] } {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const centerX = 450;
  const centerY = 350;
  
  const topicNode = data.nodes.find(n => n.type === "topic");
  const principleNodes = data.nodes.filter(n => n.type === "principle");
  const conceptNodes = data.nodes.filter(n => n.type === "concept");

  // Dynamic radius based on number of principles (more principles = larger radius)
  const principleRadius = Math.max(220, 180 + principleNodes.length * 25);
  const conceptRadius = 90;

  const positionedNodes: Node[] = [];

  // Handle case when there are no principle nodes
  const hasPrinciples = principleNodes.length > 0;
  const angleStep = hasPrinciples ? (2 * Math.PI) / principleNodes.length : 0;

  // Central topic node - smaller and cleaner
  if (topicNode) {
    positionedNodes.push({
      id: topicNode.id,
      position: { x: centerX, y: centerY },
      data: { 
        label: topicNode.label,
        summary: topicNode.summary,
        nodeType: "topic"
      },
      style: {
        background: palette.topic.bg,
        border: `3px solid ${palette.topic.border}`,
        color: palette.topic.text,
        borderRadius: "50%",
        width: 124,
        height: 124,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center" as const,
        fontWeight: 600,
        fontSize: "13px",
        padding: "10px",
        boxShadow: palette.topic.glow,
        cursor: "pointer",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  }

  // Principle nodes - arranged in a circle around topic
  principleNodes.forEach((node, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const x = centerX + principleRadius * Math.cos(angle);
    const y = centerY + principleRadius * Math.sin(angle);

    positionedNodes.push({
      id: node.id,
      position: { x, y },
      data: { 
        label: node.label,
        summary: node.summary,
        nodeType: "principle"
      },
      style: {
        background: palette.principle.bg,
        border: `2px solid ${palette.principle.border}`,
        color: palette.principle.text,
        borderRadius: "12px",
        width: 112,
        minHeight: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center" as const,
        fontWeight: 600,
        fontSize: "11px",
        padding: "8px",
        boxShadow: palette.principle.shadow,
        cursor: "pointer",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Group concepts by their parent principle
  const conceptsByPrinciple = new Map<string, MindMapNode[]>();
  data.edges.forEach(edge => {
    const sourceIsPrinciple = principleNodes.some(p => p.id === edge.source);
    const targetIsConcept = conceptNodes.some(c => c.id === edge.target);
    if (sourceIsPrinciple && targetIsConcept) {
      const concepts = conceptsByPrinciple.get(edge.source) || [];
      const concept = conceptNodes.find(c => c.id === edge.target);
      if (concept) concepts.push(concept);
      conceptsByPrinciple.set(edge.source, concepts);
    }
  });

  // Position concept nodes around their parent principles
  principleNodes.forEach((principle, i) => {
    const principleAngle = angleStep * i - Math.PI / 2;
    const principleX = centerX + principleRadius * Math.cos(principleAngle);
    const principleY = centerY + principleRadius * Math.sin(principleAngle);

    const concepts = conceptsByPrinciple.get(principle.id) || [];
    // Spread concepts in an arc away from center, with more spread for more concepts
    const conceptAngleSpread = Math.min(Math.PI / 3, (concepts.length * Math.PI) / 8);
    const conceptAngleStep = concepts.length > 1 ? conceptAngleSpread / (concepts.length - 1) : 0;
    const startAngle = principleAngle - conceptAngleSpread / 2;

    concepts.forEach((concept, j) => {
      const conceptAngle = concepts.length > 1 ? startAngle + conceptAngleStep * j : principleAngle;
      const x = principleX + conceptRadius * Math.cos(conceptAngle);
      const y = principleY + conceptRadius * Math.sin(conceptAngle);

      positionedNodes.push({
        id: concept.id,
        position: { x, y },
        data: { 
          label: concept.label,
          summary: concept.summary,
          nodeType: "concept"
        },
        style: {
          background: palette.concept.bg,
          border: `1px solid ${palette.concept.border}`,
          color: palette.concept.text,
          borderRadius: "8px",
          width: 88,
          minHeight: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center" as const,
          fontSize: "10px",
          fontWeight: 500,
          padding: "4px 6px",
          cursor: "pointer",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  });

  // Edges - clean styling without labels, filtering out principle-to-principle edges
  const filteredEdges = data.edges.filter(edge => {
    // Keep topic-to-principle and principle-to-concept edges, skip principle-to-principle
    const sourcePrinciple = principleNodes.find(p => p.id === edge.source);
    const targetPrinciple = principleNodes.find(p => p.id === edge.target);
    // Skip if both source and target are principles (principle-to-principle)
    return !(sourcePrinciple && targetPrinciple);
  });

  const positionedEdges: Edge[] = filteredEdges.map((edge, i) => {
    const isFromTopic = edge.source === topicNode?.id;
    const stroke = isFromTopic ? palette.edgePrimary : palette.edgeSecondary;
    return {
      id: `edge-${i}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: isFromTopic,
      style: {
        stroke,
        strokeWidth: isFromTopic ? 2.5 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 14,
        height: 14,
      },
    };
  });

  return { nodes: positionedNodes, edges: positionedEdges };
}

export default function MindMapPanel({ data, topicTitle }: MindMapPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const palette = theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

  const layout = useMemo(() => calculateNodePositions(data, palette), [data, palette]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  // Recolor (and re-lay-out) when the topic data or the theme changes so the
  // map always matches light/dark instead of keeping stale node colors.
  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  const getNodeData = (id: string): MindMapNode | undefined => {
    return data.nodes.find(n => n.id === id);
  };

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const nodeData = getNodeData(node.id);
    setSelectedNode(nodeData || null);
  }, [data.nodes]);

  const resetLayout = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = calculateNodePositions(data, palette);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [data, palette, setNodes, setEdges]);

  const exportToPDF = useCallback(async () => {
    if (!flowRef.current) return;
    setIsExporting(true);

    try {
      const flowElement = flowRef.current.querySelector(".react-flow") as HTMLElement;
      if (!flowElement) {
        throw new Error("Could not find flow element");
      }

      const dataUrl = await toPng(flowElement, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${topicTitle} - Mind Map`, pageWidth / 2, margin + 8, { align: "center" });

      const imgWidth = pageWidth - margin * 2;
      const imgHeight = pageHeight - margin * 2 - 20;
      
      pdf.addImage(dataUrl, "PNG", margin, margin + 12, imgWidth, imgHeight);

      // Add principles and concepts summary
      pdf.addPage();
      let yPosition = margin + 10;
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Topic Details", margin, yPosition);
      yPosition += 8;

      const principles = data.nodes.filter(n => n.type === "principle");
      const concepts = data.nodes.filter(n => n.type === "concept");

      if (principles.length > 0) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("Principles:", margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        principles.forEach(p => {
          const text = `• ${p.label}${p.summary ? ': ' + p.summary.substring(0, 50) + '...' : ''}`;
          const lines = pdf.splitTextToSize(text, pageWidth - margin * 2) as string[];
          lines.forEach((line: string) => {
            pdf.text(line, margin + 2, yPosition);
            yPosition += 4;
          });
          if (yPosition > pageHeight - margin - 10) {
            pdf.addPage();
            yPosition = margin;
          }
        });
        yPosition += 4;
      }

      if (concepts.length > 0) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("Concepts:", margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        concepts.forEach(c => {
          const text = `• ${c.label}${c.summary ? ': ' + c.summary.substring(0, 50) + '...' : ''}`;
          const lines = pdf.splitTextToSize(text, pageWidth - margin * 2) as string[];
          lines.forEach((line: string) => {
            pdf.text(line, margin + 2, yPosition);
            yPosition += 4;
          });
          if (yPosition > pageHeight - margin - 10) {
            pdf.addPage();
            yPosition = margin;
          }
        });
      }

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Generated by BasicsTutor.com", pageWidth / 2, pageHeight - 5, { align: "center" });

      pdf.save(`${topicTitle.replace(/\s+/g, "-").toLowerCase()}-mindmap.pdf`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [topicTitle, data.nodes]);

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Mind Map</CardTitle>
          <Badge variant="secondary" className="text-xs">Pro • Click nodes for details</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetLayout}
            title="Reset layout"
            data-testid="button-reset-layout"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={exportToPDF}
            disabled={isExporting}
            title="Export to PDF"
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize" : "Expand"}
            data-testid="button-toggle-expand"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-full">
          <div
            ref={flowRef}
            className={`flex-1 ${isExpanded ? "h-[calc(100vh-8rem)]" : "h-[400px]"} rounded-b-lg overflow-hidden`}
          >
            <ReactFlow
              className="mindmap-flow"
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Controls
                showZoom={true}
                showFitView={true}
                showInteractive={false}
                position="bottom-right"
              />
              <Background variant={BackgroundVariant.Dots} color={palette.dots} gap={20} size={1.5} />
            </ReactFlow>
          </div>
          
          {selectedNode && (
            <div className="w-72 border-l border-border overflow-auto bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant={selectedNode.type === "topic" ? "default" : "secondary"} className="mb-2">
                    {selectedNode.type}
                  </Badge>
                  <h3 className="font-semibold text-sm leading-tight">{selectedNode.label}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {selectedNode.summary && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Summary</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedNode.summary}</p>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p>Click another node to view its details</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
