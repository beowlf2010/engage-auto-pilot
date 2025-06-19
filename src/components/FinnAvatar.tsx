
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

interface FinnAvatarProps {
  size?: "sm" | "md" | "lg";
}

const FinnAvatar = ({ size = "md" }: FinnAvatarProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white">
        <Bot className={iconSizes[size]} />
      </AvatarFallback>
    </Avatar>
  );
};

export default FinnAvatar;
