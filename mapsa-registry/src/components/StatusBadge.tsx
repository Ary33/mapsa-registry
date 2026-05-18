interface StatusBadgeProps {
  text: string;
  variant?: "default" | "red";
}

export default function StatusBadge({
  text,
  variant = "default",
}: StatusBadgeProps) {
  return (
    <span
      className={`mapsa-badge ${variant === "red" ? "mapsa-badge-red" : ""}`}
    >
      {text}
    </span>
  );
}
