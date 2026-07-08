"use client";

import { useCallback } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAsync } from "@/hooks/use-async";
import { getFarmerChatMessages } from "@/services/farmer.service";

interface ChatHistoryProps {
  farmerId: string;
}

export function ChatHistory({ farmerId }: ChatHistoryProps) {
  const fetcher = useCallback(
    () => getFarmerChatMessages(farmerId, 200),
    [farmerId],
  );
  const { data: messages, isLoading } = useAsync(fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-2/3" />
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return <EmptyState message="Belum ada riwayat chat dengan peternak ini." />;
  }

  return (
    <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto p-1">
      {messages.map((message) => {
        const isFarmer = message.role !== "assistant" && message.role !== "bot";

        return (
          <div
            key={message.id}
            className={cn("flex flex-col", isFarmer ? "items-start" : "items-end")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                isFarmer
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {message.content}
            </div>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {new Date(message.createdAt).toLocaleString("id-ID")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
