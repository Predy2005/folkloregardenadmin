interface SectionHeaderProps {
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SectionHeader({ title, description, size = "md", className }: SectionHeaderProps) {
  const sizeClass = { sm: "text-sm", md: "text-base", lg: "text-lg" }[size];
  return (
    <div className={className}>
      <h3 className={`font-semibold ${sizeClass}`}>{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
