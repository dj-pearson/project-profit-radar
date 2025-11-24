import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HardHat, Building } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

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
  const [imageError, setImageError] = useState(false);

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
      : "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png?width=200&quality=90",
    local: "/BuildDeskLogo.png",
  };

  // Get tenant display name for text fallback
  const brandName = useTenantLogo && tenant?.display_name
    ? tenant.display_name
    : "BuildDesk";

  // Force text mode if requested
  useEffect(() => {
    if (showText || priority === "text") {
      setImageState("text");
      return;
    }

    // Reset state when priority changes
    setImageState("loading");
    setImageError(false);
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
    // Text fallback version matching the brand design
    if (imageState === "text" || showText) {
      // For white-label tenants, show simple text
      if (useTenantLogo) {
        return (
          <div className={`flex items-center gap-2 ${textClassName}`}>
            <div className={`font-bold tracking-tight ${textSizes[size]}`}>
              <span style={{ color: tenant?.branding?.primary_color || '#F97316' }}>
                {brandName}
              </span>
            </div>
          </div>
        );
      }

      // Default BuildDesk logo
      return (
        <div className={`flex items-center gap-2 ${textClassName}`}>
          {/* Icon representation */}
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 bg-construction-blue rounded-full flex items-center justify-center relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-20">
                <Building className="h-4 w-4 absolute top-1 left-1 text-white" />
                <div className="absolute bottom-1 right-1 w-2 h-2 bg-white/30 rounded-sm" />
                <div className="absolute bottom-1 left-1 w-1 h-3 bg-white/30 rounded-sm" />
                <div className="absolute bottom-1 left-2.5 w-1 h-2 bg-white/30 rounded-sm" />
              </div>
              {/* Hard hat icon */}
              <HardHat className="h-4 w-4 text-construction-orange relative z-10" />
            </div>
          </div>

          {/* Text */}
          <div className={`font-bold tracking-tight ${textSizes[size]}`}>
            <span className="text-construction-orange">Build</span>
            <span className="text-construction-blue">Desk</span>
          </div>
        </div>
      );
    }

    // Image version
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
        remoteImg.src =
          "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png?width=200&quality=90";

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
          localImg.src = "/BuildDeskLogo.png";

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
