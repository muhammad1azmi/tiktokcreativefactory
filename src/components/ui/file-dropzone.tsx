"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
    onFilesChange: (files: File[]) => void;
    accept?: string;
    maxFiles?: number;
    label?: string;
    sublabel?: string;
    icon?: "image" | "video";
    className?: string;
}

export function FileDropzone({
    onFilesChange,
    accept = "image/*",
    maxFiles = 14,
    label = "Drag & drop files here",
    sublabel = "or click to browse",
    icon = "image",
    className,
}: FileDropzoneProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);

            const droppedFiles = Array.from(e.dataTransfer.files).slice(
                0,
                maxFiles - files.length
            );
            const newFiles = [...files, ...droppedFiles].slice(0, maxFiles);
            setFiles(newFiles);
            onFilesChange(newFiles);
        },
        [files, maxFiles, onFilesChange]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) {
                const selectedFiles = Array.from(e.target.files).slice(
                    0,
                    maxFiles - files.length
                );
                const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
                setFiles(newFiles);
                onFilesChange(newFiles);
            }
        },
        [files, maxFiles, onFilesChange]
    );

    const removeFile = useCallback(
        (index: number) => {
            const newFiles = files.filter((_, i) => i !== index);
            setFiles(newFiles);
            onFilesChange(newFiles);
        },
        [files, onFilesChange]
    );

    const Icon = icon === "video" ? Film : ImageIcon;

    return (
        <div className={cn("space-y-3", className)}>
            <motion.div
                className={cn(
                    "dropzone relative flex flex-col items-center justify-center p-8 cursor-pointer min-h-[200px]",
                    isDragOver && "drag-over"
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <input
                    type="file"
                    accept={accept}
                    multiple={maxFiles > 1}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <motion.div
                    animate={{ y: isDragOver ? -5 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-3"
                >
                    <div className="p-4 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-80">
                        <Icon className="w-8 h-8 text-black" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">{sublabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {files.length}/{maxFiles} files
                        </p>
                    </div>
                </motion.div>
            </motion.div>

            {/* File previews */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-4 gap-2"
                    >
                        {files.map((file, index) => (
                            <motion.div
                                key={`${file.name}-${index}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                            >
                                {file.type.startsWith("image/") ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Film className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}
                                <button
                                    onClick={() => removeFile(index)}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
