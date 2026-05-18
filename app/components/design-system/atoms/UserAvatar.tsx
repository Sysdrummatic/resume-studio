import Image from "next/image";
import React from "react";

interface UserAvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  src?: string;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  initials, 
  size = "md", 
  src, 
  className = "" 
}) => {
  const sizeMap = {
    sm: { dimension: "2rem", fontSize: "0.75rem" },
    md: { dimension: "3rem", fontSize: "0.875rem" },
    lg: { dimension: "4rem", fontSize: "1rem" },
    xl: { dimension: "6rem", fontSize: "1.5rem" },
  };

  const sizeStyle = sizeMap[size];

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: sizeStyle.dimension,
        height: sizeStyle.dimension,
        borderRadius: "999px",
        overflow: "hidden",
        flex: "0 0 auto",
        fontWeight: 700,
        fontSize: sizeStyle.fontSize,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: "#ffffff",
        background: src
          ? "linear-gradient(135deg, rgba(93, 124, 255, 0.16), rgba(125, 101, 247, 0.16))"
          : "linear-gradient(135deg, #5d7cff, #7d65f7)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 18px rgba(0, 0, 0, 0.18)",
      }}
    >
      {src ? (
        <Image src={src} alt="User avatar" fill sizes="96px" className="object-cover" />
      ) : (
        <span style={{ position: "relative", zIndex: 1, display: "block", textAlign: "center" }}>
          {initials.toUpperCase()}
        </span>
      )}
    </div>
  );
};
