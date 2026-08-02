"use client";

import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { Ref } from "react";
import { cn, useDebounced } from "@/lib/ui";

interface Props {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minHeight?: number;
  /** Enter (sin Shift) confirma en vez de saltar de línea. */
  submitOnEnter?: boolean;
  onSubmit?: (value: string) => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Textarea que crece con el texto y guarda con debounce. */
export function AutoGrow({
  value,
  onCommit,
  placeholder,
  className,
  autoFocus,
  minHeight = 0,
  submitOnEnter,
  onSubmit,
  onBlur,
  style,
  ref,
}: Props) {
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement, []);
  const [text, setText, flush] = useDebounced(value, onCommit);

  const resize = () => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  };

  useLayoutEffect(resize, [text, minHeight]);

  useEffect(() => {
    if (autoFocus) {
      const el = inner.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [autoFocus]);

  return (
    <textarea
      ref={inner}
      rows={1}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        flush();
        onBlur?.();
      }}
      onKeyDown={(e) => {
        if (submitOnEnter && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          flush();
          onSubmit?.(text);
        }
      }}
      className={cn(
        "w-full bg-transparent outline-none placeholder:text-ink-faint",
        className,
      )}
      style={{ ...style, overflow: "hidden" }}
    />
  );
}
