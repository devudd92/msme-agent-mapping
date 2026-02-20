from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

class Location(BaseModel):
    state: str
    city: str
    address: Optional[str] = None
    pincode: str

class SNP(BaseModel):
    id: str
    name: str
    description: str
    location: Location
    categories: List[str]
    rating: float
    onboarding_success_rate: float
    commission_rate: float
    capabilities: List[str] = []

class MSEProfile(BaseModel):
    company_name: str
    owner_name: str
    phone: str
    email: str
    state: str
    city: str
    address: Optional[str] = ""
    pincode: Optional[str] = ""
    products: List[Dict[str, Any]] = []
    production_capacity: Optional[str] = ""

class Application(BaseModel):
    application_id: str = Field(..., alias="id")
    mse_profile: MSEProfile
    selected_snp_id: Optional[str] = None
    status: str = "submitted" # submitted, verified, rejected
    documents: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)

class VoiceInput(BaseModel):
    text: str
    language: str

class CategoryResult(BaseModel):
    categories: Dict[str, Any]
    attributes: Dict[str, Any]
    compliance: List[str]
    confidence: float

class MatchExplanation(BaseModel):
    main_reasons: List[str]
    strengths: List[str]

class MatchScore(BaseModel):
    overall_score: float
    location_match: float
    category_match: float
    performance_match: float

class MatchResult(BaseModel):
    snp: SNP
    match_score: MatchScore
    explanation: MatchExplanation
    rank: int

class SnpRecommendationRequest(BaseModel):
    business_info: MSEProfile # Allow nested or flat? The frontend sends nested.
    # Frontend sends:
    # business_info: { ... }, products: [...], production_capacity: "..."
    # So we should probably define a request model that matches exactly
    pass

class RecommendationRequest(BaseModel):
    business_info: Dict[str, Any]
    products: List[Any]
    production_capacity: str
