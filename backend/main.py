"""
MSME Agent Mapping - Main API Server
FastAPI backend for voice-enabled MSE onboarding to ONDC
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import json

# Import our custom modules
from services.voice_service import VoiceService
from services.categorization_service import CategorizationService
from services.matching_service import MatchingService
from services.document_service import DocumentService
from database.db_manager import db as db_manager
from models.schemas import (
    MSEProfile, SNP, Application, 
    VoiceInput, CategoryResult, MatchResult
)

app = FastAPI(
    title="MSME Agent Mapping API",
    description="AI-powered MSE onboarding to ONDC via TEAM initiative",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
voice_service = VoiceService()
categorization_service = CategorizationService()
matching_service = MatchingService()
document_service = DocumentService()


# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "MSME Agent Mapping API",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check with service status"""
    return {
        "api": "healthy",
        "database": db_manager.check_connection(),
        "ml_models": {
            "categorization": categorization_service.model_loaded,
            "matching": matching_service.model_loaded
        },
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# VOICE PROCESSING ENDPOINTS
# ============================================================================

@app.post("/api/v1/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = "hi"
):
    """
    Transcribe voice input to text
    
    Args:
        audio: Audio file (WAV, MP3, OGG)
        language: Language code (hi, en, bn, te, etc.)
    
    Returns:
        Transcribed text with confidence score
    """
    try:
        # Read audio file
        audio_bytes = await audio.read()
        
        # Process with voice service
        result = voice_service.transcribe(audio_bytes, language)
        
        return {
            "success": True,
            "transcription": result["text"],
            "confidence": result["confidence"],
            "language": language,
            "processing_time": result.get("processing_time", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/v1/voice/extract-entities")
async def extract_entities_from_voice(data: VoiceInput):
    """
    Extract business entities from voice transcription
    
    Args:
        data: Voice input with transcription text
    
    Returns:
        Extracted entities (company name, products, location, etc.)
    """
    try:
        entities = voice_service.extract_entities(
            text=data.text,
            language=data.language
        )
        
        return {
            "success": True,
            "entities": entities,
            "extracted_count": len(entities)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")


@app.post("/api/v1/voice/text-to-speech")
async def text_to_speech(text: str, language: str = "hi"):
    """
    Convert text to speech for voice prompts
    
    Args:
        text: Text to convert to speech
        language: Language code
    
    Returns:
        Audio bytes (base64 encoded)
    """
    try:
        audio_data = voice_service.text_to_speech(text, language)
        
        return {
            "success": True,
            "audio": audio_data,
            "language": language,
            "format": "wav"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


# ============================================================================
# PRODUCT CATEGORIZATION ENDPOINTS
# ============================================================================

@app.post("/api/v1/categorize/product")
async def categorize_product(
    description: str,
    language: str = "en",
    include_attributes: bool = True
):
    """
    Categorize product using ONDC taxonomy (5 levels)
    
    Args:
        description: Product description
        language: Language of description
        include_attributes: Extract attributes (material, color, size, etc.)
    
    Returns:
        Category hierarchy, attributes, compliance requirements
    """
    try:
        result = categorization_service.categorize(
            description=description,
            language=language,
            extract_attributes=include_attributes
        )
        
        return {
            "success": True,
            "categories": result["categories"],
            "attributes": result.get("attributes", {}),
            "compliance": result.get("compliance", []),
            "confidence": result["confidence"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Categorization failed: {str(e)}")


@app.post("/api/v1/categorize/bulk")
async def categorize_bulk_products(products: List[str], language: str = "en"):
    """
    Categorize multiple products in bulk
    
    Args:
        products: List of product descriptions
        language: Language code
    
    Returns:
        List of categorization results
    """
    try:
        results = []
        for description in products:
            result = categorization_service.categorize(description, language)
            results.append(result)
        
        return {
            "success": True,
            "results": results,
            "total_processed": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk categorization failed: {str(e)}")


@app.get("/api/v1/categorize/taxonomy")
async def get_taxonomy(level: int = 1):
    """
    Get ONDC taxonomy structure
    
    Args:
        level: Taxonomy level (1-5)
    
    Returns:
        Taxonomy structure for specified level
    """
    try:
        taxonomy = categorization_service.get_taxonomy(level)
        return {
            "success": True,
            "level": level,
            "taxonomy": taxonomy
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch taxonomy: {str(e)}")


# ============================================================================
# MSE-SNP MATCHING ENDPOINTS
# ============================================================================

@app.post("/api/v1/match/recommend-snps")
async def recommend_snps(
    mse_profile: dict = Body(...),
    top_k: int = 3
):
    """
    Recommend top SNPs for an MSE
    
    Args:
        mse_profile: MSE business profile with products, location, capacity
        top_k: Number of SNP recommendations to return
    
    Returns:
        Ranked list of SNP recommendations with match scores and explanations
    """
    try:
        recommendations = await matching_service.match_mse_to_snps(
            mse_profile=mse_profile,
            top_k=top_k
        )
        return {
            "success": True,
            "recommendations": [
                {
                    "rank": r.rank,
                    "snp": {
                        "name": r.snp.name,
                        "description": r.snp.description,
                        "location": r.snp.location.dict(),
                        "phone": getattr(r.snp, "phone", "N/A"),
                        "address": r.snp.location.address,
                        "pincode": r.snp.location.pincode
                    },
                    "match_score": r.match_score.dict(),
                    "explanation": r.explanation.dict()
                } for r in recommendations
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")


@app.get("/api/v1/match/snp/{snp_id}")
async def get_snp_details(snp_id: str):
    """
    Get detailed information about a specific SNP
    
    Args:
        snp_id: SNP identifier
    
    Returns:
        SNP profile with capabilities, performance metrics, capacity
    """
    try:
        snp = db_manager.get_snp_by_id(snp_id)
        
        if not snp:
            raise HTTPException(status_code=404, detail="SNP not found")
        
        return {
            "success": True,
            "snp": snp
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch SNP: {str(e)}")


@app.post("/api/v1/match/feedback")
async def submit_matching_feedback(
    mse_id: str,
    snp_id: str,
    accepted: bool,
    rating: Optional[int] = None,
    comments: Optional[str] = None
):
    """
    Submit feedback on SNP match quality for reinforcement learning
    
    Args:
        mse_id: MSE identifier
        snp_id: SNP identifier
        accepted: Whether MSE accepted the recommendation
        rating: Optional satisfaction rating (1-5)
        comments: Optional feedback comments
    
    Returns:
        Confirmation of feedback submission
    """
    try:
        feedback_id = matching_service.record_feedback(
            mse_id=mse_id,
            snp_id=snp_id,
            accepted=accepted,
            rating=rating,
            comments=comments
        )
        
        return {
            "success": True,
            "feedback_id": feedback_id,
            "message": "Feedback recorded for model improvement"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record feedback: {str(e)}")


# ============================================================================
# APPLICATION MANAGEMENT ENDPOINTS
# ============================================================================

@app.post("/api/v1/applications/create")
async def create_application(application: Application):
    """
    Create new MSE onboarding application
    
    Args:
        application: Complete application data
    
    Returns:
        Application ID and status
    """
    try:
        app_id = db_manager.create_application(application.dict())
        
        return {
            "success": True,
            "application_id": app_id,
            "status": "submitted",
            "estimated_processing_time": "3-5 days",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application creation failed: {str(e)}")


@app.get("/api/v1/applications/{app_id}")
async def get_application_status(app_id: str):
    """
    Get application status and details
    
    Args:
        app_id: Application identifier
    
    Returns:
        Application details and current status
    """
    try:
        application = db_manager.get_application(app_id)
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {
            "success": True,
            "application": application
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch application: {str(e)}")


@app.put("/api/v1/applications/{app_id}/verify")
async def verify_application(
    app_id: str,
    verified: bool,
    verifier_id: str,
    comments: Optional[str] = None
):
    """
    NSIC verification endpoint
    
    Args:
        app_id: Application ID
        verified: Verification result
        verifier_id: NSIC official ID
        comments: Optional verification comments
    
    Returns:
        Updated application status
    """
    try:
        updated = db_manager.update_application_status(
            app_id=app_id,
            status="approved" if verified else "rejected",
            verifier_id=verifier_id,
            comments=comments
        )
        
        return {
            "success": True,
            "application_id": app_id,
            "status": "approved" if verified else "rejected",
            "updated": updated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


# ============================================================================
# DOCUMENT PROCESSING ENDPOINTS
# ============================================================================

@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "general"
):
    """
    Upload and process document (GST, Udyam, certificates, or requirement)
    """
    try:
        file_bytes = await file.read()
        extracted_data = document_service.process_document(
            file_bytes=file_bytes,
            file_type=file.content_type,
            document_type=document_type
        )
        # If document_type is 'requirement', try to extract a requirement string
        if document_type == 'requirement':
            # Simulate extraction: look for a 'requirement' key or fallback to OCR text
            requirement = extracted_data.get('requirement')
            if not requirement and 'text' in extracted_data:
                requirement = extracted_data['text']
            extracted_data['requirement'] = requirement
        return {
            "success": True,
            "document_type": document_type,
            "extracted_data": extracted_data,
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")


@app.post("/api/v1/documents/validate")
async def validate_document(document_type: str, data: Dict[str, Any]):
    """
    Validate extracted document data against government APIs
    
    Args:
        document_type: Type of document
        data: Extracted data to validate
    
    Returns:
        Validation result
    """
    try:
        validation_result = document_service.validate(document_type, data)
        
        return {
            "success": True,
            "valid": validation_result["valid"],
            "details": validation_result.get("details", {}),
            "errors": validation_result.get("errors", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


# ============================================================================
# ANALYTICS & REPORTING ENDPOINTS
# ============================================================================

@app.get("/api/v1/analytics/dashboard")
async def get_dashboard_metrics():
    """
    Get dashboard metrics for admin/NSIC
    
    Returns:
        Key metrics (applications, approval rate, processing time, etc.)
    """
    try:
        metrics = db_manager.get_dashboard_metrics()
        
        return {
            "success": True,
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")


@app.get("/api/v1/analytics/performance")
async def get_model_performance():
    """
    Get AI model performance metrics
    
    Returns:
        Model accuracy, latency, and quality metrics
    """
    try:
        performance = {
            "categorization": categorization_service.get_metrics(),
            "matching": matching_service.get_metrics(),
            "voice": voice_service.get_metrics()
        }
        
        return {
            "success": True,
            "performance": performance,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch performance: {str(e)}")


# ============================================================================
# CONFIGURATION ENDPOINTS
# ============================================================================

@app.get("/api/v1/config/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "success": True,
        "languages": [
            {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
            {"code": "en", "name": "English", "native": "English"},
            {"code": "bn", "name": "Bengali", "native": "বাংলা"},
            {"code": "te", "name": "Telugu", "native": "తెలుగు"},
            {"code": "mr", "name": "Marathi", "native": "मराठी"},
            {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
            {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી"},
            {"code": "ur", "name": "Urdu", "native": "اردو"},
            {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
            {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
            {"code": "or", "name": "Odia", "native": "ଓଡ଼ିଆ"},
            {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
            {"code": "as", "name": "Assamese", "native": "অসমীয়া"}
        ]
    }


# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
