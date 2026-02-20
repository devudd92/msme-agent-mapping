import json
import os
from typing import List, Optional
from models.schemas import Application, SNP
from datetime import datetime

DATA_DIR = "data"
APPLICATIONS_FILE = os.path.join(DATA_DIR, "applications.json")
SNPS_FILE = os.path.join(DATA_DIR, "snps.json")

class DBManager:
    def __init__(self):
        self.applications = []
        self.snps = []
        self._ensure_data_dir()
        self.load_data()

    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    def load_data(self):
        """Load data from JSON files."""
        if os.path.exists(APPLICATIONS_FILE):
            try:
                with open(APPLICATIONS_FILE, 'r') as f:
                    data = json.load(f)
                    # Convert dicts back to Pydantic models (handling datetime serialization)
                    self.applications = []
                    for app_dict in data:
                        # Pydantic handles naive datetimes, but we might need to be careful
                        self.applications.append(Application(**app_dict))
            except json.JSONDecodeError:
                self.applications = []
        
        if os.path.exists(SNPS_FILE):
            try:
                with open(SNPS_FILE, 'r') as f:
                    data = json.load(f)
                    self.snps = [SNP(**snp_dict) for snp_dict in data]
            except json.JSONDecodeError:
                self.snps = []
        else:
             # Initialize with some mock SNPs if file doesn't exist
            self.snps = self._get_default_snps()
            self.save_data()

    def save_data(self):
        """Save data to JSON files."""
        # Helper to serialize datetime objects
        def json_serial(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError ("Type %s not serializable" % type(obj))

        with open(APPLICATIONS_FILE, 'w') as f:
            # Convert Pydantic models to dicts
            app_data = [app.dict() for app in self.applications]
            json.dump(app_data, f, default=json_serial, indent=2)
            
        with open(SNPS_FILE, 'w') as f:
            snp_data = [snp.dict() for snp in self.snps]
            json.dump(snp_data, f, default=json_serial, indent=2)

    def _get_default_snps(self):
        from models.schemas import SNP, Location
        return [
            SNP(
                id="snp_001",
                name="CraftHub India",
                description="Specializes in onboarding handicraft artisans to global markets.",
                location=Location(state="Rajasthan", city="Jaipur", address="123 Craft Lane", pincode="302001"),
                categories=["Handicrafts", "Textiles", "Toys"],
                rating=4.8,
                onboarding_success_rate=0.92,
                commission_rate=5.0
            ),
            SNP(
                id="snp_002",
                name="AgriConnect",
                description="Focused on farm-to-table supply chain for agricultural products.",
                location=Location(state="Maharashtra", city="Pune", address="456 Farm Road", pincode="411001"),
                categories=["Agriculture", "Food", "Spices"],
                rating=4.5,
                onboarding_success_rate=0.88,
                commission_rate=4.5
            ),
            SNP(
                id="snp_003",
                name="TechRetail Solutions",
                description="Enabling electronics and retail MSEs with digital tools.",
                location=Location(state="Karnataka", city="Bangalore", address="789 Tech Park", pincode="560001"),
                categories=["Electronics", "Retail", "Services"],
                rating=4.2,
                onboarding_success_rate=0.85,
                commission_rate=6.0
            )
        ]

    async def create_application(self, application: Application) -> Application:
        # Check if ID exists, if so, update
        existing_index = next((i for i, app in enumerate(self.applications) if app.application_id == application.application_id), -1)
        if existing_index != -1:
            self.applications[existing_index] = application
        else:
            self.applications.append(application)
        
        self.save_data()
        return application

    async def get_application(self, application_id: str) -> Optional[Application]:
        return next((app for app in self.applications if app.application_id == application_id), None)

    async def list_applications(self) -> List[Application]:
        return self.applications

    async def list_snps(self) -> List[SNP]:
        return self.snps

    async def get_snp(self, snp_id: str) -> Optional[SNP]:
        return next((snp for snp in self.snps if snp.id == snp_id), None)

db = DBManager()
