import sys
import os

# Add parent directory to path so app modules can be loaded
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func
from app.db.session import get_session_factory
from app.models.catalog import (
    Destination,
    DestinationImage,
    Package,
    PackageImage,
    PackageDay,
    Hotel,
    Activity,
    PackageHotel,
    PackageActivity,
    PackageDayActivity,
    PackageDeparture,
    BestOffer,
    Review,
)
from app.models.commerce import AddOn, AddOnPackage, AddOnDestination, Booking, Inquiry
from app.models.content import SiteSetting, BlogPost

def run_audit():
    factory = get_session_factory()
    with factory() as db:
        print("=== DATABASE CATALOG AUDIT ===")
        dest_count = db.query(func.count(Destination.id)).scalar()
        dest_pub = db.query(func.count(Destination.id)).filter(Destination.is_published.is_(True), Destination.deleted_at.is_(None)).scalar()
        dest_del = db.query(func.count(Destination.id)).filter(Destination.deleted_at.is_not(None)).scalar()
        
        pkg_count = db.query(func.count(Package.id)).scalar()
        pkg_pub = db.query(func.count(Package.id)).filter(Package.is_published.is_(True), Package.deleted_at.is_(None)).scalar()
        pkg_del = db.query(func.count(Package.id)).filter(Package.deleted_at.is_not(None)).scalar()

        dep_count = db.query(func.count(PackageDeparture.id)).scalar()
        offers_count = db.query(func.count(BestOffer.id)).scalar()
        hotels_count = db.query(func.count(Hotel.id)).scalar()
        activities_count = db.query(func.count(Activity.id)).scalar()
        addons_count = db.query(func.count(AddOn.id)).scalar()
        bookings_count = db.query(func.count(Booking.id)).scalar()
        inquiries_count = db.query(func.count(Inquiry.id)).scalar()
        dest_images_count = db.query(func.count(DestinationImage.id)).scalar()
        pkg_images_count = db.query(func.count(PackageImage.id)).scalar()
        pkg_days_count = db.query(func.count(PackageDay.id)).scalar()

        print(f"Destinations: {dest_count} (Published: {dest_pub}, Deleted: {dest_del})")
        print(f"Packages: {pkg_count} (Published: {pkg_pub}, Deleted: {pkg_del})")
        print(f"Package Departures (Group tours): {dep_count}")
        print(f"Best Offers: {offers_count}")
        print(f"Hotels: {hotels_count}")
        print(f"Activities: {activities_count}")
        print(f"Add-ons: {addons_count}")
        print(f"Bookings: {bookings_count}")
        print(f"Inquiries: {inquiries_count}")
        print(f"Destination Images: {dest_images_count}")
        print(f"Package Images: {pkg_images_count}")
        print(f"Package Days (Itinerary): {pkg_days_count}")

        print("\n--- Existing Destinations ---")
        destinations = db.query(Destination).all()
        for d in destinations:
            print(f"- [{d.id}] {d.name} ({d.slug}) | Country: {d.country} | Region/State: {d.region_or_state} | Pub: {d.is_published} | Del: {d.deleted_at is not None}")

        print("\n--- Existing Packages ---")
        packages = db.query(Package).all()
        for p in packages:
            print(f"- [{p.id}] {p.name} ({p.slug}) | Dest: {p.destination.name if p.destination else 'None'} | Days/Nights: {p.duration_days}D/{p.duration_nights}N | Price: {p.base_price} {p.currency} | Pub: {p.is_published}")

        print("\n--- Existing Departures / Group Trips ---")
        departures = db.query(PackageDeparture).all()
        for dep in departures:
            pkg_name = dep.package.name if dep.package else "Unknown"
            print(f"- [{dep.id}] Pkg: {pkg_name} | Date: {dep.departure_date} -> {dep.return_date} | Cap: {dep.available_capacity}/{dep.total_capacity} | Status: {dep.status}")

        print("\n--- Existing Best Offers ---")
        offers = db.query(BestOffer).all()
        for o in offers:
            pkg_name = o.package.name if o.package else "Unknown"
            line = f"- [{o.id}] {o.title} | Pkg: {pkg_name} | Type: {o.discount_type} {o.discount_value} | Status: {o.status} | Dates: {o.start_at} to {o.end_at}"
            print(line.encode("ascii", "replace").decode("ascii"))

        print("\n--- Existing Hotels ---")
        hotels = db.query(Hotel).all()
        for h in hotels:
            print(f"- [{h.id}] {h.name} | Dest: {h.destination.name if h.destination else 'None'} | Star: {h.star_rating}")

        print("\n--- Existing Activities ---")
        acts = db.query(Activity).all()
        for a in acts:
            print(f"- [{a.id}] {a.name} | Dest: {a.destination.name if a.destination else 'None'} | Price: {a.price}")

if __name__ == "__main__":
    run_audit()
