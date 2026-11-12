"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  Clock,
  Tag,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { publicOffersApi, PublicOfferListItem } from "@/lib/api";
import { getSafeImageUrl, getDestinationFallback, DESTINATION_FALLBACKS } from "@/lib/images";
import { TravelImage } from "@/components/public/TravelImage";

export function BestOffersSection() {
  const [offers, setOffers] = useState<PublicOfferListItem[]>([]);
  const [sectionEnabled, setSectionEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadOffers() {
      try {
        const res = await publicOffersApi.getPublicOffers();
        if (isMounted) {
          setSectionEnabled(res.section_enabled);
          setOffers(res.offers || []);
        }
      } catch {
        if (isMounted) {
          setOffers([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Safe image helper
  const getOfferImg = (offer: PublicOfferListItem) => {
    let raw = "";
    if (offer.cover_image_url) raw = offer.cover_image_url;
    else {
      raw = getDestinationFallback(offer.destination_slug || offer.package_slug || offer.package_name);
    }
    return getSafeImageUrl(raw);
  };

  // If section is master disabled, or zero offers, cleanly hide section without jarring skeleton flash
  if (!sectionEnabled || offers.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-white border-b border-[#E5E7EB] relative overflow-hidden">
      {/* Subtle gold ambient glow in top right */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#DFBA73]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Limited-Time Holiday Privileges</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#202124] tracking-tight">
              Best Promotional Offers
            </h2>
            <p className="text-[#5F6368] text-sm mt-2 max-w-xl font-light">
              Verified seasonal packages, advance-booking discounts, and signature escapes featuring
              exclusive savings from Coimbatore.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              href="/packages"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#202124] text-xs uppercase tracking-widest font-semibold text-[#202124] hover:bg-[#202124] hover:text-white transition-all shadow-xs"
            >
              <span>Explore All Packages</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[480px] rounded-3xl bg-neutral-100 animate-pulse border border-[#E5E7EB]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {offers.map((offer) => {
              const origPrice = Number(offer.original_price);
              const discPrice = Number(offer.discounted_price);
              const savings = Number(offer.savings);

              return (
                <div
                  key={offer.id}
                  className="group rounded-3xl overflow-hidden bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-300 flex flex-col shadow-sm hover:shadow-2xl hover:-translate-y-1 relative"
                >
                  {/* Card Cover Image */}
                  <div className="relative h-64 overflow-hidden bg-neutral-200">
                    <TravelImage
                      src={getOfferImg(offer)}
                      alt={offer.package_name}
                      fill
                      fallbackSlug={offer.destination_slug || offer.package_slug}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#E5E7EB] text-[#202124] text-[11px] uppercase tracking-wider font-semibold shadow-xs">
                        {offer.destination_name}
                      </span>

                      {/* Tasteful Discount Badge */}
                      <span className="px-3 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-xs uppercase tracking-wider font-bold shadow-md flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#1B1E22]" />
                        <span>{offer.discount_badge}</span>
                      </span>
                    </div>

                    {/* Bottom overlay info on image */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      {offer.offer_label && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest mb-1.5">
                          {offer.offer_label}
                        </span>
                      )}
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-white group-hover:text-[#F3E8D6] transition-colors leading-snug line-clamp-1">
                        {offer.package_name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Duration & Highlights Strip */}
                      <div className="flex items-center justify-between text-xs text-[#5F6368] pb-3 border-b border-neutral-100">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>
                            {offer.duration_days} Days / {offer.duration_nights} Nights
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>All-Inclusive</span>
                        </div>
                      </div>

                      {/* Price & Savings Display */}
                      <div className="pt-1">
                        <span className="text-[10px] uppercase tracking-widest text-[#5F6368] font-semibold block">
                          Per Traveller Base Price
                        </span>
                        <div className="flex items-baseline gap-2.5 mt-0.5">
                          <span className="text-base text-neutral-400 line-through">
                            ₹{origPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-2xl sm:text-3xl font-serif font-bold text-[#202124]">
                            ₹{discPrice.toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Savings Badge */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                          <span>You Save ₹{savings.toLocaleString("en-IN")} instantly</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-neutral-100 flex items-center gap-3">
                      <Link
                        href={`/booking?package=${offer.package_slug}&offer_id=${offer.id}`}
                        className="flex-1 h-11 px-5 rounded-full bg-[#202124] hover:bg-[#DFBA73] hover:text-[#1B1E22] text-white text-xs uppercase tracking-widest font-bold transition-all shadow-sm flex items-center justify-center gap-2 group/btn"
                      >
                        <span>Book This Offer</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                      </Link>

                      <Link
                        href={`/packages/${offer.package_slug}`}
                        title="View Full Package Details"
                        className="h-11 px-4 rounded-full border border-[#E5E7EB] hover:border-[#C5A880] text-xs font-semibold text-[#5F6368] hover:text-[#202124] transition-all flex items-center justify-center"
                      >
                        <span>Details</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
