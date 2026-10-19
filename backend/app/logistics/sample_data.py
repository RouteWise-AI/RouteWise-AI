"""
RouteWise AI - Seeded Sample Logistics Data
Provides deterministic corridors, transport options, base rates, and schedules.
Expanded with 6 representative Indian logistics corridors and carbon footprint data.
"""

from typing import Any, Dict, List, Optional
from .models import JourneyOption, Location, TransportMode

LOCATIONS: Dict[str, Location] = {
    "Vijayawada": Location(
        id="BZA",
        name="Vijayawada Central Logistics Hub",
        city="Vijayawada",
        state="Andhra Pradesh",
        lat=16.5062,
        lon=80.6480,
        rail_code="BZA",
        airport_code="VGA",
        aliases=["bezawada", "bza"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Visakhapatnam": Location(
        id="VTZ",
        name="Visakhapatnam Port & Express Hub",
        city="Visakhapatnam",
        state="Andhra Pradesh",
        lat=17.6868,
        lon=83.2185,
        rail_code="VSKP",
        airport_code="VTZ",
        aliases=["vizag", "waltair", "vtz", "visakhapatnam port", "vizag port"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Hyderabad": Location(
        id="HYD",
        name="Hyderabad Gateway Cargo Terminal",
        city="Hyderabad",
        state="Telangana",
        lat=17.3850,
        lon=78.4867,
        rail_code="SC",
        airport_code="HYD",
        aliases=["secunderabad", "hyd", "cyberabad"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Bengaluru": Location(
        id="BLR",
        name="Bengaluru Tech Logistics Center",
        city="Bengaluru",
        state="Karnataka",
        lat=12.9716,
        lon=77.5946,
        rail_code="SBC",
        airport_code="BLR",
        aliases=["bangalore", "blr"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Chennai": Location(
        id="MAA",
        name="Chennai Harbour & Rail Depot",
        city="Chennai",
        state="Tamil Nadu",
        lat=13.0827,
        lon=80.2707,
        rail_code="MAS",
        airport_code="MAA",
        aliases=["madras", "maa", "mas", "chennai port", "chennai harbour", "chennai harbor"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Mumbai": Location(
        id="BOM",
        name="Mumbai JNPT Cargo Gateway",
        city="Mumbai",
        state="Maharashtra",
        lat=19.0760,
        lon=72.8777,
        rail_code="CSMT",
        airport_code="BOM",
        aliases=["bombay", "bom", "csmt", "jnpt", "nhava sheva", "mumbai port", "jnpt port"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Pune": Location(
        id="PNQ",
        name="Pune Industrial Logistics Hub",
        city="Pune",
        state="Maharashtra",
        lat=18.5204,
        lon=73.8567,
        rail_code="PUNE",
        airport_code="PNQ",
        aliases=["poona", "pnq"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Delhi": Location(
        id="DEL",
        name="Delhi NCR Air & Rail Freight Hub",
        city="Delhi",
        state="Delhi",
        lat=28.6139,
        lon=77.2090,
        rail_code="NDLS",
        airport_code="DEL",
        aliases=["new delhi", "del", "ndls", "ncr", "delhi ncr"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Chandigarh": Location(
        id="IXC",
        name="Chandigarh Tricity Cargo Hub",
        city="Chandigarh",
        state="Punjab",
        lat=30.7333,
        lon=76.7794,
        rail_code="CDG",
        airport_code="IXC",
        aliases=["ixc", "cdg", "mohali", "panchkula", "tricity"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
    "Coimbatore": Location(
        id="CJB",
        name="Coimbatore Textile & Industrial Hub",
        city="Coimbatore",
        state="Tamil Nadu",
        lat=11.0168,
        lon=76.9558,
        rail_code="CBE",
        airport_code="CJB",
        aliases=["kovai", "cjb", "cbe"],
        supported_modes=[TransportMode.RAIL, TransportMode.EXPRESS_ROAD, TransportMode.ROAD, TransportMode.AIR],
    ),
}

# Baseline corridors and options (departure times defaulted to 08:00 AM IST on reference day)
SAMPLE_JOURNEY_OPTIONS: List[JourneyOption] = [
    # === Corridor 1: Vijayawada -> Visakhapatnam (~350 km coastal corridor) ===
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

    # === Corridor 2: Hyderabad -> Bengaluru (~570 km) ===
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

    # === Corridor 3: Chennai -> Vijayawada (~430 km) ===
    JourneyOption(
        id="MAA-BZA-RAIL-01",
        name="Coromandel Freight Express",
        carrier="South Railway Eastern Freight",
        mode=TransportMode.RAIL,
        origin="Chennai",
        destination="Vijayawada",
        distance_km=430.0,
        base_duration_hours=5.5,
        base_cost_inr=1650.0,
        weight_capacity_kg=80.0,
        reliability_score=0.92,
        carbon_emissions_kg=15.4,
        departure_time="07:45",
        assumptions=["Primary Chennai-Howrah rail line via Nellore", "High-frequency freight slot"],
    ),
    JourneyOption(
        id="MAA-BZA-ROAD-EXP",
        name="East Coast Express Road (NH16)",
        carrier="DTDC Surface Express",
        mode=TransportMode.EXPRESS_ROAD,
        origin="Chennai",
        destination="Vijayawada",
        distance_km=445.0,
        base_duration_hours=7.0,
        base_cost_inr=1300.0,
        weight_capacity_kg=100.0,
        reliability_score=0.85,
        carbon_emissions_kg=36.8,
        departure_time="08:00",
        assumptions=["NH16 coastal highway via Nellore bypass"],
    ),
    JourneyOption(
        id="MAA-BZA-AIR-01",
        name="Chennai-Vijayawada Air Cargo Link",
        carrier="SpiceJet Cargo",
        mode=TransportMode.AIR,
        origin="Chennai",
        destination="Vijayawada",
        distance_km=380.0,
        base_duration_hours=2.5,
        base_cost_inr=3600.0,
        weight_capacity_kg=30.0,
        reliability_score=0.93,
        carbon_emissions_kg=82.0,
        departure_time="09:15",
        assumptions=["60-minute flight plus ground handling at both ends"],
    ),

    # === Corridor 4: Mumbai -> Pune (~150 km) ===
    JourneyOption(
        id="BOM-PNQ-RAIL-01",
        name="Deccan Express Freight (CSMT-Pune)",
        carrier="Central Railway Mumbai Division",
        mode=TransportMode.RAIL,
        origin="Mumbai",
        destination="Pune",
        distance_km=155.0,
        base_duration_hours=3.2,
        base_cost_inr=680.0,
        weight_capacity_kg=60.0,
        reliability_score=0.93,
        carbon_emissions_kg=5.6,
        departure_time="07:30",
        assumptions=["Via Ghats via Karjat route", "Standard parcel van service"],
    ),
    JourneyOption(
        id="BOM-PNQ-ROAD-EXP",
        name="Mumbai-Pune Expressway Sprint",
        carrier="Delhivery Surface Express",
        mode=TransportMode.EXPRESS_ROAD,
        origin="Mumbai",
        destination="Pune",
        distance_km=148.0,
        base_duration_hours=2.2,
        base_cost_inr=820.0,
        weight_capacity_kg=150.0,
        reliability_score=0.89,
        carbon_emissions_kg=11.8,
        departure_time="08:00",
        assumptions=["Mumbai-Pune Expressway (NH48)", "Subject to peak-hour toll delays"],
    ),
    JourneyOption(
        id="BOM-PNQ-AIR-01",
        name="Mumbai-Pune Same-Day Air Priority",
        carrier="Blue Dart Premium Air",
        mode=TransportMode.AIR,
        origin="Mumbai",
        destination="Pune",
        distance_km=120.0,
        base_duration_hours=1.8,
        base_cost_inr=2400.0,
        weight_capacity_kg=20.0,
        reliability_score=0.97,
        carbon_emissions_kg=42.0,
        departure_time="09:00",
        assumptions=["Short-haul charter flight plus ground transfer", "For time-critical documents and parcels"],
    ),

    # === Corridor 5: Delhi -> Chandigarh (~250 km) ===
    JourneyOption(
        id="DEL-IXC-RAIL-01",
        name="Shatabdi Freight Link (Delhi-Chandigarh)",
        carrier="Northern Railway Cargo",
        mode=TransportMode.RAIL,
        origin="Delhi",
        destination="Chandigarh",
        distance_km=248.0,
        base_duration_hours=3.5,
        base_cost_inr=920.0,
        weight_capacity_kg=80.0,
        reliability_score=0.95,
        carbon_emissions_kg=8.9,
        departure_time="07:00",
        assumptions=["High-speed rail line Delhi-Ambala-Chandigarh", "Priority cargo coach"],
    ),
    JourneyOption(
        id="DEL-IXC-ROAD-EXP",
        name="NH44 North Corridor Express",
        carrier="Gati Express Cargo",
        mode=TransportMode.EXPRESS_ROAD,
        origin="Delhi",
        destination="Chandigarh",
        distance_km=260.0,
        base_duration_hours=4.5,
        base_cost_inr=780.0,
        weight_capacity_kg=200.0,
        reliability_score=0.86,
        carbon_emissions_kg=19.2,
        departure_time="08:00",
        assumptions=["NH44 via Ambala", "Standard interstate express routing"],
    ),
    JourneyOption(
        id="DEL-IXC-AIR-01",
        name="Delhi-Chandigarh Air Express",
        carrier="Alliance Air Cargo",
        mode=TransportMode.AIR,
        origin="Delhi",
        destination="Chandigarh",
        distance_km=220.0,
        base_duration_hours=1.5,
        base_cost_inr=2800.0,
        weight_capacity_kg=25.0,
        reliability_score=0.94,
        carbon_emissions_kg=48.0,
        departure_time="09:30",
        assumptions=["40-min flight plus ground handling", "Chandigarh International Airport (IXC)"],
    ),

    # === Corridor 6: Chennai -> Coimbatore (~500 km) ===
    JourneyOption(
        id="MAA-CJB-RAIL-01",
        name="Kovai Express Freight Service",
        carrier="Southern Railway Parcel Division",
        mode=TransportMode.RAIL,
        origin="Chennai",
        destination="Coimbatore",
        distance_km=495.0,
        base_duration_hours=6.5,
        base_cost_inr=1420.0,
        weight_capacity_kg=100.0,
        reliability_score=0.93,
        carbon_emissions_kg=17.8,
        departure_time="07:00",
        assumptions=["Direct rail via Salem junction", "Textile-industry freight priority"],
    ),
    JourneyOption(
        id="MAA-CJB-ROAD-EXP",
        name="Tamil Nadu Highway Express (NH44)",
        carrier="TNSTC Cargo Express",
        mode=TransportMode.EXPRESS_ROAD,
        origin="Chennai",
        destination="Coimbatore",
        distance_km=510.0,
        base_duration_hours=7.5,
        base_cost_inr=1100.0,
        weight_capacity_kg=180.0,
        reliability_score=0.84,
        carbon_emissions_kg=42.0,
        departure_time="08:00",
        assumptions=["Via NH44 Salem-Namakkal-Coimbatore bypass"],
    ),
    JourneyOption(
        id="MAA-CJB-AIR-01",
        name="Chennai-Coimbatore Air Cargo Link",
        carrier="Air India Cargo",
        mode=TransportMode.AIR,
        origin="Chennai",
        destination="Coimbatore",
        distance_km=430.0,
        base_duration_hours=2.2,
        base_cost_inr=3100.0,
        weight_capacity_kg=30.0,
        reliability_score=0.91,
        carbon_emissions_kg=71.0,
        departure_time="09:00",
        assumptions=["55-min flight + terminal handling at Coimbatore airport"],
    ),
]


import math


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two geographic coordinates in kilometers."""
    r = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 1)


def get_location(identifier: str) -> Optional[Location]:
    """Look up a canonical Location by city name, ID, transport code, or logistics alias."""
    if not identifier:
        return None
    clean = identifier.strip().lower()

    # 1. Exact matches on city, id, full name, transport codes, or aliases
    for loc in LOCATIONS.values():
        if (
            loc.city.lower() == clean
            or loc.id.lower() == clean
            or loc.name.lower() == clean
            or (loc.rail_code and loc.rail_code.lower() == clean)
            or (loc.airport_code and loc.airport_code.lower() == clean)
            or any(a.lower() == clean for a in loc.aliases)
        ):
            return loc

    # 2. Check after stripping common logistics descriptors: port, airport, station, terminal, etc.
    import re
    stripped = re.sub(
        r"\b(port|harbour|harbor|airport|station|terminal|railway|central|cargo|junction|hub|dock|docks|city|of)\b",
        "",
        clean,
        flags=re.IGNORECASE,
    ).strip()
    if stripped:
        for loc in LOCATIONS.values():
            if (
                loc.city.lower() == stripped
                or loc.id.lower() == stripped
                or (loc.rail_code and loc.rail_code.lower() == stripped)
                or (loc.airport_code and loc.airport_code.lower() == stripped)
                or any(a.lower() == stripped for a in loc.aliases)
            ):
                return loc

    # 3. Check if clean contains canonical city, code, or alias as a distinct word
    for loc in LOCATIONS.values():
        if (
            re.search(rf"\b{re.escape(loc.city.lower())}\b", clean)
            or re.search(rf"\b{re.escape(loc.id.lower())}\b", clean)
            or (loc.rail_code and re.search(rf"\b{re.escape(loc.rail_code.lower())}\b", clean))
            or (loc.airport_code and re.search(rf"\b{re.escape(loc.airport_code.lower())}\b", clean))
            or any(re.search(rf"\b{re.escape(a.lower())}\b", clean) for a in loc.aliases)
        ):
            return loc

    return None


def get_options_for_route(origin: str, destination: str) -> List[JourneyOption]:
    """
    Retrieve candidate journey options for a given origin and destination.
    Validates origin and destination, ensuring they are distinct and valid canonical locations.
    If a curated corridor exists, returns the curated options.
    Otherwise, deterministically derives realistic multimodal route options from the corridor distance.
    """
    orig_clean = origin.strip()
    dest_clean = destination.strip()

    orig_loc = get_location(orig_clean)
    dest_loc = get_location(dest_clean)

    if not orig_loc:
        raise ValueError(f"Unknown or unsupported origin location: '{origin}'.")
    if not dest_loc:
        raise ValueError(f"Unknown or unsupported destination location: '{destination}'.")

    if orig_loc.city.lower() == dest_loc.city.lower():
        raise ValueError("Origin and destination cannot be identical for intercity logistics.")

    # 1. Check curated corridors first
    curated = [
        opt for opt in SAMPLE_JOURNEY_OPTIONS
        if opt.origin.lower() == orig_loc.city.lower() and opt.destination.lower() == dest_loc.city.lower()
    ]
    if curated:
        return curated

    # 2. Check reverse of curated corridors
    curated_rev = [
        opt for opt in SAMPLE_JOURNEY_OPTIONS
        if opt.origin.lower() == dest_loc.city.lower() and opt.destination.lower() == orig_loc.city.lower()
    ]
    if curated_rev:
        flipped: List[JourneyOption] = []
        for opt in curated_rev:
            flipped.append(
                JourneyOption(
                    id=f"{orig_loc.id}-{dest_loc.id}-{opt.mode.value}-01",
                    name=opt.name.replace(dest_loc.city, orig_loc.city),
                    carrier=opt.carrier,
                    mode=opt.mode,
                    origin=orig_loc.city,
                    destination=dest_loc.city,
                    distance_km=opt.distance_km,
                    base_duration_hours=opt.base_duration_hours,
                    base_cost_inr=opt.base_cost_inr,
                    weight_capacity_kg=opt.weight_capacity_kg,
                    reliability_score=opt.reliability_score,
                    carbon_emissions_kg=opt.carbon_emissions_kg,
                    departure_time=opt.departure_time,
                    assumptions=opt.assumptions,
                )
            )
        return flipped

    # 3. Dynamic deterministic calculation for any other canonical pair
    geo_dist = calculate_haversine_distance_km(orig_loc.lat, orig_loc.lon, dest_loc.lat, dest_loc.lon)
    rail_dist = round(geo_dist * 1.18, 1)
    road_dist = round(geo_dist * 1.25, 1)
    air_dist = round(geo_dist * 1.05, 1)

    options: List[JourneyOption] = []

    # RAIL
    rail_duration = max(2.5, round(rail_dist / 65.0 + 1.2, 1))
    rail_cost = max(550.0, round(380.0 + rail_dist * 1.15, 0))
    options.append(
        JourneyOption(
            id=f"{orig_loc.id}-{dest_loc.id}-RAIL-01",
            name=f"{orig_loc.city}-{dest_loc.city} Intercity Freight Express",
            carrier="Indian Railways Freight Division (Simulated)",
            mode=TransportMode.RAIL,
            origin=orig_loc.city,
            destination=dest_loc.city,
            distance_km=rail_dist,
            base_duration_hours=rail_duration,
            base_cost_inr=rail_cost,
            weight_capacity_kg=80.0,
            reliability_score=0.93,
            carbon_emissions_kg=round(rail_dist * 0.038, 1),
            departure_time="07:30",
            assumptions=[
                f"Direct rail rake via {orig_loc.rail_code} to {dest_loc.rail_code} rail corridor",
                "Fixed timetable departure with standard terminal clearance",
                f"Simulated network estimate based on {rail_dist:.0f} km rail routing",
            ],
        )
    )

    # EXPRESS_ROAD
    exp_duration = max(2.0, round(road_dist / 58.0 + 0.8, 1))
    exp_cost = max(500.0, round(350.0 + road_dist * 2.05, 0))
    options.append(
        JourneyOption(
            id=f"{orig_loc.id}-{dest_loc.id}-ROAD-EXP",
            name=f"{orig_loc.city}-{dest_loc.city} National Highway Express",
            carrier="National Highway Express Surface (Simulated)",
            mode=TransportMode.EXPRESS_ROAD,
            origin=orig_loc.city,
            destination=dest_loc.city,
            distance_km=road_dist,
            base_duration_hours=exp_duration,
            base_cost_inr=exp_cost,
            weight_capacity_kg=120.0,
            reliability_score=0.88,
            carbon_emissions_kg=round(road_dist * 0.082, 1),
            departure_time="08:00",
            assumptions=[
                "Direct interstate national highway corridor with fast-tag toll clearance",
                f"Simulated network estimate based on {road_dist:.0f} km highway corridor",
            ],
        )
    )

    # ROAD (Standard non-express)
    std_duration = max(3.0, round(road_dist / 44.0 + 1.8, 1))
    std_cost = max(350.0, round(250.0 + road_dist * 1.45, 0))
    options.append(
        JourneyOption(
            id=f"{orig_loc.id}-{dest_loc.id}-ROAD-STD",
            name=f"{orig_loc.city}-{dest_loc.city} Standard Linehaul Surface",
            carrier="Intercity Logistics Surface (Simulated)",
            mode=TransportMode.ROAD,
            origin=orig_loc.city,
            destination=dest_loc.city,
            distance_km=road_dist,
            base_duration_hours=std_duration,
            base_cost_inr=std_cost,
            weight_capacity_kg=200.0,
            reliability_score=0.80,
            carbon_emissions_kg=round(road_dist * 0.095, 1),
            departure_time="08:30",
            assumptions=[
                "Consolidated regional freight with transshipment buffer",
                f"Simulated network estimate based on {road_dist:.0f} km linehaul routing",
            ],
        )
    )

    # AIR (Only if distance >= 180 km)
    if geo_dist >= 180.0:
        air_duration = max(1.8, round(air_dist / 520.0 + 1.4, 1))
        air_cost = max(2500.0, round(2200.0 + air_dist * 2.70, 0))
        options.append(
            JourneyOption(
                id=f"{orig_loc.id}-{dest_loc.id}-AIR-01",
                name=f"{orig_loc.city}-{dest_loc.city} Priority Air Cargo Shuttle",
                carrier="Priority Regional Air Cargo (Simulated)",
                mode=TransportMode.AIR,
                origin=orig_loc.city,
                destination=dest_loc.city,
                distance_km=air_dist,
                base_duration_hours=air_duration,
                base_cost_inr=air_cost,
                weight_capacity_kg=30.0,
                reliability_score=0.95,
                carbon_emissions_kg=round(air_dist * 0.220, 1),
                departure_time="09:00",
                assumptions=[
                    f"Ramp transfer from {orig_loc.airport_code} to {dest_loc.airport_code}",
                    "Includes 1.4h ground handling and security screening buffer",
                    f"Simulated network estimate based on {air_dist:.0f} km flight route",
                ],
            )
        )

    return options


ALL_CORRIDORS = [
    {"origin": "Vijayawada", "destination": "Visakhapatnam", "distance_km": 350.0, "description": "Coastal Andhra Corridor"},
    {"origin": "Hyderabad", "destination": "Bengaluru", "distance_km": 570.0, "description": "Tech Triangle Corridor"},
    {"origin": "Chennai", "destination": "Vijayawada", "distance_km": 430.0, "description": "East Coast NH16 Corridor"},
    {"origin": "Mumbai", "destination": "Pune", "distance_km": 150.0, "description": "Mumbai Metropolitan Express"},
    {"origin": "Delhi", "destination": "Chandigarh", "distance_km": 250.0, "description": "North India NH44 Corridor"},
    {"origin": "Chennai", "destination": "Coimbatore", "distance_km": 500.0, "description": "Tamil Nadu Industrial Corridor"},
]


def get_option_by_id(option_id: str) -> Optional[JourneyOption]:
    """Retrieve a journey option by its ID, checking curated options first, then dynamic corridors."""
    # 1. Check curated options list
    for opt in SAMPLE_JOURNEY_OPTIONS:
        if opt.id == option_id:
            return opt

    # 2. Parse ID formatted like ORIG_ID-DEST_ID-MODE-SUFFIX (e.g., BZA-PNQ-RAIL-01 or BZA-PNQ-ROAD-EXP)
    parts = option_id.split("-")
    if len(parts) >= 3:
        orig_id, dest_id = parts[0], parts[1]
        orig_loc = get_location(orig_id)
        dest_loc = get_location(dest_id)
        if orig_loc and dest_loc and orig_loc.city != dest_loc.city:
            try:
                options = get_options_for_route(orig_loc.city, dest_loc.city)
                for opt in options:
                    if opt.id == option_id:
                        return opt
            except Exception:
                pass
    return None

