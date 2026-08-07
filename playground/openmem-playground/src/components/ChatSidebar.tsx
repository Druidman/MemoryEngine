"use client";

import { useState, useEffect, useRef } from "react";
import { useSessions, useSession } from "@/src/hooks/useSession";
import styles from "@/src/styles/chatSidebar.module.scss";

interface ChatSidebarProps {
  activeContainerId?: string | null;
}

export default function ChatSidebar({ activeContainerId }: ChatSidebarProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <aside className={styles.chatSidebar}>
      <SessionPicker
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
        showNewForm={showNewForm}
        setShowNewForm={setShowNewForm}
        containerId={activeContainerId}
      />

      {selectedSessionId && activeContainerId ? (
        <ChatArea
          containerId={activeContainerId}
          sessionId={selectedSessionId}
          input={input}
          setInput={setInput}
        />
      ) : (
        <div className={styles.chatPlaceholder}>
          {activeContainerId
            ? "Select or create a session to start chatting"
            : "Select a container first"}
        </div>
      )}
    </aside>
  );
}

/* ── Session picker ── */

interface SessionPickerProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  showNewForm: boolean;
  setShowNewForm: (v: (prev: boolean) => boolean) => void;
  containerId?: string | null;
}

function SessionPicker({
  selectedSessionId,
  onSelectSession,
  showNewForm,
  setShowNewForm,
  containerId,
}: SessionPickerProps) {
  const { sessions, isFetchingSessions, sessionsError } = useSessions(containerId ?? undefined);
  const { createSession } = useSession(containerId ?? "", undefined);

  const handleCreate = async () => {
    if (!containerId) return;
    const result = await createSession(containerId);
    setShowNewForm((v) => !v);
    if (result?.id) onSelectSession(result.id);
  };

  if (!containerId) {
    return (
      <div className={styles.sessionPicker}>
        <div className={styles.sessionHeader}>
          <h2 className={styles.sessionTitle}>Sessions</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sessionPicker}>
      <div className={styles.sessionHeader}>
        <h2 className={styles.sessionTitle}>Sessions</h2>
        <button
          className={styles.addBtn}
          onClick={() => setShowNewForm((v) => !v)}
          disabled={showNewForm}
        >
          + New
        </button>
      </div>

      {showNewForm && (
        <div className={styles.newSessionForm}>
          <div className={styles.newSessionActions}>
            <button
              className={styles.submitBtn}
              onClick={handleCreate}
            >
              Create Session
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowNewForm((v) => !v)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={styles.sessionList}>
        {isFetchingSessions && <div className={styles.statusMuted}>Loading…</div>}
        {sessionsError && <div className={styles.statusError}>Failed to load sessions</div>}
        {!isFetchingSessions && !sessionsError && sessions?.length === 0 && (
          <div className={styles.statusMuted}>No sessions yet</div>
        )}
        {sessions?.toSorted((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((s) => (
          <button
            key={s.id}
            className={`${styles.sessionItem} ${selectedSessionId === s.id ? styles.sessionItemActive : ""}`}
            onClick={() => onSelectSession(s.id)}
          >
            <span className={styles.sessionId}>{s.id.slice(0, 8)}…</span>
            <span className={styles.sessionDate}>
              {new Date(s.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Chat area ── */

interface ChatAreaProps {
  containerId: string;
  sessionId: string;
  input: string;
  setInput: (v: string) => void;
}

function ChatArea({ containerId, sessionId, input, setInput }: ChatAreaProps) {
  const { sessionData, isFetchingSessionData, getSessionResponse } = useSession(containerId, sessionId);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-scroll to bottom on new messages or when sending
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sessionData?.messages, isSending]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    setIsSending(true);
    try {
      await getSessionResponse(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatArea}>
      <div className={styles.messages} ref={messagesRef}>
        {isFetchingSessionData && <div className={styles.statusMuted}>Loading messages…</div>}
        {sessionData?.messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.payload.role === "user" ? styles.messageUser : styles.messageAssistant}`}
          >
            <div className={styles.messageRole}>{msg.payload.role}</div>
            <div className={styles.messageContent}>{msg.payload.content}</div>
          </div>
        ))}
        {isSending && (
          <div className={`${styles.message} ${styles.messageAssistant}`}>
            <div className={styles.messageRole}>assistant</div>
            <div className={styles.typingIndicator}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        )}
      </div>

      <div className={styles.inputBar}>
        <textarea
          className={styles.inputField}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
