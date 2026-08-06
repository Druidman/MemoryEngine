"use client";

import styles from "@/src/styles/auth.module.scss";
import { useAuth } from "../../hooks/useAuth";
import { redirect } from "next/navigation";
import { Loader } from "@mantine/core";


export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isFetchingUser} = useAuth()
  const isAuthenticated = !isFetchingUser && user
  if (isAuthenticated){
    redirect('/dashboard')
  }

  return <>
    {
    !isFetchingUser && !user ?
      (
        <div className={styles.container}>
          <div className={styles.card}>{children}</div>
        </div>
      )
      :
      (
        <div className={styles.container}>
          <Loader color="blue"/>
        </div>
      )
    }
    </>
  
}
