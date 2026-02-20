import React, { useState, useEffect } from 'react';
import './App.css';

function UserWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [language, setLanguage] = useState('hi');
    const [formData, setFormData] = useState({
        companyName: '',
        ownerName: '',
        phone: '',
        email: '',
        products: [],
        state: '',
        city: ''
    });
    const [categories, setCategories] = useState(null);
    const [snpRecommendations, setSnpRecommendations] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');

    const languages = [
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
        { code: 'en', name: 'English', native: 'English' },
        { code: 'bn', name: 'Bengali', native: 'বাংলা' },
        { code: 'te', name: 'Telugu', native: 'తెలుగు' },
        { code: 'mr', name: 'Marathi', native: 'मराठी' },
        { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
        { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' }
    ];

    const steps = [
        'Language Selection',
        'Business Information',
        'Product Details',
        'SNP Recommendations',
        'Submit Application'
    ];

    const handleVoiceRecord = async () => {
        setIsRecording(!isRecording);

        if (!isRecording) {
            setTimeout(() => {
                const mockTranscription = language === 'hi'
                    ? 'मेरी कंपनी का नाम राज हस्तशिल्प है'
                    : 'My company name is Raj Handicrafts';
                setTranscription(mockTranscription);
                setFormData({ ...formData, companyName: mockTranscription.split(' ').slice(-2).join(' ') });
                setIsRecording(false);
            }, 2000);
        }
    };

    const categorizeProduct = async (description) => {
        try {
            const response = await fetch('/api/v1/categorize/product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, language })
            });
            const data = await response.json();
            if (data.success) {
                setCategories(data);
            }
        } catch (error) {
            console.error('Categorization failed:', error);
        }
    };

    // Update getSNPRecommendations to always use the requirement
    const getSNPRecommendations = async (requirement = null) => {
        try {
            let products = [];
            if (requirement) {
                products = [{ description: requirement }];
            } else if (formData.requirement) {
                products = [{ description: formData.requirement }];
            } else if (categories && categories.categories && categories.categories.categories) {
                products = [{ description: categories.categories.categories.level_3 || 'Handicraft' }];
            } else {
                products = formData.products.map(p => ({ description: p }));
            }
            const response = await fetch('/api/v1/match/recommend-snps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: formData.companyName,
                    owner_name: formData.ownerName,
                    phone: formData.phone,
                    email: formData.email,
                    state: formData.state,
                    city: formData.city,
                    products,
                    production_capacity: '1000 units/month'
                })
            });
            const data = await response.json();
            if (data.success) {
                setSnpRecommendations(data.recommendations);
            }
        } catch (error) {
            console.error('Matching failed:', error);
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);

            if (currentStep === 2) {
                getSNPRecommendations();
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // New: Extract requirement from uploaded document
    const handleRequirementDocument = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formDataDoc = new FormData();
        formDataDoc.append('file', file);
        formDataDoc.append('document_type', 'requirement');
        const res = await fetch('/api/v1/documents/upload', {
            method: 'POST',
            body: formDataDoc
        });
        const data = await res.json();
        if (data.success && data.extracted_data && data.extracted_data.requirement) {
            setFormData({ ...formData, requirement: data.extracted_data.requirement });
            alert('Requirement extracted from document!');
        } else {
            alert('Could not extract requirement from document.');
        }
    };

    return (
        <div className="App">
            <header className="header">
                <div className="container">
                    <h1>🇮🇳 MSME Agent Mapping</h1>
                    <p>AI-Powered MSE Onboarding to ONDC</p>
                </div>
            </header>

            <div className="progress-container">
                <div className="progress-bar">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className={`progress-step ${index <= currentStep ? 'active' : ''}`}
                        >
                            <div className="step-number">{index + 1}</div>
                            <div className="step-label">{step}</div>
                        </div>
                    ))}
                </div>
            </div>

            <main className="main-content container">
                {currentStep === 0 && (
                    <div className="step-content">
                        <h2>Select Your Preferred Language</h2>
                        <p className="subtitle">अपनी भाषा चुनें | Choose Your Language</p>

                        <div className="language-grid">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`language-card ${language === lang.code ? 'selected' : ''}`}
                                    onClick={() => setLanguage(lang.code)}
                                >
                                    <div className="lang-native">{lang.native}</div>
                                    <div className="lang-english">{lang.name}</div>
                                </button>
                            ))}
                        </div>

                        <div className="input-mode">
                            <h3>Select Input Mode</h3>
                            <div className="mode-buttons">
                                <button className="mode-btn voice-btn">🎤 Voice Input</button>
                                <button className="mode-btn text-btn">⌨️ Text Input</button>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="step-content">
                        <h2>Business Information</h2>
                        <p className="subtitle">व्यवसाय की जानकारी | कृपया अपनी कंपनी का विवरण दें</p>

                        <div className="form-group">
                            <label>Company Name</label>
                            <div className="input-with-voice">
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    placeholder="Enter company name"
                                />
                                <button className={`voice-btn-small ${isRecording ? 'recording' : ''}`} onClick={handleVoiceRecord}>🎤</button>
                            </div>
                            {isRecording && <div className="recording-indicator">🔴 Recording...</div>}
                            {transcription && <div className="transcription">{transcription}</div>}
                        </div>

                        <div className="form-group">
                            <label>Owner Name</label>
                            <input
                                type="text"
                                value={formData.ownerName}
                                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                                placeholder="Enter owner name"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="10-digit mobile number"
                                    pattern="[0-9]{10}"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>State</label>
                                <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}>
                                    <option value="">Select State</option>
                                    <option value="Rajasthan">Rajasthan</option>
                                    <option value="Gujarat">Gujarat</option>
                                    <option value="Maharashtra">Maharashtra</option>
                                    <option value="Karnataka">Karnataka</option>
                                    <option value="Haryana">Haryana</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Enter city"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="step-content">
                        <h2>Product Information</h2>
                        <p className="subtitle">उत्पाद की जानकारी | Tell us about your products</p>

                        <div className="form-group">
                            <label>Product Description</label>
                            <textarea
                                placeholder="Describe your products in detail (e.g., handmade wooden toys for children)"
                                rows="4"
                                onChange={(e) => {
                                    const description = e.target.value;
                                    if (description.length > 20) {
                                        categorizeProduct(description);
                                    }
                                }}
                            />
                        </div>

                        {categories && (
                            <div className="category-result">
                                <h3>✅ AI Categorization Result</h3>
                                <div className="category-hierarchy">
                                    <div className="category-level"><strong>L1:</strong> {categories.categories.categories.level_1}</div>
                                    {categories.categories.categories.level_2 && <div className="category-level"><strong>L2:</strong> {categories.categories.categories.level_2}</div>}
                                    {categories.categories.categories.level_3 && <div className="category-level"><strong>L3:</strong> {categories.categories.categories.level_3}</div>}
                                </div>

                                {categories.categories.attributes && (
                                    <div className="attributes">
                                        <h4>Extracted Attributes:</h4>
                                        <div className="attribute-tags">
                                            {Object.entries(categories.categories.attributes).map(([key, value]) => (
                                                <span key={key} className="tag">{key}: {Array.isArray(value) ? value.join(', ') : value}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="confidence">Confidence: {(categories.confidence * 100).toFixed(1)}%</div>
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="step-content">
                        <h2>Find Seller Matching Your Requirements</h2>
                        <p className="subtitle">अपनी आवश्यकताओं के अनुसार विक्रेता खोजें</p>
                        <div className="form-group">
                            <label>Describe Your Requirement</label>
                            <textarea
                                placeholder="Describe what you need (e.g., wooden toys, textiles, electronics, etc.)"
                                rows="3"
                                value={formData.requirement || ''}
                                onChange={e => setFormData({ ...formData, requirement: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Or Upload Requirement Document (PDF, JPG, PNG)</label>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleRequirementDocument} />
                        </div>
                        <button className="btn btn-primary" onClick={async () => {
                            const description = formData.requirement || '';
                            if (!description) {
                                alert('Please enter or upload your requirement.');
                                return;
                            }
                            await getSNPRecommendations(description);
                        }}>Find Seller</button>
                        <div className="snp-recommendations">
                            {snpRecommendations.length === 0 ? (
                                <p>No recommendations found or Backend Error. Try again.</p>
                            ) : snpRecommendations.map((rec, index) => (
                                <div key={index} className="snp-card">
                                    <div className="snp-header">
                                        <div className="snp-rank">#{rec.rank}</div>
                                        <div className="snp-info">
                                            <h3>{rec.snp.name}</h3>
                                            <p>{rec.snp.description}</p>
                                            <div className="snp-location">📍 {rec.snp.location.city}, {rec.snp.location.state}</div>
                                            <div className="snp-contact">📞 {rec.snp.phone || 'N/A'}</div>
                                            <div className="snp-address">🏠 {rec.snp.location.address}, {rec.snp.location.pincode}</div>
                                        </div>
                                        <div className="match-score">
                                            <div className="score-circle">{(rec.match_score.overall_score * 100).toFixed(0)}%</div>
                                            <div>Match</div>
                                        </div>
                                    </div>
                                    <div className="snp-details">
                                        <h4>Why Recommended:</h4>
                                        <ul>{rec.explanation.main_reasons.map((reason, i) => <li key={i}>✓ {reason}</li>)}</ul>
                                        <button className="select-snp-btn">Select {rec.snp.name}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="step-content">
                        <h2>Submit Application & Upload Documents</h2>
                        <p className="subtitle">आवेदन जमा करें और दस्तावेज़ अपलोड करें</p>

                        <div className="form-group">
                            <label>Upload Document (GST, Udyam, etc.)</label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const formDataDoc = new FormData();
                                    formDataDoc.append('file', file);
                                    formDataDoc.append('document_type', 'general');
                                    const res = await fetch('/api/v1/documents/upload', {
                                        method: 'POST',
                                        body: formDataDoc
                                    });
                                    const data = await res.json();
                                    alert(data.success ? 'Document uploaded!' : 'Upload failed: ' + data.detail);
                                }}
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={async () => {
                                // Submit application data
                                const res = await fetch('/api/v1/applications/create', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        mse_profile: formData,
                                        products: formData.products,
                                        state: formData.state,
                                        city: formData.city
                                    })
                                });
                                const data = await res.json();
                                alert(data.success ? 'Application submitted!' : 'Submission failed: ' + data.detail);
                            }}
                        >
                            Submit Application
                        </button>
                    </div>
                )}

                <div className="navigation-buttons">
                    {currentStep > 0 && <button className="btn btn-secondary" onClick={prevStep}>← Previous</button>}
                    {currentStep < steps.length - 1 && <button className="btn btn-primary" onClick={nextStep}>Next →</button>}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p>Powered by IndiaAI | Ministry of MSME</p>
                    <p>© 2026 MSME Agent Mapping System</p>
                </div>
            </footer>
        </div>
    );
}

export default UserWizard;
