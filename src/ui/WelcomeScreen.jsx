import React, { useState } from 'react';

export default function WelcomeScreen({ onStart }) {
    // Easter egg or simple interactivity
    const [glitch, setGlitch] = useState(false);

    return (
        <div className="welcome-screen pixel-theme" onClick={() => setGlitch(true)}>
            <div className="league-container">
                {/* Header / Event Title */}
                <div className={`league-title ${glitch ? 'glitch-effect' : ''}`} onAnimationEnd={() => setGlitch(false)}>
                    <div className="title-top">LEAGUE OF LAG</div>
                    <div className="title-sub">CODING CLUB</div>
                </div>

                {/* Date / Time / Location */}
                <div className="event-details">
                    <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <span>6 FEB 26</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">⏰</span>
                        <span>9 PM - 11 PM</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">📍</span>
                        <span>CDH 2</span>
                    </div>
                </div>

                {/* Poster Graphics (CSS Art) */}
                <div className="pixel-art-decoration">
                    <div className="dino-icon">🦖</div>
                    <div className="code-brackets">{'< />'}</div>
                    <div className="headset-icon">🎧</div>
                </div>

                {/* Main Action */}
                <div className="welcome-actions">
                    <button className="start-btn-pixel" onClick={onStart}>
                        <span className="blink-text">{'>_ ENTER SYSTEM'}</span>
                    </button>
                </div>

                {/* Footer info */}
                <div className="event-footer">
                    <p className="footer-line">IISER Thiruvananthapuram</p>
                    <p className="footer-line">"No syntax errors, just pure fun!"</p>
                </div>
            </div>
        </div>
    );
}
