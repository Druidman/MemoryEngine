"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import styles from "@/src/styles/auth.module.scss";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, anonymousSignIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };
  const handleTestClick = async (e: React.MouseEvent)=>{
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await anonymousSignIn()
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anonymous Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Sign In</h1>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input
          className={styles.input}
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">Password</label>
        <input
          className={styles.input}
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className={styles.footer}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={styles.link}>Sign up</Link>
        {" "}
        or
        {" "}
        <button className={styles.link} onClick={handleTestClick}>Test</button>
      </p>
    </form>
  );
}
