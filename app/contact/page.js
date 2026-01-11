
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Contact() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>Contact Us</h1>
            <p>We'd love to hear from you. Please reach out with any questions, feedback, or support requests.</p>

            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Mail color="#3b82f6" />
                    <div>
                        <strong>Email:</strong><br />
                        <a href="mailto:Siyamthanda@synesis.info" style={{ color: '#3b82f6', textDecoration: 'none' }}>Siyamthanda@synesis.info</a>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Phone color="#3b82f6" />
                    <div>
                        <strong>Phone:</strong><br />
                        <a href="tel:+27689912257" style={{ color: '#333', textDecoration: 'none' }}>+27 68 991 2257</a>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <MapPin color="#3b82f6" />
                    <div>
                        <strong>Address:</strong><br />
                        <span style={{ color: '#555' }}>
                            28 Mafunka Crescent<br />
                            Cape Town, South Africa
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                <h3>Company Details</h3>
                <p><strong>Founder & Developer:</strong> Siyamthanda Kuhlmann</p>
                <p><strong>Entity:</strong> Synesis</p>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>&larr; Back to Home</Link>
            </div>
        </div>
    );
}
