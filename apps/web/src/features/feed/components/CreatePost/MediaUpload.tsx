import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileImage, FileVideo, FileAudio, Loader2 } from "lucide-react";

type MediaType = "image" | "video" | "song";

interface MediaUploadProps {
  type: MediaType;
  onMediaUploaded: (mediaIds: string[]) => void;
  mediaIds: string[];
}

interface UploadProgress {
  loaded: number;
  total: number;
}

export function MediaUpload({ type, onMediaUploaded, mediaIds }: MediaUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Accept different file types based on post type
  const acceptTypes = {
    image: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
    video: { "video/*": [".mp4", ".webm", ".mov"] },
    song: { "audio/*": [".mp3", ".wav", ".ogg", ".m4a"] },
  };

  // Two-phase upload: 1) Upload file, 2) Get media ID
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Simulate upload progress (in real implementation, use XMLHttpRequest for progress)
      setUploadProgress({ loaded: 0, total: file.size });

      // Phase 1: Upload file to storage
      // NOTE: This is a placeholder - actual implementation would use a dedicated upload endpoint
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { mediaId } = await uploadResponse.json();

      setUploadProgress({ loaded: file.size, total: file.size });

      // Phase 2: Return media ID for post creation
      return mediaId as string;
    },
    onSuccess: (mediaId) => {
      onMediaUploaded([...mediaIds, mediaId]);
      setUploadProgress(null);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      setUploadProgress(null);
      alert("Upload failed. Please try again.");
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file) return;

      setUploadedFiles([file]);

      // Validate file size (max 100MB for video, 50MB for image, 20MB for audio)
      const maxSize = type === "video" ? 100 * 1024 * 1024 : type === "image" ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`);
        return;
      }

      uploadMutation.mutate(file);
    },
    [type, uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptTypes[type],
    multiple: false,
    maxSize: type === "video" ? 100 * 1024 * 1024 : type === "image" ? 50 * 1024 * 1024 : 20 * 1024 * 1024,
  });

  const handleRemove = () => {
    setUploadedFiles([]);
    onMediaUploaded([]);
    setUploadProgress(null);
  };

  const getIcon = () => {
    switch (type) {
      case "image":
        return FileImage;
      case "video":
        return FileVideo;
      case "song":
        return FileAudio;
      default:
        return Upload;
    }
  };

  const Icon = getIcon();

  const progressPercentage = uploadProgress
    ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-2">
      {/* Upload Area */}
      {uploadedFiles.length === 0 && !uploadProgress && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors hover:border-primary hover:bg-primary/5
            ${isDragActive ? "border-primary bg-primary/10" : "border-border"}
          `}
        >
          <input {...getInputProps()} />
          <Icon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? `Drop ${type} file here`
              : `Drag and drop ${type} file, or click to browse`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max size:{" "}
            {type === "video" ? "100MB" : type === "image" ? "50MB" : "20MB"}
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="space-y-2 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Uploading...</span>
            <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Uploaded File Preview */}
      {uploadedFiles.length > 0 && !uploadProgress && mediaIds.length > 0 && uploadedFiles[0] && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
          <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uploadedFiles[0].name}</p>
            <p className="text-xs text-muted-foreground">
              {(uploadedFiles[0].size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploadMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loading State */}
      {uploadMutation.isPending && !uploadProgress && (
        <div className="flex items-center justify-center p-6 border rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Processing upload...</span>
        </div>
      )}
    </div>
  );
}
