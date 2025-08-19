"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onUpload: (file: File) => Promise<any>
  acceptedTypes?: string
  maxSize?: number
  description?: string
}

export function FileUpload({
  onFileSelect,
  onUpload,
  acceptedTypes = ".csv",
  maxSize = 5,
  description,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File) => {
    // Validate file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    // Validate file type
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()
    if (acceptedTypes && !acceptedTypes.includes(`.${fileExtension}`)) {
      alert(`File type not supported. Accepted types: ${acceptedTypes}`)
      return
    }

    setFile(selectedFile)
    setResult(null)
    onFileSelect(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const uploadResult = await onUpload(file)

      clearInterval(progressInterval)
      setProgress(100)
      setResult(uploadResult)
    } catch (error) {
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : "Upload failed"],
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : file
              ? "border-green-500 bg-green-50"
              : "border-muted-foreground/25"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFile(null)
                setResult(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Drop file here or click to browse</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
          </>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0]
          if (selectedFile) handleFileSelect(selectedFile)
        }}
        className="hidden"
      />

      {/* File Description */}
      {description && <div className="text-xs text-muted-foreground">{description}</div>}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Upload Button */}
      {file && !uploading && !result && (
        <Button onClick={handleUpload} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Upload and Process
        </Button>
      )}

      {/* Upload Result */}
      {result && (
        <div
          className={`p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">{result.success ? "Upload Successful" : "Upload Failed"}</span>
          </div>

          {result.success && (
            <div className="text-sm text-green-700">
              <p>Records processed: {result.recordsProcessed}</p>
              <p>Records imported: {result.recordsImported}</p>
              {result.warnings?.length > 0 && <p>Warnings: {result.warnings.length}</p>}
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="text-sm text-red-700 mt-2">
              <p className="font-medium">Errors:</p>
              <ul className="list-disc list-inside">
                {result.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings?.length > 0 && (
            <div className="text-sm text-yellow-700 mt-2">
              <p className="font-medium">Warnings:</p>
              <ul className="list-disc list-inside">
                {result.warnings.map((warning: string, index: number) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
