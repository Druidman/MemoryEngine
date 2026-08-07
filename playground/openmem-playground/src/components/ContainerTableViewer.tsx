"use client";

import { useState } from "react";
import { useContainer } from "@/src/hooks/useContainer";
import type { Entity, Memory, Relation } from "@/src/hooks/useContainer";
import styles from "@/src/styles/containerTableViewer.module.scss";

type Tab = "entities" | "relations" | "memories";

interface ContainerTableViewerProps {
  containerId: string;
}

export default function ContainerTableViewer({ containerId }: ContainerTableViewerProps) {
  const { containerData, isFetchingContainerData, containerDataError } = useContainer(containerId);
  const [activeTab, setActiveTab] = useState<Tab>("entities");

  if (isFetchingContainerData) {
    return <div className={styles.status}>Loading container data…</div>;
  }
  if (containerDataError) {
    return <div className={styles.statusError}>Failed to load container data</div>;
  }
  if (!containerData) {
    return <div className={styles.status}>No data</div>;
  }

  const { entities, relations, memories } = containerData;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "entities", label: "Entities", count: entities.length },
    { id: "relations", label: "Relations", count: relations.length },
    { id: "memories", label: "Memories", count: memories.length },
  ];

  return (
    <div className={styles.viewer}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        {activeTab === "entities" && <EntitiesTable entities={entities} />}
        {activeTab === "relations" && <RelationsTable relations={relations} entities={entities} />}
        {activeTab === "memories" && <MemoriesTable memories={memories} />}
      </div>
    </div>
  );
}

/* ── Entities ── */
function EntitiesTable({ entities }: { entities: Entity[] }) {
  if (entities.length === 0) return <EmptyState message="No entities" />;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Aliases</th>
          <th>Confidence</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {entities.map((e) => (
          <tr key={e.id}>
            <td className={styles.cellPrimary}>{e.canonical_name}</td>
            <td><span className={styles.badge}>{e.type}</span></td>
            <td className={styles.cellMuted}>{e.aliases.length > 0 ? e.aliases.join(", ") : "—"}</td>
            <td className={styles.cellMuted}>{(e.confidence * 100).toFixed(0)}%</td>
            <td className={styles.cellMuted}>{formatDate(e.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Relations ── */
function RelationsTable({ relations, entities }: { relations: Relation[]; entities: Entity[] }) {
  const entityMap = new Map(entities.map((e) => [e.id, e.canonical_name]));
  if (relations.length === 0) return <EmptyState message="No relations" />;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Relation</th>
          <th>Object</th>
          <th>Confidence</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {relations.map((r) => (
          <tr key={r.id}>
            <td className={styles.cellMuted}>{entityMap.get(r.subject_id ?? "") ?? truncate(r.subject_id)}</td>
            <td className={styles.cellPrimary}>{r.relation}</td>
            <td className={styles.cellMuted}>{entityMap.get(r.object_id ?? "") ?? truncate(r.object_id)}</td>
            <td className={styles.cellMuted}>{(r.confidence * 100).toFixed(0)}%</td>
            <td className={styles.cellMuted}>{formatDate(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Memories ── */
function MemoriesTable({ memories }: { memories: Memory[] }) {
  if (memories.length === 0) return <EmptyState message="No memories" />;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Content</th>
          <th>Type</th>
          <th>Confidence</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {memories.map((m) => (
          <tr key={m.id}>
            <td className={styles.cellPrimary}>{m.content}</td>
            <td><span className={styles.badge}>{m.type}</span></td>
            <td className={styles.cellMuted}>{(m.confidence * 100).toFixed(0)}%</td>
            <td className={styles.cellMuted}>{formatDate(m.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Helpers ── */
function EmptyState({ message }: { message: string }) {
  return <div className={styles.empty}>{message}</div>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function truncate(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}
