"use client"

import type React from "react" // Keep this if using React namespace types

import { useState, useRef, DragEvent, ChangeEvent } from "react" // Added specific event types
import { Upload } from "lucide-react"

interface FileUploaderProps {
  id?: string; // <--- Add this line: Make id an optional string prop
  onFileChange: (file: File | null) => void;
  acceptedFileTypes?: string;
  maxSize?: number; // in MB
  disabled?: boolean; // <--- Add this line: Include disabled prop
}

export function FileUploader({
    id = "file-upload", // Use the id prop, provide a default
    onFileChange,
    acceptedFileTypes = ".pdf,.doc,.docx",
    maxSize = 5,
    disabled = false // Destructure and use the disabled prop
}: FileUploaderProps) { // <-- Ensure disabled is destructured here
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { // Specify event type
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return; // Prevent interaction if disabled
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { // Specify event type
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return;
    setIsDragging(false)
  }

  const validateFile = (file: File): boolean => {
    setError(null) // Clear previous errors

    // Check file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    // More robust type checking considering MIME types if needed, but extension check is common
    const acceptedExtensions = acceptedFileTypes.split(",").map((type) => type.trim().replace(".", "").toLowerCase());

    // Check MIME type first if available and specified in accept string
    const acceptedMIMETypes = acceptedFileTypes.split(",").map(t => t.trim()).filter(t => !t.startsWith('.'));
    let typeMatch = false;
    if (acceptedMIMETypes.length > 0 && acceptedMIMETypes.includes(file.type)) {
        typeMatch = true;
    }
    // Fallback/Also check extension
    if (!typeMatch && fileExtension && acceptedExtensions.includes(fileExtension)) {
        typeMatch = true;
    }

    if (!typeMatch && acceptedExtensions.length > 0 && !acceptedExtensions.includes('*')) { // Don't error if * is accepted
        setError(`Invalid file type. Accepted: ${acceptedFileTypes.replace(/,/g,', ').replace(/\./g,'')}`)
        return false
    }


    // Check file size
    if (maxSize && file.size > maxSize * 1024 * 1024) { // Check maxSize has a value
      setError(`File size exceeds ${maxSize}MB limit.`)
      return false
    }

    return true // File is valid
  }

  // Centralized handler for processing a file
  const processFile = (file: File | undefined | null) => {
      if (file && validateFile(file)) {
        setFileName(file.name)
        onFileChange(file)
      } else {
        // If validation failed or file is null/undefined
        setFileName(null)
        onFileChange(null)
         // Clear the actual input value if validation fails or file is cleared
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
         }
      }
  }


  const handleDrop = (e: DragEvent<HTMLDivElement>) => { // Specify event type
    e.preventDefault()
    e.stopPropagation()
     if (disabled) return;
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]) // Use the central handler
      e.dataTransfer.clearData() // Clean up
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => { // Specify event type
    processFile(e.target.files?.[0]) // Use the central handler
  }

  const handleBrowseClick = () => {
    if (!disabled && fileInputRef.current) { // Check disabled state
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-2"> {/* Reduced vertical spacing slightly */}
      <div
        className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors
          ${disabled ? 'cursor-not-allowed bg-muted/50 border-muted' : 'cursor-pointer'}
          ${isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick} // Click entire area to browse
        aria-disabled={disabled}
        role="button" // Indicate it's clickable
        tabIndex={disabled ? -1 : 0} // Make focusable unless disabled
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBrowseClick(); }} // Allow keyboard activation
      >
        <div className="flex flex-col items-center justify-center space-y-1 text-center"> {/* Adjusted spacing */}
          <Upload className={`h-8 w-8 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
          <div className="flex flex-col space-y-1">
            <p className={`text-sm ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}> {/* Adjusted color */}
              Drag & drop file or{' '}
              <span className={`font-medium ${disabled ? '' : 'text-primary underline underline-offset-2 cursor-pointer hover:text-primary/90'}`}> {/* Adjusted styling */}
                browse
              </span>
            </p>
            <p className={`text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}> {/* Adjusted color */}
              {/* Nicer display of accepted types */}
              {acceptedFileTypes.split(',').map(t => t.trim().replace('.','').toUpperCase()).join(', ')} | Max {maxSize}MB
            </p>
          </div>
        </div>
        <input
          id={id} // <--- Use the id prop here
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled} // Pass disabled state to input
        />
      </div>

      {/* Display selected file name or error */}
      {error && !disabled && <p className="text-sm font-medium text-destructive px-1">{error}</p>}
      {fileName && !error && !disabled && (
         // Added a simple display, you might want options to clear it
        <div className="text-sm text-muted-foreground px-1">
            Selected: <span className="font-medium text-foreground">{fileName}</span>
        </div>
      )}
    </div>
  )
}