"""
RouteWise AI - Seeded Sample Logistics Data
Provides deterministic corridors, transport options, base rates, and schedules.
"""

from typing import Dict, List
from .models import JourneyOption, Location, TransportMode

LOCATIONS: Dict[str, Location] = {
    "Vijayawada": Location(id="BZA", name="Vijayawada Central Logistics Hub", city="Vijayawada", state="Andhra Pradesh"),
    "Visakhapatnam": Location(id="VTZ", name="Visakhapatnam Port & Express Hub", city="Visakhapatnam", state="Andhra Pradesh"),
    "Hyderabad": Location(id="HYD", name="Hyderabad Gateway Cargo Terminal", city="Hyderabad", state="Telangana"),
    "Bengaluru": Location(id="BLR", name="Bengaluru Tech Logistics Center", city="Bengaluru", state="Karnataka"),
    "Chennai": Location(id="MAA", name="Chennai Harbour & Rail Depot", city="Chennai", state="Tamil Nadu"),
}

# Baseline corridors and options (departure times defaulted to 08:00 AM IST on reference day)
SAMPLE_JOURNEY_OPTIONS: List[JourneyOption] = [
    # Corridor 1: Vijayawada -> Visakhapatnam (~350 km coastal corridor)
    JourneyOption(
        id="BZA-VTZ-RAIL-01",
        name="Andhra Express Freight Rail (Vande Cargo)",
        carrier="Indian Railways Coastal Division",
        mode=TransportMode.RAIL,
        origin="Vijayawada",
        destination="Visakhapatnam",
        distance_km=350.0,
        base_duration_hours=4.2,
        base_cost_inr=1450.0,
        weight_capacity_kg=50.0,
        reliability_score=0.94,
        carbon_emissions_kg=12.6,
        departure_time="08:00",
        assumptions=[
            "Fixed rail line timetable with high on-time priority",
            "Direct electrified track corridor along NH16 rail alignment",
            "Standard terminal clearance within 25 minutes",
        ],
    ),
    JourneyOption(
        id="BZA-VTZ-ROAD-EXP",
        name="Coastal Corridor Highway Express (NH16)",
        carrier="AP Logistics Roadlines",
        mode=TransportMode.EXPRESS_ROAD,
        origin="Vijayawada",
        destination="Visakhapatnam",
        distance_km=365.0,
        base_duration_hours=5.5,
        base_cost_inr=1100.0,
        weight_capacity_kg=80.0,
        reliability_score=0.88,
        carbon_emissions_kg=28.5,
        departure_time="08:15",
        assumptions=[
            "Direct 6-lane National Highway 16 route via Rajahmundry",
            "Moderate toll plaza clearance delays accounted for",
            "Subject to weather or highway maintenance checkpoints",
        ],
    ),
    JourneyOption(
        id="BZA-VTZ-ROAD-STD",
        name="Standard Intercity Freight Road",
        carrier="Deccan Cargo Carriers",
        mode=TransportMode.ROAD,
        origin="Vijayawada",
        destination="Visakhapatnam",
        distance_km=365.0,
        base_duration_hours=7.5,
        base_cost_inr=750.0,
        weight_capacity_kg=150.0,
        reliability_score=0.81,
        carbon_emissions_kg=34.0,
        departure_time="08:30",
        assumptions=[
            "Consolidated freight carrier with 2 hub transshipment halts",
            "Economical non-express routing",
            "Buffer for local city distribution at destination",
        ],
    ),
    JourneyOption(
        id="BZA-VTZ-AIR-01",
        name="Regional Air Cargo Priority Shuttle",
        carrier="IndiGo Cargo & Regional Wing",
        mode=TransportMode.AIR,
        origin="Vijayawada",
        destination="Visakhapatnam",
        distance_km=310.0,
        base_duration_hours=2.3,
        base_cost_inr=3200.0,
        weight_capacity_kg=25.0,
        reliability_score=0.96,
        carbon_emissions_kg=76.0,
        departure_time="09:00",
        assumptions=[
            "Flight time 55 minutes plus 80 minutes security, loading & ground handling",
            "Strict volumetric and dangerous goods compliance",
            "Premium expedited ramp transfer at Visakhapatnam Airport (VTZ)",
        ],
    ),

    # Corridor 2: Hyderabad -> Bengaluru (~570 km)
    JourneyOption(
        id="HYD-BLR-AIR-01",
        name="Hyderabad-Bengaluru Express Air Cargo",
        carrier="Blue Dart Aviation",
        mode=TransportMode.AIR,
        origin="Hyderabad",
        destination="Bengaluru",
        distance_km=500.0,
        base_duration_hours=2.8,
        base_cost_inr=3800.0,
        weight_capacity_kg=35.0,
        reliability_score=0.95,
        carbon_emissions_kg=92.0,
        departure_time="08:30",
        assumptions=["Direct air connection between RGIA and KIA hubs"],
    ),
    JourneyOption(
        id="HYD-BLR-ROAD-EXP",
        name="NH44 Express Logistics Trunk",
        carrier="VRL Logistics Fastrack",
        mode=TransportMode.EXPRESS_ROAD,
        origin="Hyderabad",
        destination="Bengaluru",
        distance_km=575.0,
        base_duration_hours=8.5,
        base_cost_inr=1850.0,
        weight_capacity_kg=120.0,
        reliability_score=0.87,
        carbon_emissions_kg=48.0,
        departure_time="08:00",
        assumptions=["Direct 4-lane NH44 corridor via Kurnool and Anantapur"],
    ),
    JourneyOption(
        id="HYD-BLR-RAIL-01",
        name="Deccan South Freight Express",
        carrier="South Central Railway Cargo",
        mode=TransportMode.RAIL,
        origin="Hyderabad",
        destination="Bengaluru",
        distance_km=620.0,
        base_duration_hours=11.0,
        base_cost_inr=1250.0,
        weight_capacity_kg=200.0,
        reliability_score=0.91,
        carbon_emissions_kg=21.0,
        departure_time="07:30",
        assumptions=["Dedicated containerized freight rake"],
    ),
]


def get_options_for_route(origin: str, destination: str) -> List[JourneyOption]:
    """Retrieve all available sample journey options for a given origin and destination."""
    origin_clean = origin.strip().lower()
    dest_clean = destination.strip().lower()
    
    matches = [
        opt for opt in SAMPLE_JOURNEY_OPTIONS
        if opt.origin.lower() == origin_clean and opt.destination.lower() == dest_clean
    ]
    return matches
