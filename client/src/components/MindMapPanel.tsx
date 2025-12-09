import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

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

const nodeColors = {
  topic: { bg: "hsl(262, 83%, 58%)", border: "hsl(262, 83%, 45%)", text: "#ffffff" },
  principle: { bg: "hsl(262, 60%, 96%)", border: "hsl(262, 60%, 80%)", text: "hsl(262, 50%, 30%)" },
  concept: { bg: "hsl(262, 40%, 98%)", border: "hsl(262, 40%, 85%)", text: "hsl(262, 40%, 40%)" },
};

function calculateNodePositions(data: MindMapData): { nodes: Node[]; edges: Edge[] } {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const centerX = 400;
  const centerY = 300;
  const principleRadius = 200;
  const conceptRadius = 100;

  const topicNode = data.nodes.find(n => n.type === "topic");
  const principleNodes = data.nodes.filter(n => n.type === "principle");
  const conceptNodes = data.nodes.filter(n => n.type === "concept");

  const positionedNodes: Node[] = [];

  // Handle case when there are no principle nodes
  const hasPrinciples = principleNodes.length > 0;
  const angleStep = hasPrinciples ? (2 * Math.PI) / principleNodes.length : 0;

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
        background: nodeColors.topic.bg,
        border: `2px solid ${nodeColors.topic.border}`,
        color: nodeColors.topic.text,
        borderRadius: "50%",
        width: 140,
        height: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center" as const,
        fontWeight: 600,
        fontSize: "14px",
        padding: "12px",
        boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  }

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
        background: nodeColors.principle.bg,
        border: `2px solid ${nodeColors.principle.border}`,
        color: nodeColors.principle.text,
        borderRadius: "12px",
        width: 130,
        minHeight: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center" as const,
        fontWeight: 500,
        fontSize: "12px",
        padding: "10px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

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

  principleNodes.forEach((principle, i) => {
    const principleAngle = angleStep * i - Math.PI / 2;
    const principleX = centerX + principleRadius * Math.cos(principleAngle);
    const principleY = centerY + principleRadius * Math.sin(principleAngle);

    const concepts = conceptsByPrinciple.get(principle.id) || [];
    const conceptAngleSpread = Math.PI / 4;
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
          background: nodeColors.concept.bg,
          border: `1px solid ${nodeColors.concept.border}`,
          color: nodeColors.concept.text,
          borderRadius: "8px",
          width: 100,
          minHeight: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center" as const,
          fontSize: "11px",
          padding: "6px",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  });

  const positionedEdges: Edge[] = data.edges.map((edge, i) => ({
    id: `edge-${i}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: edge.source === topicNode?.id,
    style: { 
      stroke: edge.source === topicNode?.id ? "hsl(262, 83%, 58%)" : "hsl(262, 30%, 75%)",
      strokeWidth: edge.source === topicNode?.id ? 2 : 1,
    },
    labelStyle: { 
      fontSize: "10px", 
      fill: "hsl(262, 30%, 50%)",
      fontWeight: 400,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.source === topicNode?.id ? "hsl(262, 83%, 58%)" : "hsl(262, 30%, 75%)",
      width: 15,
      height: 15,
    },
  }));

  return { nodes: positionedNodes, edges: positionedEdges };
}

export default function MindMapPanel({ data, topicTitle }: MindMapPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  const { nodes: initialNodes, edges: initialEdges } = calculateNodePositions(data);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const resetLayout = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = calculateNodePositions(data);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [data, setNodes, setEdges]);

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
      const imgHeight = pageHeight - margin * 2 - 15;
      
      pdf.addImage(dataUrl, "PNG", margin, margin + 12, imgWidth, imgHeight);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Generated by BasicsTutor.com", pageWidth / 2, pageHeight - 5, { align: "center" });

      pdf.save(`${topicTitle.replace(/\s+/g, "-").toLowerCase()}-mindmap.pdf`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [topicTitle]);

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Mind Map</CardTitle>
          <Badge variant="secondary" className="text-xs">Pro</Badge>
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
        <div
          ref={flowRef}
          className={`w-full ${isExpanded ? "h-[calc(100vh-8rem)]" : "h-[400px]"} rounded-b-lg overflow-hidden`}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Controls 
              showZoom={true}
              showFitView={true}
              showInteractive={false}
              position="bottom-right"
            />
            <Background color="hsl(262, 20%, 92%)" gap={20} />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}
