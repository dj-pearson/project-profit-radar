import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HardHat, Building } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveLogoProps {
  className?: string;
  textClassName?: string;
  linkTo?: string;
  showText?: boolean;
  priority?: "remote" | "local" | "text";

  // Mobile-specific options
  mobileSize?: "sm" | "md" | "lg";
  desktopSize?: "md" | "lg" | "xl";

  // Alternative image sources for mobile
  mobileRemoteUrl?: string;
  mobileLocalUrl?: string;

  // Force different modes per device
  mobileShowText?: boolean;
  desktopShowText?: boolean;
}

const ResponsiveLogo = ({
  className = "",
  textClassName = "",
  linkTo = "/",
  showText = false,
  priority = "remote",
  mobileSize = "md",
  desktopSize = "md",
  mobileRemoteUrl,
  mobileLocalUrl,
  mobileShowText = false,
  desktopShowText = false,
}: ResponsiveLogoProps) => {
  const isMobile = useIsMobile();
  const [imageState, setImageState] = useState<
    "loading" | "remote" | "local" | "text"
  >("loading");

  // Dynamic size based on device
  const currentSize = isMobile ? mobileSize : desktopSize;

  // Dynamic show text based on device
  const shouldShowText =
    showText || (isMobile ? mobileShowText : desktopShowText);

  // Size configurations
  const sizeClasses = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-10 w-auto",
    xl: "h-12 w-auto",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  // Image sources with mobile alternatives
  const imageSources = {
    remote:
      isMobile && mobileRemoteUrl
        ? mobileRemoteUrl
        : "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets//BuildDeskLogo.png",
    local: isMobile && mobileLocalUrl ? mobileLocalUrl : "/BuildDeskLogo.png",
  };

  // Force text mode if requested
  useEffect(() => {
    if (shouldShowText || priority === "text") {
      setImageState("text");
      return;
    }

    // Reset state when dependencies change
    setImageState("loading");
  }, [shouldShowText, priority, isMobile]);

  // Try loading images with fallback logic
  useEffect(() => {
    if (shouldShowText || imageState === "text") return;

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
  }, [
    imageState,
    priority,
    shouldShowText,
    imageSources.remote,
    imageSources.local,
  ]);

  // Render the logo content
  const renderLogo = () => {
    // Text fallback version matching the brand design
    if (imageState === "text" || shouldShowText) {
      return (
        <div className={`flex items-center gap-2 ${textClassName}`}>
          {/* Icon representation */}
          <div className="relative flex items-center justify-center">
            <div
              className={`${iconSizes[currentSize]} bg-construction-blue rounded-full flex items-center justify-center relative overflow-hidden`}
            >
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

          {/* Text - Hide on very small screens if needed */}
          {!isMobile || currentSize !== "sm" ? (
            <div
              className={`font-bold tracking-tight ${textSizes[currentSize]}`}
            >
              <span className="text-construction-orange">Build</span>
              <span className="text-construction-blue">Desk</span>
            </div>
          ) : null}
        </div>
      );
    }

    // Image version
    const currentSrc =
      imageState === "remote" ? imageSources.remote : imageSources.local;

    return (
      <img
        src={currentSrc}
        alt="BuildDesk"
        className={`${sizeClasses[currentSize]} ${className}`}
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
  if (imageState === "loading" && !shouldShowText) {
    return (
      <div
        className={`${sizeClasses[currentSize]} bg-gray-200 animate-pulse rounded flex items-center justify-center`}
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

// Advanced hook for comprehensive logo status
export const useResponsiveLogoStatus = () => {
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<{
    state: "checking" | "remote" | "local" | "text";
    device: "mobile" | "desktop";
    sources: {
      remote: string;
      local: string;
    };
  }>({
    state: "checking",
    device: isMobile ? "mobile" : "desktop",
    sources: {
      remote:
        "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets//BuildDeskLogo.png",
      local: "/BuildDeskLogo.png",
    },
  });

  useEffect(() => {
    const checkImages = async () => {
      const sources = {
        remote:
          "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets//BuildDeskLogo.png",
        local: "/BuildDeskLogo.png",
      };

      try {
        // Check remote first
        const remoteImg = new Image();
        const remotePromise = new Promise((resolve, reject) => {
          remoteImg.onload = () => resolve("remote");
          remoteImg.onerror = reject;
        });
        remoteImg.src = sources.remote;

        await remotePromise;
        setStatus({
          state: "remote",
          device: isMobile ? "mobile" : "desktop",
          sources,
        });
      } catch {
        try {
          // Check local
          const localImg = new Image();
          const localPromise = new Promise((resolve, reject) => {
            localImg.onload = () => resolve("local");
            localImg.onerror = reject;
          });
          localImg.src = sources.local;

          await localPromise;
          setStatus({
            state: "local",
            device: isMobile ? "mobile" : "desktop",
            sources,
          });
        } catch {
          setStatus({
            state: "text",
            device: isMobile ? "mobile" : "desktop",
            sources,
          });
        }
      }
    };

    checkImages();
  }, [isMobile]);

  return status;
};

export default ResponsiveLogo;
