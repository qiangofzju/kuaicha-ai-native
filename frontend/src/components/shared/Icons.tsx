import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

const defaultSize = 20;

export const Icons = {
  Logo: ({ size = 28 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="url(#logoGrad)" />
      <path d="M8 14L12 10L16 14L12 18Z" fill="white" opacity="0.9" />
      <path d="M14 10L18 14L14 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#E8A838" />
          <stop offset="1" stopColor="#F06543" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Chat: ({ className, size = defaultSize }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10a7 7 0 1 1 3.5 6.06L3 17l.94-3.5A7 7 0 0 1 3 10Z" />
      <path d="M8 9h4M8 12h2" />
    </svg>
  ),
  Agent: ({ className, size = defaultSize }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="3" />
      <circle cx="8" cy="9" r="1.5" />
      <circle cx="12" cy="9" r="1.5" />
      <path d="M7.5 13c.5 1 2 1.5 2.5 1.5s2-.5 2.5-1.5" />
    </svg>
  ),
  Datashow: ({ className, size = defaultSize }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16V8l4-4 3 3 4-4 3 3v10H3Z" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="14" cy="9" r="1" fill="currentColor" />
    </svg>
  ),
  Send: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h12M11 5l4 4-4 4" />
    </svg>
  ),
  Search: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  ArrowRight: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  ),
  Play: ({ className, size = 14 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 2.5v9l8-4.5-8-4.5Z" />
    </svg>
  ),
  Doc: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M4 2h5l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M9 2v4h4M6 9h4M6 11h2" />
    </svg>
  ),
  Shield: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L3 5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L9 2Z" />
      <path d="M7 9l2 2 3-3.5" />
    </svg>
  ),
  Brain: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M9 15V9M6 6a3 3 0 0 1 6 0M4 9a3 3 0 0 0 3 3h4a3 3 0 0 0 0-6H7a3 3 0 0 0 0 6" />
    </svg>
  ),
  Network: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="9" cy="5" r="2" /><circle cx="4" cy="13" r="2" /><circle cx="14" cy="13" r="2" />
      <path d="M9 7v2M7 11l-2 1M11 11l2 1" />
    </svg>
  ),
  TrendUp: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l4-5 3 2 5-7" /><path d="M11 4h4v4" />
    </svg>
  ),
  Briefcase: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="6" width="14" height="9" rx="2" /><path d="M6 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Alert: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M9 2L2 15h14L9 2Z" /><path d="M9 7v4M9 13v.5" />
    </svg>
  ),
  Export: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M8 2v8M4 6l4-4 4 4M3 12h10v2H3z" />
    </svg>
  ),
  Pulse: ({ className, size = defaultSize }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10h3l2-5 3 10 2-5h6" />
    </svg>
  ),
  Sparkle: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0c.2 3.3 4.7 3.8 4.7 3.8S8.2 4.3 8 8c-.2-3.7-4.7-4.2-4.7-4.2S7.8 3.3 8 0ZM4 8c.1 2 2.8 2.3 2.8 2.3S4.1 10.6 4 12.5c-.1-1.9-2.8-2.2-2.8-2.2S3.9 10 4 8Z" />
    </svg>
  ),
  Clock: ({ className, size = 14 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.5" />
    </svg>
  ),
  Plus: ({ className, size = 14 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 3v8M3 7h8" />
    </svg>
  ),
  Filter: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M2 3h12M4 7h8M6 11h4" />
    </svg>
  ),
  BarChart: ({ className, size = defaultSize }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 16V10M8 16V6M12 16V8M16 16V4" />
    </svg>
  ),
  Refresh: ({ className, size = 14 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M1 7a6 6 0 0 1 10.4-4M13 7a6 6 0 0 1-10.4 4" /><path d="M11 1v3h-3M3 13v-3h3" />
    </svg>
  ),
  User: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="5" r="3" /><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  ),
  Settings: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" />
    </svg>
  ),
  Check: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 4 6-7" />
    </svg>
  ),
  Download: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M8 2v8M4 7l4 4 4-4M3 13h10" />
    </svg>
  ),
  Database: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="9" cy="5" rx="6" ry="2.5" />
      <path d="M3 5v4c0 1.38 2.69 2.5 6 2.5S15 10.38 15 9V5" />
      <path d="M3 9v4c0 1.38 2.69 2.5 6 2.5S15 14.38 15 13V9" />
    </svg>
  ),
  Upload: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12V4M5 7l4-4 4 4" />
      <path d="M3 14h12" />
    </svg>
  ),
  Table: ({ className, size = 18 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="14" height="12" rx="1.5" />
      <path d="M2 7h14M6 7v8" />
    </svg>
  ),
  SortAsc: ({ className, size = 14 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v8M4 6l3-3 3 3" />
    </svg>
  ),
  SortDesc: ({ className, size = 14 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v8M4 8l3 3 3-3" />
    </svg>
  ),
  Sun: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" />
    </svg>
  ),
  Moon: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M13.5 10A6 6 0 0 1 6 3a6 6 0 1 0 7.5 7Z" />
    </svg>
  ),
  LogOut: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l4-3-4-3M6 8h8" />
    </svg>
  ),
  Mail: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 5l7 5 7-5" />
    </svg>
  ),
  Key: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="7.5" r="3.5" />
      <path d="M8.5 10L14 14M11 12l1.5 1.5" />
    </svg>
  ),
  CreditCard: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 7h14M4 11h3" />
    </svg>
  ),
  Keyboard: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="14" height="8" rx="1.5" />
      <path d="M4 7.5h1M7.5 7.5h1M11 7.5h1M4 10.5h8" />
    </svg>
  ),
  ChevronUp: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l5-5 5 5" />
    </svg>
  ),
  ChevronDown: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l5 5 5-5" />
    </svg>
  ),
  Globe: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 1.5c-2 2-3 4-3 6.5s1 4.5 3 6.5M8 1.5c2 2 3 4 3 6.5s-1 4.5-3 6.5M1.5 8h13" />
    </svg>
  ),
  HelpCircle: ({ className, size = 16 }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5.8 6a2.2 2.2 0 0 1 4.4.7c0 1.5-2.2 2-2.2 3M8 12.5v.5" />
    </svg>
  ),
};

// Helper to get an agent icon component by name
export function getAgentIcon(iconName: string) {
  return (Icons as Record<string, React.FC<IconProps>>)[iconName] || Icons.Agent;
}
