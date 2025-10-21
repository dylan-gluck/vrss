import type React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/authStore";
import { useOfflineStore } from "@/lib/store/offlineStore";
import { MediaUpload } from "./MediaUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Image,
  Video,
  Music,
  Loader2,
  Send,
} from "lucide-react";

type PostType = "text" | "image" | "video" | "song";
type PostVisibility = "public" | "followers" | "private";

interface PostComposerProps {
  onPostCreated?: () => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [type, setType] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const user = useAuthStore((state) => state.user);
  const addToQueue = useOfflineStore((state) => state.addToQueue);
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: async (data: {
      type: PostType;
      content: string;
      visibility: PostVisibility;
      mediaIds?: string[];
    }) => {
      return api.post.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      setContent("");
      setMediaIds([]);
      setType("text");
      onPostCreated?.();
    },
    onError: (error) => {
      // Queue failed post in offline store
      addToQueue({
        type: "CREATE_POST",
        payload: { type, content, visibility, mediaIds: mediaIds.length > 0 ? mediaIds : undefined },
      });
      console.error("Failed to create post:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    // Validate media posts have mediaIds
    if (type !== "text" && mediaIds.length === 0) {
      alert("Please upload media for this post type");
      return;
    }

    createPostMutation.mutate({
      type,
      content,
      visibility,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    });
  };

  const handleMediaUploaded = (ids: string[]) => {
    setMediaIds(ids);
  };

  const postTypes: { value: PostType; icon: typeof FileText; label: string }[] = [
    { value: "text", icon: FileText, label: "Text" },
    { value: "image", icon: Image, label: "Image" },
    { value: "video", icon: Video, label: "Video" },
    { value: "song", icon: Music, label: "Song" },
  ];

  const visibilityOptions: { value: PostVisibility; label: string }[] = [
    { value: "public", label: "Public" },
    { value: "followers", label: "Followers" },
    { value: "private", label: "Private" },
  ];

  return (
    <Card className="p-4 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Post Type Selector */}
        <div className="flex gap-2">
          {postTypes.map(({ value, icon: Icon, label }) => (
            <Button
              key={value}
              type="button"
              variant={type === value ? "default" : "outline"}
              size="sm"
              onClick={() => setType(value)}
              className="flex-1"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content Input */}
        <Textarea
          placeholder={`What's on your mind, ${user?.username || "user"}?`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={10000}
          className="resize-none"
        />

        {/* Media Upload for non-text posts */}
        {type !== "text" && (
          <MediaUpload
            type={type}
            onMediaUploaded={handleMediaUploaded}
            mediaIds={mediaIds}
          />
        )}

        {/* Bottom Controls */}
        <div className="flex items-center justify-between">
          {/* Visibility Selector */}
          <div className="flex gap-2">
            {visibilityOptions.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant={visibility === value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setVisibility(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              !content.trim() ||
              createPostMutation.isPending ||
              (type !== "text" && mediaIds.length === 0)
            }
          >
            {createPostMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post
              </>
            )}
          </Button>
        </div>

        {/* Character Count */}
        <div className="text-xs text-muted-foreground text-right">
          {content.length} / 10,000
        </div>
      </form>
    </Card>
  );
}
