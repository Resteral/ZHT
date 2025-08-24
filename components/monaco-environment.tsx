"use client"

import { useEffect } from "react"

export function MonacoEnvironment() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Configure Monaco Editor web workers
      window.MonacoEnvironment = {
        getWorkerUrl: (moduleId: string, label: string) => {
          if (label === "json") {
            return "/monaco-editor/min/vs/language/json/json.worker.js"
          }
          if (label === "css" || label === "scss" || label === "less") {
            return "/monaco-editor/min/vs/language/css/css.worker.js"
          }
          if (label === "html" || label === "handlebars" || label === "razor") {
            return "/monaco-editor/min/vs/language/html/html.worker.js"
          }
          if (label === "typescript" || label === "javascript") {
            return "/monaco-editor/min/vs/language/typescript/ts.worker.js"
          }
          return "/monaco-editor/min/vs/editor/editor.worker.js"
        },
      }
    }
  }, [])

  return null
}

// Extend the Window interface to include MonacoEnvironment
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl?: (moduleId: string, label: string) => string
      getWorker?: (moduleId: string, label: string) => Worker
    }
  }
}
