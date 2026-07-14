function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#5E8265" />
      <path d="M20 16 H38 L44 22 V48 H20 Z" fill="#EEF5EE" />
      <path d="M38 16 L38 22 L44 22 Z" fill="#3F5C46" />
      <line x1="24" y1="34" x2="40" y2="34" stroke="#5E8265" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="41" x2="40" y2="41" stroke="#5E8265" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M47 10 L49 14 L53 15 L49 16 L47 20 L45 16 L41 15 L45 14 Z" fill="#C7A24A" />
    </svg>
  );
}

export default Logo;