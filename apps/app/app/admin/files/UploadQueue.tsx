"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/Button";

export type QueueStatus = "queued" | "uploading" | "done" | "chunk_failed" | "upload_failed";

export type QueueItem = {
  id: string;
  file: File;
  name: string;
  status: QueueStatus;
  reason?: string;
  attempts: number;
};

function statusLabel(item: QueueItem): string {
  switch (item.status) {
    case "queued":
      return "Waiting…";
    case "uploading":
      return item.attempts > 1 ? "Reuploading and indexing…" : "Uploading and indexing…";
    case "done":
      return "Indexed";
    case "chunk_failed":
      return item.reason ?? "Couldn't index this file";
    case "upload_failed":
      return item.reason ?? "Couldn't reach the server";
  }
}

function statusColor(status: QueueStatus): string {
  switch (status) {
    case "done":
      return "#16A34A";
    case "chunk_failed":
    case "upload_failed":
      return "#DC2626";
    default:
      return "#999";
  }
}

function StatusDot({ status }: { status: QueueStatus }) {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, transform: "scale(0.8)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          exit={{ opacity: 0, transform: "scale(0.8)" }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: "flex" }}
        >
          {status === "queued" && (
            <span
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4D4D4", display: "block" }}
            />
          )}
          {status === "uploading" && <span className="spinner" />}
          {status === "done" && <CheckCircle size={16} weight="fill" color="#16A34A" />}
          {(status === "chunk_failed" || status === "upload_failed") && (
            <WarningCircle size={16} weight="fill" color="#DC2626" />
          )}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

type Props = {
  items: QueueItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
};

export default function UploadQueue({ items, onRetry, onDismiss }: Props) {
  const reduce = useReducedMotion();

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 6 }}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(-4px) scale(0.98)" }
            }
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(-4px) scale(0.98)" }
            }
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 10,
            }}
          >
            <StatusDot status={item.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "#222",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </p>
              <p style={{ fontSize: 11.5, color: statusColor(item.status), margin: "2px 0 0" }}>
                {statusLabel(item)}
              </p>
            </div>
            {item.status === "chunk_failed" && (
              <Button type="button" variant="secondary" size="sm" full onClick={() => onRetry(item.id)} style={{ flexShrink: 0 }}>
                <ArrowClockwise size={12} /> Retry
              </Button>
            )}
            {item.status === "upload_failed" && (
              <Button type="button" variant="secondary" size="sm" full onClick={() => onDismiss(item.id)} style={{ flexShrink: 0 }}>
                <X size={12} /> Remove
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
