import React from "react";
import { LucideIcon } from "lucide-react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  iconSize?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  variant = "ghost",
  iconSize = 16,
  className = "",
  ...props
}) => {
  const baseStyle =
    "p-2 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 relative group";

  const variants = {
    primary: "bg-primary hover:bg-primary-hover active:bg-primary-active text-white",
    secondary: "bg-surface-secondary hover:bg-surface border border-border text-text-primary hover:text-text-primary",
    danger: "bg-error/10 hover:bg-error active:bg-error/90 text-error hover:text-white",
    ghost: "bg-transparent hover:bg-surface-secondary text-text-secondary hover:text-text-primary",
  };

  return (
    <button
      type="button"
      className={`${baseStyle} ${variants[variant]} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={iconSize} />
      <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface-secondary border border-border text-text-primary text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  );
};
