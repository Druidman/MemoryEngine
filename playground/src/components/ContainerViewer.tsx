"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeMouseHandler,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import { useContainer } from "@/src/hooks/useContainer";
import type { Entity, Relation } from "@/src/hooks/useContainer";
import styles from "@/src/styles/containerViewer.module.scss";

/* ── Colour palette per entity type ── */
const TYPE_COLORS: Record<string, string> = {
  person: "#61afef",
  organization: "#c678dd",
  location: "#98c379",
  event: "#d19a66",
  concept: "#56b6c2",
};

function typeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? "#5c6370";
}

/* ── Simple circular layout ── */
function circularLayout(entities: Entity[]): { x: number; y: number }[] {
  const count = entities.length;
  if (count === 0) return [];
  const radius = Math.max(200, count * 50);
  return entities.map((_, i) => ({
    x: Math.cos((2 * Math.PI * i) / count) * radius,
    y: Math.sin((2 * Math.PI * i) / count) * radius,
  }));
}

/* ── Custom entity node ── */
function EntityNode({ data }: NodeProps<Node<{ label: string; entityType: string }>>) {
  return (
    <div className={styles.entityNode}>
      <span
        className={styles.typeBadge}
        style={{ backgroundColor: typeColor(data.entityType) }}
      >
        {data.entityType}
      </span>
      <span className={styles.entityName}>{data.label}</span>
    </div>
  );
}

const nodeTypes = { entityNode: EntityNode };

/* ── Popover detail row ── */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

/* ── Props ── */
interface ContainerViewerProps {
  containerId: string;
}

/* ── Main component ── */
export default function ContainerViewer({ containerId }: ContainerViewerProps) {
  const {
    containerData,
    isFetchingContainerData,
    containerDataError,
  } = useContainer(containerId);

  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /* Close popover on Escape */
  useEffect(() => {
    if (!selectedRelation) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedRelation(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedRelation]);

  /* ── Build nodes & edges ── */
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!containerData) return;

    const positions = circularLayout(containerData.entities);

    const newNodes: Node[] = containerData.entities.map((entity, i) => ({
      id: entity.id,
      type: "entityNode",
      position: positions[i],
      data: { label: entity.canonical_name, entityType: entity.type },
    }));

    const entityIds = new Set(containerData.entities.map((e) => e.id));

    const newEdges: Edge[] = containerData.relations
      .filter(
        (r): r is Relation & { subject_id: string; object_id: string } =>
          r.subject_id !== null &&
          r.object_id !== null &&
          entityIds.has(r.subject_id) &&
          entityIds.has(r.object_id),
      )
      .map((r) => ({
        id: r.id,
        source: r.subject_id,
        target: r.object_id,
        label: r.relation,
        labelStyle: { fill: "#abb2bf", fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: "#21252b", fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#5c6370" },
        style: { stroke: "#5c6370", strokeWidth: 1.5 },
        data: { relation: r },
      }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [containerData, setNodes, setEdges]);

  /* ── Edge click → popover ── */
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const rel = (edge.data as { relation?: Relation } | undefined)?.relation;
      if (rel) setSelectedRelation(rel);
    },
    [],
  );

  /* ── Loading / error ── */
  if (isFetchingContainerData) {
    return <div className={styles.status}>Loading container data…</div>;
  }
  if (containerDataError) {
    return <div className={styles.statusError}>Failed to load container data</div>;
  }
  if (!containerData) {
    return <div className={styles.status}>No data</div>;
  }

  /* ── Render ── */
  return (
    <div className={styles.graphWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#3e4451" />
        <Controls showInteractive={false} className={styles.controls} />
        <MiniMap
          nodeColor={(n) => typeColor((n.data as { entityType?: string }).entityType ?? "")}
          maskColor="rgba(40, 44, 52, 0.85)"
          className={styles.minimap}
        />
      </ReactFlow>

      {/* ── Relation detail popover ── */}
      {selectedRelation && (
        <div className={styles.popoverOverlay} onClick={() => setSelectedRelation(null)}>
          <div
            className={styles.popover}
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.popoverHeader}>
              <h3 className={styles.popoverTitle}>Relation Details</h3>
              <button
                className={styles.popoverClose}
                onClick={() => setSelectedRelation(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.popoverBody}>
              <DetailRow label="Relation" value={selectedRelation.relation} />
              <DetailRow
                label="Confidence"
                value={`${(selectedRelation.confidence * 100).toFixed(0)}%`}
              />
              <DetailRow
                label="Subject ID"
                value={<code className={styles.mono}>{selectedRelation.subject_id ?? "—"}</code>}
              />
              <DetailRow
                label="Object ID"
                value={<code className={styles.mono}>{selectedRelation.object_id ?? "—"}</code>}
              />
              <DetailRow
                label="Memory ID"
                value={<code className={styles.mono}>{selectedRelation.memory_id ?? "—"}</code>}
              />
              <DetailRow
                label="Superseded by"
                value={<code className={styles.mono}>{selectedRelation.superseededes ?? "—"}</code>}
              />
              <DetailRow
                label="Created"
                value={new Date(selectedRelation.created_at).toLocaleString()}
              />
              <DetailRow
                label="Updated"
                value={new Date(selectedRelation.updated_at).toLocaleString()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
