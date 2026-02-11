import type { SVGProps } from "react";

const iconBase = "currentColor";

const NpmIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none">
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="#CB3837" />
    <path
      d="M6.5 15V9h4v4h1V9h4v6h-1v-4h-2v4h-2v-4h-2v4H6.5z"
      fill="white"
    />
  </svg>
);

const PnpmIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="6" height="6" fill="#F9AD00" />
    <rect x="9" y="3" width="6" height="6" fill="#F9AD00" />
    <rect x="15" y="3" width="6" height="6" fill="#F9AD00" />
    <rect x="3" y="9" width="6" height="6" fill="#4A4A4A" />
    <rect x="9" y="9" width="6" height="6" fill="#4A4A4A" />
    <rect x="15" y="9" width="6" height="6" fill="#4A4A4A" />
    <rect x="3" y="15" width="6" height="6" fill="#4A4A4A" />
    <rect x="9" y="15" width="6" height="6" fill="#4A4A4A" />
  </svg>
);

const YarnIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3.5C9.6 3.5 7.5 5.3 7.5 7.7c0 1.2.6 2.3 1.5 3l1.7 1.3-2.3 5.4a2 2 0 0 0 3.7 1.5l2-4.9 1.9 1.4a2.6 2.6 0 0 0 4.1-1.4c.2-.8 0-1.7-.6-2.3l-2.6-2.9A4.2 4.2 0 0 0 12 3.5Z"
      fill="#2C8EBB"
    />
  </svg>
);

const BunIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill={iconBase} />
    <circle cx="9.4" cy="10.5" r="1.1" fill="white" />
    <circle cx="14.6" cy="10.5" r="1.1" fill="white" />
    <path
      d="M8.8 14.1c.7.9 1.8 1.4 3.2 1.4s2.5-.5 3.2-1.4"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export { BunIcon, NpmIcon, PnpmIcon, YarnIcon };
