"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import styles from "@/styles/home.module.scss";
import { Loader } from "@mantine/core";

export default function Home() {
  const router = useRouter();
  const { anonymousSignIn, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      await anonymousSignIn();
      router.push("/dashboard");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>OpenMem Playground</h1>
      <p className={styles.description}>
        An early stage playground for the OpenMem memory engine. Explore how
        persistent, structured memory works for AI agents.
      </p>
      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={handleTest}
          disabled={loading}
        >
          {loading ? user ? "Entering..." : "Starting…" : user ? "Go to Dashboard" : "Test"}
        </button>
        <button
          className={`${styles.btn} ${styles.secondary}`}
          onClick={() => router.push("/signin")}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
