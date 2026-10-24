"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { Compass } from "lucide-react";
import { getSafeImageUrl, getDestinationFallback, DESTINATION_FALLBACKS } from "@/lib/images";

export interface TravelImageProps extends Omit<ImageProps, "onError"> {
  fallbackSlug?: string | null;
  containerClassName?: string;
}

/**
 * Premium, resilient travel image component.
 * - Protects against broken images, 404s, and remote CDN blocks.
 * - Gracefully falls back to destination-specific luxury photography.
 * - Displays a luxury neutral placeholder if both remote and fallback fail.
 * - Eliminates layout shifts and broken image icons.
 */
export function TravelImage({
  src,
  alt,
  fallbackSlug,
  className = "",
  containerClassName,
  priority = false,
  fill = true,
  ...rest
}: TravelImageProps) {
  const primaryFallback = getDestinationFallback(fallbackSlug || alt);
  const initialResolved = typeof src === "string" ? getSafeImageUrl(src, primaryFallback) : src;

  const [currentSrc, setCurrentSrc] = useState(initialResolved);
  const [errorCount, setErrorCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync if source prop changes
  useEffect(() => {
    const nextResolved = typeof src === "string" ? getSafeImageUrl(src, primaryFallback) : src;
    setCurrentSrc(nextResolved);
    setErrorCount(0);
    setIsLoaded(false);
  }, [src, primaryFallback]);

  const handleError = () => {
    if (errorCount === 0) {
      // First attempt: try destination-specific fallback
      setErrorCount(1);
      setCurrentSrc(primaryFallback);
    } else if (errorCount === 1) {
      // Second attempt: try global default fallback
      setErrorCount(2);
      setCurrentSrc(DESTINATION_FALLBACKS.default);
    } else {
      // Third attempt: give up and show neutral placeholder
      setErrorCount(3);
    }
  };

  if (errorCount >= 3 || !currentSrc) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#24292F] to-[#14171A] text-white/50 select-none ${
          containerClassName || ""
        }`}
      >
        <Compass className="w-10 h-10 text-[#C5A880]/60 mb-2 animate-pulse" />
        <span className="text-[11px] uppercase tracking-widest text-white/60 font-medium">
          {alt || "The Wild Root"}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt || "Travel Experience"}
      fill={fill}
      priority={priority}
      onError={handleError}
      onLoad={() => setIsLoaded(true)}
      className={`${className} transition-opacity duration-500 ${
        isLoaded ? "opacity-100" : "opacity-90"
      }`}
      {...rest}
    />
  );
}

export default TravelImage;
