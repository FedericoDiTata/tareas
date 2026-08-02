import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 18,
  height: 18,
};

export const Plus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const X = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const Search = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const Star = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base} fill={filled ? "currentColor" : "none"} {...p}>
    <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6Z" />
  </svg>
);

export const Sun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const Moon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const Trash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const LinkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10.6 13.4a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
    <path d="M13.4 10.6a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.4-1.4" />
  </svg>
);

export const ImageIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17M14.5 15l1.8-1.8a2 2 0 0 1 2.8 0L21 15.5" />
  </svg>
);

export const FileIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 3v4.5a1.5 1.5 0 0 0 1.5 1.5H20" />
    <path d="M19.5 9.8V19a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.3L19.5 9.8Z" />
  </svg>
);

export const NoteIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 4H4v16h9l7-7V4Z" />
    <path d="M13 20v-7h7" />
  </svg>
);

export const ListIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 6.5h3.5M4 12h3.5M4 17.5h3.5M11 6.5h9M11 12h9M11 17.5h9" />
  </svg>
);

export const TextIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" />
  </svg>
);

export const Target = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const Grip = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const Dots = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const Palette = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.2a8.8 8.8 0 0 0 0 17.6c1.2 0 1.9-.9 1.9-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h1.4A4.9 4.9 0 0 0 21 9.9C21 6.2 16.9 3.2 12 3.2Z" />
    <circle cx="8" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="14" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const Undo = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9h9a5.5 5.5 0 0 1 0 11h-3" />
    <path d="m7.5 5.5-3.5 3.5 3.5 3.5" />
  </svg>
);

export const Download = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4v11M8 11.5l4 4 4-4M4.5 19.5h15" />
  </svg>
);

export const Upload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 16V5M8 8.5l4-4 4 4M4.5 19.5h15" />
  </svg>
);

export const BoardIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="5.5" height="16" rx="1.6" />
    <rect x="10.5" y="4" width="5.5" height="11" rx="1.6" />
    <rect x="18" y="4" width="3" height="8" rx="1.4" />
  </svg>
);

export const DeskIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="8" height="7" rx="1.6" transform="rotate(-6 7 8.5)" />
    <rect x="13" y="8" width="8" height="8" rx="1.6" transform="rotate(7 17 12)" />
    <rect x="6" y="14" width="7" height="6" rx="1.6" transform="rotate(3 9.5 17)" />
  </svg>
);

export const ZoomIn = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M11 8.5v5M8.5 11h5M20 20l-3.2-3.2" />
  </svg>
);

export const ZoomOut = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M8.5 11h5M20 20l-3.2-3.2" />
  </svg>
);

export const Crosshair = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </svg>
);

export const Connect = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="5.5" cy="6" r="2.5" />
    <circle cx="18.5" cy="18" r="2.5" />
    <path d="M8 6h5a3 3 0 0 1 3 3v6" />
  </svg>
);

export const Copy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
);

export const Sparkle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.6 8 18 9.5 13.6 11 12 15.5 10.4 11 6 9.5 10.4 8 12 3.5Z" />
    <path d="M18.5 15.5 19.2 17.3 21 18l-1.8.7-.7 1.8-.7-1.8L16 18l1.8-.7.7-1.8Z" />
  </svg>
);

export const Keyboard = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6 13.6h.01M9.5 13.6h6.5" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
);

export const Cloud = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 18.5h9.5a3.75 3.75 0 0 0 .5-7.46 5.5 5.5 0 0 0-10.4-1.6A4.2 4.2 0 0 0 7 18.5Z" />
  </svg>
);

export const Refresh = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20.5 4v4.5H16" />
  </svg>
);

export const Mail = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7.5 7.1 5a1.6 1.6 0 0 0 1.8 0l7.1-5" />
  </svg>
);

export const Corner = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 10v10H10" />
  </svg>
);
