"""
eRTMAC-NWIS Synthetic Petroleum Data Generator
Generates realistic Indian O&G operational data for all database tables.

Usage:
    python3 -m app.database.seed_generator
    # Or called from init_db on first run
"""
import random
import math
import json
from datetime import datetime, date, timedelta
from typing import Optional
import structlog

logger = structlog.get_logger(__name__)

random.seed(42)  # Reproducible output

# ─────────────────────────────────────────────
# BASIN & FIELD DEFINITIONS (Real Indian O&G Geography)
# ─────────────────────────────────────────────

BASINS = [
    {
        "name": "Assam Shelf Basin",
        "region": "Northeast India",
        "state": "Assam",
        "geological_age": "Oligocene-Miocene",
        "description": "One of India's oldest producing basins, with prolific oil and gas fields operated primarily by Oil India Limited.",
        "fields": [
            {"name": "Duliajan", "lat": 27.360, "lon": 95.310, "operator": "Oil India Limited", "discovery_year": 1953},
            {"name": "Naharkatiya", "lat": 27.291, "lon": 95.340, "operator": "Oil India Limited", "discovery_year": 1953},
            {"name": "Moran", "lat": 26.680, "lon": 94.840, "operator": "Oil India Limited", "discovery_year": 1956},
            {"name": "Digboi", "lat": 27.384, "lon": 95.617, "operator": "Oil India Limited", "discovery_year": 1889},
        ],
        "formations": [
            {"name": "Barail Formation", "geological_age": "Oligocene", "lithology": "Sandstone/Shale", "description": "Primary reservoir unit in Assam basin, known for prolific gas production and occasional lost circulation."},
            {"name": "Tipam Formation", "geological_age": "Miocene", "lithology": "Sandstone", "description": "Coarse to medium grained sandstone, good reservoir quality, sometimes exhibits differential sticking."},
            {"name": "Surma Formation", "geological_age": "Oligocene-Miocene", "lithology": "Shale/Sandstone", "description": "Mixed lithology with reactive shale intervals prone to wellbore instability."},
            {"name": "Bokabil Formation", "geological_age": "Pliocene", "lithology": "Sandstone", "description": "Shallow formation with unconsolidated sands, drilling hazards include sand influx."},
        ],
    },
    {
        "name": "Assam-Arakan Basin",
        "region": "Northeast India",
        "state": "Assam/Nagaland",
        "geological_age": "Eocene-Miocene",
        "description": "Fold-thrust belt basin with complex structural geology. High mud weight and tight pore pressure management required.",
        "fields": [
            {"name": "Lakwa", "lat": 26.784, "lon": 94.628, "operator": "Oil India Limited", "discovery_year": 1962},
            {"name": "Rudrasagar", "lat": 26.741, "lon": 94.498, "operator": "Oil India Limited", "discovery_year": 1960},
            {"name": "Jorhat", "lat": 26.748, "lon": 94.209, "operator": "ONGC", "discovery_year": 1978},
        ],
        "formations": [
            {"name": "Kopili Formation", "geological_age": "Eocene", "lithology": "Shale/Limestone", "description": "Carbonate-dominated interval with fractures. Known for mud losses and kick hazards."},
            {"name": "Jenam Formation", "geological_age": "Oligocene", "lithology": "Sandstone/Shale", "description": "Interbedded sandstone-shale sequence with moderate reservoir quality."},
        ],
    },
    {
        "name": "Cambay Basin",
        "region": "Western India",
        "state": "Gujarat",
        "geological_age": "Paleocene-Eocene",
        "description": "Rift basin with good hydrocarbon potential. Ankleshwar is one of India's largest oil fields.",
        "fields": [
            {"name": "Ankleshwar", "lat": 21.632, "lon": 73.003, "operator": "ONGC", "discovery_year": 1958},
            {"name": "Kalol", "lat": 22.609, "lon": 72.485, "operator": "ONGC", "discovery_year": 1958},
            {"name": "Gandhar", "lat": 21.847, "lon": 72.968, "operator": "ONGC", "discovery_year": 1983},
        ],
        "formations": [
            {"name": "Kalol Formation", "geological_age": "Paleocene", "lithology": "Sandstone", "description": "Medium to fine grained sandstone with good porosity. Some intervals show H2S presence."},
            {"name": "Hazad Formation", "geological_age": "Eocene", "lithology": "Limestone/Dolomite", "description": "Carbonate interval with vuggy porosity. Severe mud losses common in fractured zones."},
            {"name": "Cambay Shale", "geological_age": "Eocene", "lithology": "Shale", "description": "Thick marine shale, wellbore instability prevalent. Requires inhibitive mud system."},
        ],
    },
    {
        "name": "Mumbai Offshore Basin",
        "region": "Western Offshore",
        "state": "Maharashtra (Offshore)",
        "geological_age": "Cretaceous-Miocene",
        "description": "India's most prolific offshore basin. Home to Mumbai High, the country's largest oil field.",
        "fields": [
            {"name": "Mumbai High", "lat": 19.070, "lon": 71.488, "operator": "ONGC", "discovery_year": 1974},
            {"name": "Bassein", "lat": 20.195, "lon": 71.523, "operator": "ONGC", "discovery_year": 1976},
            {"name": "Neelam", "lat": 19.538, "lon": 71.633, "operator": "ONGC", "discovery_year": 1988},
        ],
        "formations": [
            {"name": "Bassein Formation", "geological_age": "Paleocene-Eocene", "lithology": "Limestone", "description": "Primary carbonate reservoir. Excellent porosity and permeability. Kick risk in overpressured zones."},
            {"name": "Mukta Formation", "geological_age": "Eocene", "lithology": "Limestone", "description": "Secondary carbonate reservoir with solution porosity. Occasional partial mud losses."},
            {"name": "Panna Formation", "geological_age": "Miocene", "lithology": "Sandstone", "description": "Clastic reservoir with variable quality. Tight zones require WOB optimization."},
        ],
    },
    {
        "name": "Krishna-Godavari Basin",
        "region": "Eastern India",
        "state": "Andhra Pradesh",
        "geological_age": "Permian-Recent",
        "description": "Passive margin basin with significant deepwater gas potential. Complex pressure regimes.",
        "fields": [
            {"name": "KG Offshore D6", "lat": 15.894, "lon": 81.512, "operator": "Reliance Industries", "discovery_year": 2002},
            {"name": "KG Onshore", "lat": 16.319, "lon": 80.437, "operator": "ONGC", "discovery_year": 1983},
            {"name": "Ravva", "lat": 15.872, "lon": 80.954, "operator": "Cairn India", "discovery_year": 1987},
        ],
        "formations": [
            {"name": "Raghavapuram Formation", "geological_age": "Cretaceous", "lithology": "Shale/Sandstone", "description": "Deep source rock and reservoir sequence. High pore pressure gradients common."},
            {"name": "Tirupati Formation", "geological_age": "Eocene", "lithology": "Sandstone", "description": "Deep water turbidite sandstone with excellent reservoir characteristics."},
        ],
    },
    {
        "name": "Rajasthan Basin",
        "region": "Northwest India",
        "state": "Rajasthan",
        "geological_age": "Proterozoic-Cretaceous",
        "description": "Inland sedimentary basin. Mangala field is India's largest onshore oil discovery in recent decades.",
        "fields": [
            {"name": "Mangala", "lat": 27.014, "lon": 71.967, "operator": "Cairn India", "discovery_year": 2004},
            {"name": "Bhagyam", "lat": 26.867, "lon": 71.836, "operator": "Cairn India", "discovery_year": 2007},
            {"name": "Saraswati", "lat": 26.751, "lon": 71.545, "operator": "Cairn India", "discovery_year": 2006},
        ],
        "formations": [
            {"name": "Fatehgarh Formation", "geological_age": "Cretaceous", "lithology": "Sandstone", "description": "Primary reservoir with heavy oil. Temperature management and wellbore stability are key challenges."},
            {"name": "Thumbli Formation", "geological_age": "Jurassic", "lithology": "Sandstone", "description": "Secondary reservoir. Lower permeability requires hydraulic fracturing."},
        ],
    },
    {
        "name": "Cauvery Basin",
        "region": "Southern India",
        "state": "Tamil Nadu",
        "geological_age": "Cretaceous-Eocene",
        "description": "Pericratonic basin on India's east coast with moderate hydrocarbon potential.",
        "fields": [
            {"name": "Cauvery Offshore", "lat": 10.832, "lon": 80.165, "operator": "ONGC", "discovery_year": 1988},
            {"name": "PY-3", "lat": 10.237, "lon": 80.483, "operator": "Hardy Exploration", "discovery_year": 1987},
        ],
        "formations": [
            {"name": "Kamalapuram Formation", "geological_age": "Cretaceous", "lithology": "Sandstone/Shale", "description": "Complex alternating sequence with challenging drilling conditions."},
        ],
    },
    {
        "name": "Bengal Basin",
        "region": "Eastern India",
        "state": "West Bengal",
        "geological_age": "Cretaceous-Recent",
        "description": "Deep sedimentary basin with emerging exploration activity. Limited commercial production to date.",
        "fields": [
            {"name": "Bengal Exploration Block", "lat": 22.567, "lon": 88.361, "operator": "ONGC", "discovery_year": 2001},
        ],
        "formations": [
            {"name": "Bengal Formation", "geological_age": "Miocene", "lithology": "Sandstone", "description": "Deep clastic sequence with uncertain reservoir quality. Significant water influx risk."},
        ],
    },
]

# ─────────────────────────────────────────────
# EVENT TEMPLATES
# ─────────────────────────────────────────────

EVENT_TEMPLATES = {
    "Lost Circulation": {
        "category": "Lost Circulation",
        "types": ["Partial Loss", "Severe Loss", "Complete Loss"],
        "severity_weights": {"Low": 0.2, "Moderate": 0.4, "High": 0.3, "Critical": 0.1},
        "formations": ["Fractured sandstone", "Vuggy carbonate", "Fractured limestone"],
        "causes": [
            "Encountered fractured formation while drilling",
            "ECD exceeded formation fracture gradient",
            "Sudden formation change from tight to porous zone",
            "High mud weight causing induced fractures",
        ],
        "mitigations": [
            "Pumped LCM (Lost Circulation Material) pill — calcium carbonate blend",
            "Reduced ECD by decreasing pump rate and annular velocity",
            "Spotted cement squeeze to seal fractures",
            "Weighted up mud to match formation pressure",
            "Used reactive gunk squeeze to seal fractures",
        ],
        "lessons": [
            "Pre-drill LCM inventory before entering fractured intervals",
            "Monitor pit levels continuously in porous formations",
            "Reduce ROP while drilling through fractured carbonates",
        ],
    },
    "Kick": {
        "category": "Well Control",
        "types": ["Gas Kick", "Oil Kick", "Water Kick", "Gas Influx"],
        "severity_weights": {"Moderate": 0.3, "High": 0.5, "Critical": 0.2},
        "formations": ["Overpressured sandstone", "Gas-bearing limestone"],
        "causes": [
            "Encountered unexpected overpressured zone",
            "Insufficient mud weight to balance formation pressure",
            "Swab pressure while tripping out of hole",
            "Poor well control during connection",
        ],
        "mitigations": [
            "Shut in well and activated BOP",
            "Implemented kill procedure — Driller's Method",
            "Increased mud weight to kill pressure",
            "Circulated out influx through choke manifold",
        ],
        "lessons": [
            "Monitor flow check on every connection in high-pressure zones",
            "Maintain mud weight within 0.1 ppg of planned",
            "Ensure BOP function tests completed before drilling",
        ],
    },
    "Stuck Pipe": {
        "category": "Mechanical",
        "types": ["Differential Sticking", "Mechanical Sticking", "Pack Off", "Key Seat"],
        "severity_weights": {"Low": 0.1, "Moderate": 0.4, "High": 0.4, "Critical": 0.1},
        "formations": ["Shale", "Reactive shale", "Depleted sand"],
        "causes": [
            "Pipe stuck due to differential pressure in depleted zone",
            "Reactive shale swelling closed the annulus",
            "Poor hole cleaning allowing cuttings bed to form",
            "Key seat development in dogleg section",
        ],
        "mitigations": [
            "Applied spotted diesel oil pill to free pipe",
            "Reduced mud weight to decrease differential pressure",
            "Jarred up and down while circulating",
            "Back-reamed through tight section",
            "Applied spotting fluid and mechanical jarring",
        ],
        "lessons": [
            "Maintain pipe rotation at all times in reactive shale sections",
            "Wiper trips mandatory before tripping through troubled intervals",
            "Increase inhibitive mud concentration in shale formations",
        ],
    },
    "Torque Spike": {
        "category": "Drilling Parameter Abnormalities",
        "types": ["Torque Spike", "Torque Increase", "Torque Fluctuation", "Drag Increase"],
        "severity_weights": {"Information": 0.2, "Low": 0.4, "Moderate": 0.3, "High": 0.1},
        "formations": ["Interbedded shale/sandstone", "Limestone"],
        "causes": [
            "Bit balling due to sticky formation",
            "Cuttings accumulation in annulus",
            "Formation change causing bit vibration",
            "Worn bit causing increased friction",
        ],
        "mitigations": [
            "Reduced WOB and increased RPM to clean bit",
            "Pumped high-viscosity sweep to clean hole",
            "Controlled pipe rotation to prevent vibration",
        ],
        "lessons": [
            "Monitor torque trend continuously as leading indicator",
            "Increase sweep frequency in sticky formation intervals",
        ],
    },
    "Formation Instability": {
        "category": "Formation Related",
        "types": ["Hole Collapse", "Cavings", "Wellbore Instability", "Borehole Enlargement"],
        "severity_weights": {"Low": 0.2, "Moderate": 0.5, "High": 0.3},
        "formations": ["Reactive shale", "Unconsolidated sand", "Fractured formation"],
        "causes": [
            "Water-based mud reacting with formation clay minerals",
            "Insufficient mud weight causing mechanical instability",
            "Tectonic stresses causing formation fracturing",
        ],
        "mitigations": [
            "Switched to oil-based mud to prevent shale hydration",
            "Increased mud weight by 0.3 ppg to provide mechanical support",
            "Added KCl salt to inhibit clay swelling",
            "Reduced trip speed to minimize swabbing",
        ],
        "lessons": [
            "Use inhibitive mud system in reactive shale intervals",
            "Pre-treat mud with potassium chloride before entering shale formations",
        ],
    },
}

# ─────────────────────────────────────────────
# WELL PURPOSE AND STATUS DISTRIBUTIONS
# ─────────────────────────────────────────────

WELL_PURPOSES = ["Exploratory"] * 17 + ["Appraisal"] * 15 + ["Development"] * 55 + ["Injection"] * 8 + ["Observation"] * 5
WELL_STATUSES = ["Producing"] * 35 + ["Completed"] * 20 + ["Drilling"] * 15 + ["Suspended"] * 10 + ["Abandoned"] * 10 + ["Testing"] * 5 + ["Planned"] * 5
TRAJECTORY_TYPES = ["Vertical"] * 40 + ["Directional"] * 45 + ["Horizontal"] * 10 + ["Multilateral"] * 5
PRODUCTION_STATUSES = ["Oil Producer", "Gas Producer", "Condensate Producer", "Water Injector", "Gas Injector", "Non Producing", "Shut In"]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance between two coordinates in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _random_date(start_year: int = 1990, end_year: int = 2024) -> date:
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    return start + timedelta(days=random.randint(0, (end - start).days))


def generate_seed_data() -> dict:
    """
    Generate the complete synthetic petroleum dataset.
    Returns a dict with all entity lists ready for DB insertion.
    """
    logger.info("seed_generation_start")

    data = {
        "basins": [], "fields": [], "blocks": [], "formations": [],
        "wells": [], "wellbores": [], "trajectory_surveys": [],
        "formation_intervals": [], "reservoirs": [],
        "drilling_events": [], "mitigations": [], "lessons_learned": [],
        "telemetry_samples": [],  # Subset for seeding
        "ml_labels": [],
    }

    basin_id = 0
    field_id = 0
    block_id = 0
    formation_id = 0
    well_id = 0
    wellbore_id = 0
    survey_id = 0
    interval_id = 0
    reservoir_id = 0
    event_id = 0
    mitigation_id = 0
    lesson_id = 0
    telemetry_id = 0

    field_formation_map: dict[int, list[dict]] = {}   # field_id → [formation dicts]
    well_records: list[dict] = []

    for basin_def in BASINS:
        basin_id += 1
        basin_rec = {
            "id": basin_id,
            "name": basin_def["name"],
            "region": basin_def["region"],
            "state": basin_def["state"],
            "geological_age": basin_def["geological_age"],
            "description": basin_def["description"],
        }
        data["basins"].append(basin_rec)

        # Formations for this basin
        basin_formations = []
        for f_def in basin_def["formations"]:
            formation_id += 1
            frec = {
                "id": formation_id,
                "basin_id": basin_id,
                "name": f_def["name"],
                "geological_age": f_def["geological_age"],
                "lithology": f_def["lithology"],
                "description": f_def["description"],
            }
            data["formations"].append(frec)
            basin_formations.append(frec)

            # Reservoir for each formation
            reservoir_id += 1
            data["reservoirs"].append({
                "id": reservoir_id,
                "formation_id": formation_id,
                "name": f"{f_def['name']} Reservoir",
                "reservoir_type": random.choice(["Sandstone", "Carbonate", "Fractured"]),
                "porosity": round(random.uniform(8, 28), 1),
                "permeability": round(random.uniform(10, 500), 1),
                "pressure": round(random.uniform(2000, 8000), 0),
            })

        # Fields
        for field_def in basin_def["fields"]:
            field_id += 1
            f_lat, f_lon = field_def["lat"], field_def["lon"]

            field_rec = {
                "id": field_id,
                "basin_id": basin_id,
                "name": field_def["name"],
                "operator": field_def["operator"],
                "latitude": f_lat,
                "longitude": f_lon,
                "discovery_year": field_def["discovery_year"],
                "description": f"Petroleum field in {basin_def['name']}",
            }
            data["fields"].append(field_rec)
            field_formation_map[field_id] = basin_formations

            # 2 blocks per field
            for b_num in range(1, 3):
                block_id += 1
                data["blocks"].append({
                    "id": block_id,
                    "field_id": field_id,
                    "name": f"{field_def['name']}-Block-{b_num}",
                    "contract_type": random.choice(["PSC", "NELP", "OML", "DSF"]),
                    "operator": field_def["operator"],
                })

            # Base properties for the field to ensure consistency across its wells
            field_base_depth = random.uniform(2500, 4500)
            
            field_formations_seq = list(basin_formations)
            random.shuffle(field_formations_seq)
            n_formations = min(len(field_formations_seq), random.randint(2, 4))
            field_formations_seq = field_formations_seq[:n_formations]
            
            formation_base_tops = []
            depth_cursor = 0.0
            for _ in range(n_formations):
                formation_base_tops.append(depth_cursor)
                depth_cursor += random.uniform(500, 1500)

            # Wells per field: scale with field importance
            n_wells = random.randint(6, 14)
            field_well_coords = []
            for w_num in range(1, n_wells + 1):
                well_id += 1

                # Cluster wells geographically within field ±0.025° (~2.7km radius), ensuring at least ~800m apart
                w_lat, w_lon = 0.0, 0.0
                for _ in range(100):
                    w_lat = f_lat + random.uniform(-0.025, 0.025)
                    w_lon = f_lon + random.uniform(-0.025, 0.025)
                    
                    too_close = False
                    for (ex_lat, ex_lon) in field_well_coords:
                        # 0.007 degree difference is roughly 800 meters
                        if math.hypot(w_lat - ex_lat, w_lon - ex_lon) < 0.007:
                            too_close = True
                            break
                    if not too_close:
                        break
                field_well_coords.append((w_lat, w_lon))

                purpose = random.choice(WELL_PURPOSES)
                status = random.choice(WELL_STATUSES)
                trajectory = random.choice(TRAJECTORY_TYPES)

                total_depth = round(field_base_depth + random.uniform(-500, 500), 0)
                
                spud, completion, abandonment = None, None, None
                
                if status == "Planned":
                    current_depth = 0
                    if random.random() > 0.5:
                        spud = _random_date(2024, 2025)
                elif status == "Drilling":
                    current_depth = round(random.uniform(500, total_depth - 100), 0)
                    spud = _random_date(2023, 2024)
                else:
                    current_depth = total_depth
                    spud = _random_date(1990, 2022)
                    completion = spud + timedelta(days=random.randint(60, 365))
                    if status == "Abandoned":
                        abandonment = completion + timedelta(days=random.randint(365, 3650))

                well_rec = {
                    "id": well_id,
                    "well_name": f"{field_def['name'].replace(' ', '-')}-{w_num:02d}",
                    "well_number": f"W-{well_id:04d}",
                    "field_id": field_id,
                    "block_id": block_id - random.randint(0, 1),
                    "latitude": round(w_lat, 6),
                    "longitude": round(w_lon, 6),
                    "well_purpose": purpose,
                    "well_status": status,
                    "production_status": random.choice(PRODUCTION_STATUSES) if status in ("Producing", "Suspended") else None,
                    "trajectory_type": trajectory,
                    "planned_depth": total_depth,
                    "total_depth": total_depth if status != "Planned" else None,
                    "current_depth": current_depth,
                    "max_inclination": round(random.uniform(5, 85), 1) if trajectory != "Vertical" else round(random.uniform(0, 5), 1),
                    "max_azimuth": round(random.uniform(0, 360), 1) if trajectory != "Vertical" else None,
                    "max_dogleg_severity": round(random.uniform(1, 8), 2) if trajectory != "Vertical" else None,
                    "spud_date": spud.isoformat() if spud else None,
                    "completion_date": completion.isoformat() if completion else None,
                    "abandonment_date": abandonment.isoformat() if abandonment else None,
                    "reservoir_type": random.choice(["Sandstone", "Carbonate", "Fractured"]),
                    "hydrocarbon_type": random.choice(["Oil", "Gas", "Oil & Gas", "Condensate"]),
                    "_field_id": field_id,
                    "_basin_id": basin_id,
                    "_basin_formations": basin_formations,
                    "_total_depth": total_depth,
                    "_trajectory": trajectory,
                    "_status": status,
                }
                data["wells"].append(well_rec)
                well_records.append(well_rec)

                # Wellbore
                wellbore_id += 1
                wellbore_rec = {
                    "id": wellbore_id,
                    "well_id": well_id,
                    "name": f"{well_rec['well_name']}-WB1",
                    "status": "Active" if status == "Drilling" else "Completed",
                    "trajectory_type": trajectory,
                    "sidetrack_number": None,
                    "kickoff_depth": round(total_depth * random.uniform(0.2, 0.4), 0) if trajectory != "Vertical" else None,
                    "total_depth": total_depth,
                }
                data["wellbores"].append(wellbore_rec)

                # Trajectory surveys (every 100m)
                depth = 0.0
                incl = 0.0
                azimuth = random.uniform(0, 360)
                tvd = 0.0
                n, e = 0.0, 0.0
                
                # Plot survey to current_depth for active drilling, else to total_depth
                actual_max_depth = current_depth if status == "Drilling" else total_depth
                
                while depth <= actual_max_depth:
                    survey_id += 1
                    if trajectory == "Vertical":
                        incl = random.uniform(0, 3)
                    elif trajectory == "Directional":
                        incl = min(incl + random.uniform(0, 3), 55)
                    elif trajectory == "Horizontal":
                        incl = min(incl + random.uniform(0, 5), 90)
                    dls = round(random.uniform(0.1, 3.0), 2) if trajectory != "Vertical" else 0.0
                    
                    step = 100.0
                    if depth + step > actual_max_depth and depth < actual_max_depth:
                        step = actual_max_depth - depth
                    if depth == actual_max_depth and step == 100.0:
                        break # done
                        
                    tvd += step * math.cos(math.radians(incl))
                    n += step * math.sin(math.radians(incl)) * math.cos(math.radians(azimuth))
                    e += step * math.sin(math.radians(incl)) * math.sin(math.radians(azimuth))
                    
                    data["trajectory_surveys"].append({
                        "id": survey_id,
                        "wellbore_id": wellbore_id,
                        "measured_depth": round(depth + step, 1),
                        "inclination": round(incl, 2),
                        "azimuth": round(azimuth, 2),
                        "true_vertical_depth": round(tvd, 1),
                        "northing": round(n, 2),
                        "easting": round(e, 2),
                        "dogleg_severity": dls,
                    })
                    depth += step

                # Formation intervals — stack formations from top to TD
                well_formation_tops = []
                for b_top in formation_base_tops:
                    jitter = random.uniform(-50, 50)
                    well_formation_tops.append(max(0, b_top + jitter))
                
                for i, frm in enumerate(field_formations_seq):
                    interval_id += 1
                    top = well_formation_tops[i]
                    if top > total_depth:
                        break
                    bottom = well_formation_tops[i+1] if i + 1 < len(well_formation_tops) else total_depth
                    bottom = min(bottom, total_depth)
                    
                    data["formation_intervals"].append({
                        "id": interval_id,
                        "well_id": well_id,
                        "formation_id": frm["id"],
                        "top_depth": top,
                        "bottom_depth": bottom,
                        "lithology": frm["lithology"],
                        "reservoir_quality": random.choice(["Poor", "Fair", "Good", "Excellent"]),
                    })

                # ── Drilling events ──
                if status == "Planned":
                    pass # no events
                else:
                    n_events = random.randint(1, 5)
                    event_types = random.choices(list(EVENT_TEMPLATES.keys()), k=n_events)
                    for etype in event_types:
                        tmpl = EVENT_TEMPLATES[etype]
                        
                        # Tie event to an actual formation in the well
                        target_interval = None
                        target_form_dict = None
                        
                        my_intervals = [fi for fi in data["formation_intervals"] if fi["well_id"] == well_id]
                        if my_intervals:
                            matching_intervals = []
                            for fi in my_intervals:
                                frm_def = next((f for f in basin_formations if f["id"] == fi["formation_id"]), None)
                                if frm_def and any(key.lower() in frm_def["name"].lower() or key.lower() in frm_def["lithology"].lower() for key in tmpl["formations"]):
                                    matching_intervals.append((fi, frm_def))
                            
                            if matching_intervals:
                                target_interval, target_form_dict = random.choice(matching_intervals)
                            else:
                                target_interval = random.choice(my_intervals)
                                target_form_dict = next((f for f in basin_formations if f["id"] == target_interval["formation_id"]), None)

                        if target_interval:
                            # Event must be between formation top and bottom, but also <= current_depth
                            max_event_depth = min(target_interval["bottom_depth"], current_depth)
                            min_event_depth = target_interval["top_depth"]
                            if min_event_depth >= max_event_depth:
                                continue # Cannot have event here (formation is deeper than current depth)
                            
                            event_depth = round(random.uniform(min_event_depth, max_event_depth), 0)
                            frm_id = target_interval["formation_id"]
                            frm_name = target_form_dict["name"] if target_form_dict else "Unknown"
                        else:
                            event_depth = round(random.uniform(total_depth * 0.1, current_depth), 0)
                            frm_id = None
                            frm_name = "Unknown"

                        event_id += 1
                        severity = random.choices(
                            list(tmpl["severity_weights"].keys()),
                            weights=list(tmpl["severity_weights"].values()),
                        )[0]
                        npt = round(random.uniform(2, 72) if severity in ("High", "Critical") else random.uniform(0.5, 8), 1)
                        
                        # Time logic
                        event_start_base = spud if spud else date(2020, 1, 1)
                        event_end_bound = completion if completion else date.today()
                        
                        days_diff = (event_end_bound - event_start_base).days
                        if days_diff <= 0: days_diff = 1
                        
                        event_start_dt = datetime.combine(event_start_base + timedelta(days=random.randint(0, days_diff)), datetime.min.time())
                        
                        data["drilling_events"].append({
                            "id": event_id,
                            "well_id": well_id,
                            "wellbore_id": wellbore_id,
                            "formation_id": frm_id,
                            "event_type": random.choice(tmpl["types"]),
                            "event_category": tmpl["category"],
                            "severity": severity,
                            "start_depth": event_depth,
                            "end_depth": round(event_depth + random.uniform(0, 20), 0),
                            "description": f"{random.choice(tmpl['types'])} occurred while drilling at {event_depth}m in {frm_name}.",
                            "cause": random.choice(tmpl["causes"]),
                            "consequence": f"Non-productive time of {npt} hours. Operation resumed after mitigation.",
                            "npt_hours": npt,
                            "event_start_time": event_start_dt.isoformat(),
                            "event_end_time": (event_start_dt + timedelta(hours=npt)).isoformat(),
                        })

                        # Mitigation
                        mitigation_id += 1
                        data["mitigations"].append({
                            "id": mitigation_id,
                            "event_id": event_id,
                            "action_taken": random.choice(tmpl["mitigations"]),
                            "result": random.choice(["Successful — operation resumed", "Partially successful", "Required additional measures"]),
                            "effectiveness_score": round(random.uniform(60, 98), 1),
                        })

                        # Lesson learned
                        lesson_id += 1
                        data["lessons_learned"].append({
                            "id": lesson_id,
                            "event_id": event_id,
                            "well_id": well_id,
                            "formation_id": frm_id,
                            "depth_range": f"{int(event_depth)}-{int(event_depth + 200)}m",
                            "lesson_text": random.choice(tmpl["lessons"]),
                            "recommended_action": f"Pre-drill contingency for {etype.lower()} at similar depth intervals in this formation.",
                            "applicable_conditions": f"Formation: {frm_name}, Depth: {int(event_depth)}m+",
                        })

                # ── Telemetry samples (150 records per active/drilling well) ──
                if status in ("Drilling", "Producing", "Testing"):
                    depth_m = current_depth * 0.7 if status == "Drilling" else total_depth
                    base_ts = datetime.utcnow() - timedelta(hours=150)
                    for t_idx in range(150):
                        telemetry_id += 1
                        depth_m += random.uniform(0.5, 2.0)
                        if depth_m > total_depth and status != "Drilling": depth_m = total_depth
                        ts = base_ts + timedelta(hours=t_idx)
                        temp_factor = depth_m / 1000.0
                        data["telemetry_samples"].append({
                            "id": telemetry_id,
                            "well_id": well_id,
                            "timestamp": ts.isoformat(),
                            "measured_depth": round(depth_m, 2),
                            "vertical_depth": round(depth_m * random.uniform(0.85, 1.0), 2),
                            "rop": round(random.gauss(15, 5), 2),
                            "wob": round(random.gauss(12, 3), 2),
                            "rpm": round(random.gauss(100, 15), 1),
                            "torque": round(random.gauss(8, 2), 2),
                            "standpipe_pressure": round(random.gauss(2800, 200), 0),
                            "ecd": round(random.gauss(1.45, 0.05), 3),
                            "mud_weight": round(random.gauss(1.40, 0.04), 3),
                            "flow_rate": round(random.gauss(1800, 100), 0),
                            "hook_load": round(random.gauss(180, 20), 1),
                            "temperature": round(30 + temp_factor * 25 + random.gauss(0, 2), 1),
                        })

    # Clean up private keys before returning
    for w in data["wells"]:
        for k in list(w.keys()):
            if k.startswith("_"):
                del w[k]

    logger.info(
        "seed_generation_complete",
        basins=len(data["basins"]),
        fields=len(data["fields"]),
        blocks=len(data["blocks"]),
        formations=len(data["formations"]),
        wells=len(data["wells"]),
        wellbores=len(data["wellbores"]),
        surveys=len(data["trajectory_surveys"]),
        intervals=len(data["formation_intervals"]),
        events=len(data["drilling_events"]),
        mitigations=len(data["mitigations"]),
        lessons=len(data["lessons_learned"]),
        telemetry=len(data["telemetry_samples"]),
    )
    return data
