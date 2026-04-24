export default function CrabLogo({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="16" cy="18" rx="7" ry="5.5" />
      <circle cx="13" cy="11" r="1.8" />
      <circle cx="19" cy="11" r="1.8" />
      <rect x="12.3" y="12.5" width="1.4" height="2.5" rx=".5" />
      <rect x="18.3" y="12.5" width="1.4" height="2.5" rx=".5" />
      <path d="M 2 16 Q 2 14 4 14 Q 7 14 9 16 L 9 17 L 6 17 Z" />
      <path d="M 2 20 Q 2 22 4 22 Q 7 22 9 20 L 9 19 L 6 19 Z" />
      <path d="M 30 16 Q 30 14 28 14 Q 25 14 23 16 L 23 17 L 26 17 Z" />
      <path d="M 30 20 Q 30 22 28 22 Q 25 22 23 20 L 23 19 L 26 19 Z" />
      <path d="M 10 22 L 8 26" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M 13 23 L 12 27" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M 19 23 L 20 27" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M 22 22 L 24 26" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
    </svg>
  );
}
