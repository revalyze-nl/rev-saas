import React from 'react';
import './Billing.css';

const AuroraPricingCard = () => {
    return (
        <div className="aurora-pricing-card">
            <h2>Our Pricing</h2>
            <p>Flexible plans tailored for your needs.</p>
            <div className="pricing-details">
                <span className="plan-price">$29/month</span>
                <button className="subscribe-btn">Get Started</button>
            </div>
        </div>
    );
};

export default AuroraPricingCard;