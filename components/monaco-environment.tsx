"use client"

import { useEffect } from "react"

export default function MonacoEnvironment() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).MonacoEnvironment = {
        getWorkerUrl: () => {
          return (
            "data:text/javascript;charset=utf-8," +
            encodeURIComponent(`
            self.MonacoEnvironment = {
              baseUrl: '/'
            };
            importScripts('/monaco-editor/min/vs/base/worker/workerMain.js');
          `)
          )
        },
      }
    }
  }, [])

  return null
}
