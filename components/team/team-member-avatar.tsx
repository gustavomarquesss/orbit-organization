import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function TeamMemberAvatar({
  name,
  avatarUrl,
  avatarColor,
  size = "default",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback
        className="font-medium text-white"
        style={{ backgroundColor: avatarColor || "#6366f1" }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
