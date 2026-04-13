import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HardHat } from "lucide-react";
import { BriklyLogoIcon } from "./BriklyLogoIcon";
import { useTenant } from "@/contexts/TenantContext";
import { BRIKLY_LOGO_URL } from "@/lib/utils";

interface SmartLogoProps {
  className?: string;
  textClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  linkTo?: string;
  showText?: boolean; // Force text mode
  priority?: "remote" | "local" | "text"; // Override fallback order
}

const SmartLogo = ({
  className = "",
  textClassName = "",
  size = "md",
  linkTo = "/",
  showText = false,
  priority = "remote",
}: SmartLogoProps) => {
  const { tenant } = useTenant();
  const [imageState, setImageState] = useState<
    "loading" | "remote" | "local" | "text"
  >("loading");

  // Size configurations with max-width constraints
  const sizeClasses = {
    sm: "h-6 w-auto max-w-[120px]",
    md: "h-8 w-auto max-w-[160px]",
    lg: "h-10 w-auto max-w-[200px]",
    xl: "h-12 w-auto max-w-[240px]",
  };

  // Explicit pixel heights for layout stability
  const heightValues = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  // Image sources with fallback priority
  // Use tenant logo if available and white-label is enabled
  const useTenantLogo = tenant?.features?.white_label && tenant?.branding?.logo_url;

  const imageSources = {
    remote: useTenantLogo
      ? tenant.branding.logo_url!
      : BRIKLY_LOGO_URL,
    local: "/BriklyLogo.png",
  };

  // Get tenant display name for text fallback
  const brandName = useTenantLogo && tenant?.display_name
    ? tenant.display_name
    : "Brikly";

  // Force text mode if requested
  useEffect(() => {
    if (showText || priority === "text") {
      setImageState("text");
      return;
    }

    // Reset state when priority changes
    setImageState("loading");
  }, [showText, priority]);

  // Try loading images with fallback logic
  useEffect(() => {
    if (showText || imageState === "text") return;

    const tryImageLoad = (src: string, fallbackState: "local" | "text") => {
      const img = new Image();

      img.onload = () => {
        if (priority === "remote" && src === imageSources.remote) {
          setImageState("remote");
        } else if (priority === "local" && src === imageSources.local) {
          setImageState("local");
        } else if (src === imageSources.remote) {
          setImageState("remote");
        } else {
          setImageState("local");
        }
      };

      img.onerror = () => {
        if (fallbackState === "local") {
          // Try local image
          tryImageLoad(imageSources.local, "text");
        } else {
          // Fall back to text
          setImageState("text");
        }
      };

      img.src = src;
    };

    // Start with preferred source based on priority
    if (priority === "local") {
      tryImageLoad(imageSources.local, "text");
    } else {
      tryImageLoad(imageSources.remote, "local");
    }
  }, [imageState, priority, showText]);

  // Render the logo content
  const renderLogo = () => {
    // Image version (Tenant or Brikly native image)
    if (imageState !== "text" && !showText) {
      const currentSrc =
        imageState === "remote" ? imageSources.remote : imageSources.local;

      return (
        <img
          src={currentSrc}
          alt={brandName}
          height={heightValues[size]}
          width="auto"
          className={`${sizeClasses[size]} ${className}`}
          style={{ 
            maxHeight: `${heightValues[size]}px`, 
            height: `${heightValues[size]}px`,
            objectFit: "contain",
            display: "block"
          }}
          onError={() => {
            if (imageState === "remote") {
              setImageState("local");
            } else {
              setImageState("text");
            }
          }}
          loading="eager"
        />
      );
    }

    // Default Brikly Vector Logo (always shown if not a white-labeled tenant)
    return (
      <div className={`flex items-center gap-2 ${textClassName}`}>
        {/* Icon representation */}
        <div className="relative flex items-center justify-center">
          <BriklyLogoIcon className="w-8 h-8 drop-shadow-sm" />
        </div>

        {/* Text */}
        <div className={`font-bold tracking-tighter ${textSizes[size]} ml-1`}>
          <span className="text-construction-blue dark:text-white">Brik</span>
          <span className="text-construction-orange">ly</span>
        </div>
      </div>
    );
  };

  // Loading state
  if (imageState === "loading" && !showText) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gray-200 animate-pulse rounded flex items-center justify-center`}
      >
        <HardHat className="h-4 w-4 text-gray-400" />
      </div>
    );
  }

  // Wrap in link if specified
  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="flex items-center shrink-0 hover:opacity-80 transition-opacity"
      >
        {renderLogo()}
      </Link>
    );
  }

  return renderLogo();
};

// Hook for programmatic logo state checking
export const useLogoStatus = () => {
  const [status, setStatus] = useState<
    "checking" | "remote" | "local" | "text"
  >("checking");

  useEffect(() => {
    const checkImages = async () => {
      try {
        // Check remote first
        const remoteImg = new Image();
        const remotePromise = new Promise((resolve, reject) => {
          remoteImg.onload = () => resolve("remote");
          remoteImg.onerror = reject;
        });
        remoteImg.src = BRIKLY_LOGO_URL;

        await remotePromise;
        setStatus("remote");
      } catch {
        try {
          // Check local
          const localImg = new Image();
          const localPromise = new Promise((resolve, reject) => {
            localImg.onload = () => resolve("local");
            localImg.onerror = reject;
          });
          localImg.src = "/BriklyLogo.png";

          await localPromise;
          setStatus("local");
        } catch {
          setStatus("text");
        }
      }
    };

    checkImages();
  }, []);

  return status;
};

export default SmartLogo;
