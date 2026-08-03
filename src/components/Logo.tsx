/**
 * La marca: un post-it apenas torcido sobre el violeta de la app.
 * Es la misma forma que el favicon (`src/app/icon.svg`); si cambia una, cambian
 * las dos.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-fondo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-fondo)" />
      <g transform="translate(6.5 6.5) rotate(-8 9.5 9.5)">
        <path d="M2 0h17v12.6L12.6 19H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Z" fill="#FFFDF5" />
        <path d="M19 12.6 12.6 19v-4.4a2 2 0 0 1 2-2H19Z" fill="#CFC4F2" />
      </g>
    </svg>
  );
}
