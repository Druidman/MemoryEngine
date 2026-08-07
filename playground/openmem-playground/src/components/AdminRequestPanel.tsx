"use client";

import { useState } from "react";
import { useAdminRequest } from "@/src/hooks/useAdminRequests";
import styles from "@/src/styles/adminRequest.module.scss";

export default function AdminRequestPanel() {
  const { adminRequests, placeAdminRequest, isFetching } = useAdminRequest();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    const text = message.trim();
    if (!text) return;
    await placeAdminRequest(text);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.wrapper}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        {adminRequests && adminRequests.length > 0 ? "Admin Requests" : "Request Admin"}
      </button>

      {open && (
        <div className={styles.dropdown}>
          {isFetching && <div className={styles.muted}>Loading…</div>}

          {adminRequests && adminRequests.length > 0 && (
            <div className={styles.requestList}>
              {adminRequests.map((req, i) => (
                <div key={i} className={styles.requestItem}>
                  <div className={styles.requestDate}>
                    {new Date(req.requested_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className={styles.requestMessage}>{req.message}</div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.compose}>
            <textarea
              className={styles.textarea}
              placeholder="Request reason…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!message.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
