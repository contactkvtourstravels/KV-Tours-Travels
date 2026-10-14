"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, MessageCircle, Calendar } from "lucide-react";
import { QuickInquiryModal } from "@/components/public/QuickInquiryModal";

interface PackageDetailClientActionsProps {
  packageId: string;
  packageName: string;
  packageSlug?: string;
  hasDepartures?: boolean;
  waUrl: string;
  onlinePaymentsEnabled?: boolean;
  maintenanceMessage?: string;
}

export function PackageDetailClientActions({
  packageId,
  packageName,
  packageSlug,
  hasDepartures = false,
  waUrl,
  onlinePaymentsEnabled = false,
  maintenanceMessage,
}: PackageDetailClientActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-3 pt-4">
      {onlinePaymentsEnabled && hasDepartures && packageSlug ? (
        <Link
          href={`/booking?package=${packageSlug}`}
          className="w-full h-12 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
        >
          <Compass className="w-4 h-4" />
          <span>Book This Journey</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full h-12 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span>Request Booking</span>
        </button>
      )}

      {!onlinePaymentsEnabled && (
        <div className="p-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[11px] text-[#5F6368] leading-tight text-center">
          {maintenanceMessage || "Online checkout is paused for routine maintenance. Submit your booking request above or reach our Coimbatore concierge on WhatsApp."}
        </div>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-11 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Enquire on WhatsApp</span>
      </a>

      <QuickInquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageId={packageId}
        packageName={packageName}
      />
    </div>
  );
}
