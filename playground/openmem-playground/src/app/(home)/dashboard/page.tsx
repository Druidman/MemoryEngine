"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useContainer, useContainers } from "@/src/hooks/useContainer";
import ContainerTableViewer from "@/src/components/ContainerTableViewer";
import ChatSidebar from "@/src/components/ChatSidebar";
import AdminRequestPanel from "@/src/components/AdminRequestPanel";
import styles from "@/src/styles/dashboard.module.scss";

export default function Dashboard() {
  const { signOut, isAdmin, user } = useAuth();
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
        {!isAdmin && <AdminRequestPanel />}
        <span className={styles.userId}>It may take up to ~2 mins for data to appear in viewer ;D<br/>Also llm extractors hallucinate pretty often :(</span>
        <span className={styles.userId}>UID: {user?.id?.slice(0, 8)}…<button className={styles.copyBtn} onClick={() => user?.id && navigator.clipboard.writeText(user.id)} title="Copy full UID">📋</button></span>
        <a
          href="https://github.com/Druidman/MemoryEngine"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubBtn}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <div className={styles.body}>
        {/* ── Chat sidebar (left) ── */}
        <ChatSidebar key={selectedContainerId ?? "none"} activeContainerId={selectedContainerId} isAdmin={isAdmin} />

        {/* ── Main area (center) ── */}
        <main className={styles.main}>
          {selectedContainerId ? (
            <ContainerTableViewer containerId={selectedContainerId} />
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
