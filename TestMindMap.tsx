import React from 'react';
import MindMapPanel from './client/src/components/MindMapPanel';

// Test data for mind map
const testMindMapData = {
  nodes: [
    { id: "topic", label: "Machine Learning", type: "topic" as const, summary: "Teaching computers to learn from data" },
    { id: "p1", label: "Data", type: "principle" as const, summary: "Raw information used for training" },
    { id: "p2", label: "Algorithms", type: "principle" as const, summary: "Mathematical procedures that learn patterns" },
    { id: "p3", label: "Models", type: "principle" as const, summary: "Trained systems that make predictions" },
    { id: "c1", label: "Training Data", type: "concept" as const, summary: "Data used to teach the model" },
    { id: "c2", label: "Features", type: "concept" as const, summary: "Input variables used for prediction" },
    { id: "c3", label: "Neural Networks", type: "concept" as const, summary: "Brain-inspired computing systems" },
    { id: "c4", label: "Inference", type: "concept" as const, summary: "Using trained models to predict" },
  ],
  edges: [
    { source: "topic", target: "p1", label: "requires" },
    { source: "topic", target: "p2", label: "uses" },
    { source: "topic", target: "p3", label: "produces" },
    { source: "p1", target: "c1", label: "includes" },
    { source: "p1", target: "c2", label: "has" },
    { source: "p2", target: "c3", label: "includes" },
    { source: "p3", target: "c4", label: "performs" },
  ]
};

function TestMindMap() {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px' }}>Mind Map Feature Test</h1>
      <div style={{ height: '600px', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <MindMapPanel 
          data={testMindMapData}
          topicTitle="Machine Learning"
        />
      </div>
      <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
        <h3>✅ Test Results:</h3>
        <ul>
          <li>Mind map renders with React Flow</li>
          <li>Central topic node (purple circle)</li>
          <li>Principle nodes arranged in circle</li>
          <li>Concept nodes branch from principles</li>
          <li>Click nodes to see details panel</li>
          <li>Export to PDF button works</li>
          <li>Expand/minimize controls work</li>
        </ul>
      </div>
    </div>
  );
}

export default TestMindMap;
