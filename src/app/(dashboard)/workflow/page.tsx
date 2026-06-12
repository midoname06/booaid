"use client";
import { useCallback } from "react";
import ReactFlow, { Background, Controls, addEdge, useNodesState, useEdgesState, type Connection } from "reactflow";
import "reactflow/dist/style.css";

const initialNodes = [
  { id: "n1", position: { x: 40, y: 80 }, data: { label: "Trigger: nuovo lead" }, style: { background: "#161F33", color: "#F8FAFC", border: "1px solid #7C3AED" } },
  { id: "n2", position: { x: 320, y: 80 }, data: { label: "Condizione: interessato?" }, style: { background: "#161F33", color: "#F8FAFC", border: "1px solid #F59E0B" } },
  { id: "n3", position: { x: 600, y: 20 }, data: { label: "Azione: crea appuntamento" }, style: { background: "#161F33", color: "#F8FAFC", border: "1px solid #06B6D4" } },
  { id: "n4", position: { x: 320, y: 220 }, data: { label: "Delay: aspetta 1h" }, style: { background: "#161F33", color: "#F8FAFC", border: "1px solid #94A3B8" } },
  { id: "n5", position: { x: 600, y: 220 }, data: { label: "Azione: invia SMS" }, style: { background: "#161F33", color: "#F8FAFC", border: "1px solid #06B6D4" } },
];
const initialEdges = [
  { id: "e1", source: "n1", target: "n2", animated: true },
  { id: "e2", source: "n2", target: "n3", label: "sì" },
  { id: "e3", source: "n2", target: "n4", label: "no" },
  { id: "e4", source: "n4", target: "n5" },
];

export default function WorkflowPage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges]);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Workflow Builder</h1>
      <div style={{ height: 560, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
          <Background color="#1F2A40" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
