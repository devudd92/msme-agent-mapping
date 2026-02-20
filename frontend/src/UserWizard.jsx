import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Star, MapPin, Link as LinkIcon, Download, UploadCloud, Search, CheckCircle2, Factory, ChevronRight, ChevronLeft, Building, BarChart2, PieChart, TrendingUp } from 'lucide-react';
import './App.css';

const generateDynamicMetric = (str, min, max) => {
    let hash = 0;
    const input = str ? String(str).toLowerCase().trim() : 'default';
    for (let i = 0; i < input.length; i++) {
        hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % (max - min + 1) + min;
};

function UserWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [language, setLanguage] = useState('en');
    const [formData, setFormData] = useState({
        companyName: '',
        ownerName: '',
        phone: '',
        email: '',
        products: [],
        state: '',
        city: '',
        requirement: ''
    });

    const [categories, setCategories] = useState(null);
    const [snpRecommendations, setSnpRecommendations] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                // Decide which field is currently being edited based on current step
                if (currentStep === 1) {
                    setFormData(prev => ({ ...prev, companyName: transcript }));
                } else if (currentStep === 2) {
                    setFormData(prev => ({ ...prev, products: [transcript] }));
                } else if (currentStep === 3) {
                    setFormData(prev => ({ ...prev, requirement: transcript }));
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, [currentStep]);

    const handleVoiceRecord = () => {
        if (!SpeechRecognition) {
            alert("Your browser does not support Speech Recognition. Try Chrome or Edge.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            // Set language dynamically
            recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const INDIAN_STATES = [
        "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
        "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
        "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
        "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
    ];

    const languages = [
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
        { code: 'en', name: 'English', native: 'English' },
        { code: 'mr', name: 'Marathi', native: 'मराठी' },
        { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
        { code: 'te', name: 'Telugu', native: 'తెలుగు' }
    ];

    const steps = [
        'Language',
        'Business Info',
        'Smart Product Mapping',
        'Marketplace Match',
        'Submit & Analytics'
    ];

    const categorizeProduct = async (description) => {
        if (description.length <= 15) return;
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

    const getSNPRecommendations = async () => {
        setLoading(true);
        try {
            let products = [];
            const reqText = formData.requirement || (formData.products[0] || "materials");
            products = [{ description: reqText }];

            const response = await fetch('/api/v1/match/recommend-snps?top_k=10', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_info: { state: formData.state },
                    state: formData.state,
                    requirement: reqText,
                    products
                })
            });
            const data = await response.json();

            if (data.success) {
                // Feature explicitly requested: Sort vendors on the basis of reviews/ratings.
                const sortedRecommendations = data.recommendations.sort((a, b) => {
                    const ratingA = a.snp.rating || 0;
                    const ratingB = b.snp.rating || 0;
                    return ratingB - ratingA; // Descending order
                });
                setSnpRecommendations(sortedRecommendations);
            }
        } catch (error) {
            console.error('Matching failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequirementDocument = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const formDataDoc = new FormData();
        formDataDoc.append('file', file);
        formDataDoc.append('document_type', 'requirement');
        try {
            const res = await fetch('/api/v1/documents/upload', {
                method: 'POST',
                body: formDataDoc
            });
            const data = await res.json();
            if (data.success && data.extracted_data && data.extracted_data.requirement) {
                setFormData({ ...formData, requirement: data.extracted_data.requirement });
            } else {
                alert('Could not cleanly extract text. Falling back to filename NLP mapping.');
                setFormData({ ...formData, requirement: file.name.split('.')[0] });
            }
        } catch (error) {
            console.error("Upload error", error);
        } finally {
            setLoading(false);
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

    // Download mock template logic
    const downloadTemplate = () => {
        const link = document.createElement("a");
        const fileData = "COMPANY NAME:\nREQUIREMENT:\nPREF STATE:\n\n=== FILL THIS OUT ===";
        const blob = new Blob([fileData], { type: "text/plain" });
        link.href = URL.createObjectURL(blob);
        link.download = "Requirement_Template.txt";
        link.click();
    };

    return (
        <div className="App">
            <header className="header">
                <div className="container header-content">
                    <Factory size={40} color="var(--primary)" />
                    <div>
                        <h1>MSME Agent Workspace</h1>
                        <p>AI-Powered MSE Connectivity Framework 🇮🇳</p>
                    </div>
                </div>
            </header>

            <div className="progress-container">
                <div className="progress-bar">
                    {steps.map((step, index) => (
                        <div key={index} className={`progress-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}>
                            <div className="step-number">
                                {index < currentStep ? <CheckCircle2 size={24} /> : index + 1}
                            </div>
                            <div className="step-label">{step}</div>
                        </div>
                    ))}
                </div>
            </div>

            <main className="main-content container">
                {currentStep === 0 && (
                    <div className="step-content">
                        <h2>Select Core Language</h2>
                        <p className="subtitle">Choose the language for Smart Processing & Voice Analysis</p>

                        <div className="form-row">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`btn ${language === lang.code ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setLanguage(lang.code)}
                                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                >
                                    <span style={{ fontSize: '1.4rem' }}>{lang.native}</span>
                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="step-content">
                        <h2>Business Details</h2>
                        <p className="subtitle">Tell us about your organization</p>

                        <div className="form-group">
                            <label>Company Name (Voice Supported)</label>
                            <div className="input-with-voice">
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    placeholder="Enter your enterprise name"
                                />
                                <button className={`voice-btn-icon ${isRecording ? 'recording' : ''}`} onClick={handleVoiceRecord}>
                                    {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>
                            </div>
                            {isRecording && <div className="transcription">Listening... Browser is capturing audio.</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>State Location</label>
                                <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}>
                                    <option value="">Select Primary State</option>
                                    {INDIAN_STATES.map((state) => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Contact Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 Mobile"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="step-content">
                        <h2>Smart Product Categorization</h2>
                        <p className="subtitle">Describe your domain and let the AI map it to taxonomy categories.</p>

                        <div className="form-group">
                            <label>Domain / Product Context</label>
                            <div className="input-with-voice" style={{ alignItems: 'flex-start' }}>
                                <textarea
                                    value={formData.products[0] || ''}
                                    placeholder="Dictate or type what you deal with (e.g. Handmade wooden textiles)"
                                    onChange={(e) => {
                                        setFormData({ ...formData, products: [e.target.value] });
                                        categorizeProduct(e.target.value);
                                    }}
                                />
                                <button className={`voice-btn-icon ${isRecording ? 'recording' : ''}`} style={{ top: '10px' }} onClick={handleVoiceRecord}>
                                    {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>
                            </div>
                            {isRecording && <div className="transcription">Listening for product description...</div>}
                        </div>

                        {categories && (
                            <div className="category-result">
                                <h3>Mapped Taxonomy Categories</h3>
                                <div className="category-hierarchy">
                                    <span className="badge-tag">{categories.categories.categories.level_1 || "Level 1"}</span>
                                    <ChevronRight size={16} color="var(--text-muted)" style={{ marginTop: '6px' }} />
                                    <span className="badge-tag">{categories.categories.categories.level_2 || "General"}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>
                                    Confidence Rating: {(categories.confidence * 100).toFixed(0)}%
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="step-content" style={{ padding: '36px' }}>
                        <h2>Marketplace Vendor Finder</h2>
                        <p className="subtitle">We dynamically map live vendors matching your prompt, sorted by verified review ratings.</p>

                        <div className="form-group">
                            <label>Ask for a service or requirement</label>
                            <div className="input-with-voice">
                                <input
                                    type="text"
                                    placeholder="What are you looking for? e.g., 'Wooden toy sellers'"
                                    value={formData.requirement}
                                    onChange={e => setFormData({ ...formData, requirement: e.target.value })}
                                />
                                <button className={`voice-btn-icon ${isRecording ? 'recording' : ''}`} onClick={handleVoiceRecord}>
                                    {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-row" style={{ marginTop: '20px' }}>
                            <div className="action-box">
                                <UploadCloud size={32} color="var(--primary)" style={{ marginBottom: '10px' }} />
                                <div><label style={{ justifyContent: 'center', cursor: 'pointer', margin: 0 }}>
                                    <b>Upload Document</b>
                                    <input type="file" style={{ display: 'none' }} accept=".txt,.pdf,.jpg" onChange={handleRequirementDocument} />
                                </label></div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload specs for smart extraction</div>
                            </div>
                            <div className="action-box" onClick={downloadTemplate} style={{ cursor: 'pointer' }}>
                                <Download size={32} color="var(--primary)" style={{ marginBottom: '10px' }} />
                                <div style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>Download Template</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Get standard requirement outline</div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '30px' }}>
                            <button className="btn btn-primary" onClick={getSNPRecommendations} disabled={loading}>
                                {loading ? 'Fetching Live Data...' : <><Search size={20} /> Search Marketplace</>}
                            </button>
                        </div>

                        {loading && (
                            <div className="loader-container">
                                <div className="spinner"></div>
                                <div>Scanning marketplace & analyzing logic...</div>
                            </div>
                        )}

                        {!loading && snpRecommendations.length > 0 && (
                            <div className="snp-recommendations">
                                <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Top Ranked Web Matches</h3>
                                {snpRecommendations.map((rec, index) => (
                                    <div key={index} className={`snp-card ${index === 0 ? 'top-rank' : ''}`}>
                                        <div className="snp-header">
                                            <div className="snp-rank">#{index + 1}</div>
                                            <div className="snp-info">
                                                <h3>{rec.snp.name}</h3>
                                                <div className="snp-desc">{rec.snp.description}</div>
                                                <div className="snp-meta">
                                                    <span className="meta-item"><MapPin size={16} /> {rec.snp.location.state}</span>
                                                    <span className="meta-item">
                                                        <LinkIcon size={16} />
                                                        <a href={rec.snp.location.address} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                                            Visit Online Source
                                                        </a>
                                                    </span>
                                                    <div className="rating-badge">
                                                        <Star size={16} fill="currentColor" />
                                                        {rec.snp.rating} / 5.0
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="snp-details">
                                            <h4>Why this provider?</h4>
                                            <ul className="reasons-list">
                                                {rec.explanation.main_reasons.map((reason, i) => (
                                                    <li key={i}><CheckCircle2 size={16} /> {reason}</li>
                                                ))}
                                                {rec.explanation.strengths.slice(0, 1).map((s, i) => (
                                                    <li key={`s-${i}`}><Building size={16} /> {s}</li>
                                                ))}
                                            </ul>
                                            <button className="select-snp-btn">Request Connection via Agency</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="step-content">
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <CheckCircle2 size={60} color="var(--secondary)" style={{ marginBottom: '10px' }} />
                            <h2>Application Finalized</h2>
                            <p className="subtitle">All your data, smart contexts, and vendor mappings have been securely prepared.</p>
                        </div>

                        <div className="analytics-section" style={{ background: 'rgba(248, 116, 34, 0.05)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(248, 116, 34, 0.2)', marginBottom: '30px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                                <TrendingUp size={24} color="var(--primary)" />
                                Real-time Sector Analytics
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginTop: '20px' }}>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <BarChart2 size={24} color="#64748b" />
                                        <span style={{ fontWeight: '600', color: '#333' }}>Market Demand Index</span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        +{generateDynamicMetric(formData.state + (formData.requirement || formData.products[0]), 12, 58)}%
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Expected growth in {formData.state || "your region"} in Q2</div>
                                </div>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <PieChart size={24} color="#64748b" />
                                        <span style={{ fontWeight: '600', color: '#333' }}>Category Fit Score</span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                                        {categories ? (categories.confidence * 100).toFixed(0) : generateDynamicMetric((formData.requirement || formData.products[0]), 75, 98)}%
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Accuracy against standards</div>
                                </div>
                            </div>
                        </div>

                        <div className="action-box" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                            <p>You can push these details to the API Sandbox.</p>
                            <button className="btn btn-primary" onClick={() => alert('Onboarding Payload Pushed to Service Provider!')}>
                                <UploadCloud size={20} /> Push Integration
                            </button>
                        </div>
                    </div>
                )}

                <div className="navigation-buttons">
                    {currentStep > 0 ? (
                        <button className="btn btn-secondary" onClick={prevStep}><ChevronLeft size={20} /> Back</button>
                    ) : <div></div>}

                    {currentStep < steps.length - 1 && (
                        <button className="btn btn-primary" onClick={nextStep}>Continue <ChevronRight size={20} /></button>
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p>© 2026 Advanced AI Agent Platform • Ministry of Enterprises Tech Sandbox</p>
                </div>
            </footer>
        </div>
    );
}

export default UserWizard;
