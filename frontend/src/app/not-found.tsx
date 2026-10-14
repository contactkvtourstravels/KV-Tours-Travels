import Link from "next/link";
import { Compass, Home, MapPin } from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";

export default function NotFound() {
  return (
    <PublicLayout>
      <section className="min-h-[70vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full border border-[#D3D8DF] bg-[#ECEFF3] text-[#24292F] flex items-center justify-center mx-auto shadow-2xs">
            <Compass className="w-8 h-8" />
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-[#5F6368] font-semibold block">
            Lost in Transit • 404
          </span>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#202124] tracking-tight">
            Destination Not Found
          </h1>

          <p className="text-[#70757A] text-sm leading-relaxed">
            The itinerary or travel page you are looking for has been moved, renamed, or is currently being updated by our Coimbatore team.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>

            <Link
              href="/destinations"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#F3F4F4] transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#3D4450]" />
              <span>Explore Destinations</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
