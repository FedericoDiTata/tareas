"use client";

import { motion } from "motion/react";
import { COLOR_KEYS, COLOR_LABEL, ColorKey } from "@/lib/types";
import { cn } from "@/lib/ui";

interface Props {
  value: ColorKey;
  onChange: (color: ColorKey) => void;
  size?: "sm" | "md";
  className?: string;
}

export function ColorPicker({ value, onChange, size = "md", className }: Props) {
  const dot = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          title={COLOR_LABEL[key]}
          aria-label={COLOR_LABEL[key]}
          onClick={() => onChange(key)}
          className={cn(
            `tone-${key}`,
            dot,
            "relative grid place-items-center rounded-full transition-transform duration-150 hover:scale-115 active:scale-95",
          )}
        >
          <span
            className="h-full w-full rounded-full border"
            style={{
              background: "rgb(var(--tone) / 0.9)",
              borderColor: "rgb(var(--tone))",
            }}
          />
          {value === key && (
            <motion.span
              layoutId="color-ring"
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="absolute -inset-1 rounded-full border-2"
              style={{ borderColor: "rgb(var(--tone))" }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
