"use client";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
      {icon && <div className="mb-4 text-white/15">{icon}</div>}
      <h3 className="text-sm font-medium text-white/40 mb-1">{title}</h3>
      {description && <p className="text-xs text-white/25">{description}</p>}
    </div>
  );
}
