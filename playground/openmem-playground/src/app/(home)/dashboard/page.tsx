"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useContainer, useContainers } from "@/src/hooks/useContainer";
import styles from "@/src/styles/dashboard.module.scss";

export default function Dashboard() {
  const { signOut } = useAuth();
  const { containers, isFetchingContainers, containersError } = useContainers();
  const { createContainerMutation } = useContainer();

  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAdd = async () => {
    const tag = newTag.trim();
    if (!tag) return;
    await createContainerMutation.mutateAsync(tag);
    setNewTag("");
    setShowAddForm(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setShowAddForm(false);
      setNewTag("");
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>OpenMem</h1>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <div className={styles.body}>
        {/* ── Main area (left) ── */}
        <main className={styles.main}>
          {selectedContainerId ? (
            // ContainerViewer will go here
            <div className={styles.placeholder}>
              Container selected: {selectedContainerId}
            </div>
          ) : (
            <div className={styles.placeholder}>
              Select a container from the sidebar
            </div>
          )}
        </main>

        {/* ── Sidebar (right) ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Containers</h2>
            <button
              className={styles.addBtn}
              onClick={() => setShowAddForm((v) => !v)}
              disabled={showAddForm}
            >
              + Add New
            </button>
          </div>

          {showAddForm && (
            <div className={styles.addForm}>
              <input
                className={styles.tagInput}
                type="text"
                placeholder="Tag name…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddKeyDown}
                autoFocus
              />
              <button
                className={styles.submitBtn}
                onClick={handleAdd}
                disabled={createContainerMutation.isPending || !newTag.trim()}
              >
                {createContainerMutation.isPending ? "…" : "Add"}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setShowAddForm(false);
                  setNewTag("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ── List ── */}
          <div className={styles.containerList}>
            {isFetchingContainers && (
              <div className={styles.loadingState}>Loading…</div>
            )}

            {containersError && (
              <div className={styles.errorState}>
                Failed to load containers
              </div>
            )}

            {!isFetchingContainers &&
              !containersError &&
              containers?.length === 0 && (
                <div className={styles.emptyState}>
                  No containers yet. Create one to get started.
                </div>
              )}

            {containers?.map((c) => (
              <button
                key={c.id}
                className={`${styles.containerItem} ${selectedContainerId === c.id ? styles.containerItemActive : ""}`}
                onClick={() => setSelectedContainerId(c.id)}
              >
                <span className={styles.containerTag}>{c.tag}</span>
                <span className={styles.containerMeta}>
                  Created{" "}
                  {new Date(c.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
