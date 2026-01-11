
export default function PrivacyPolicy() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>Privacy Policy</h1>
            <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>

            <h2>1. Introduction</h2>
            <p>Welcome to Synesis ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (synesis.info) and tell you about your privacy rights and how the law protects you.</p>

            <h2>2. Information We Collect</h2>
            <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together follows:</p>
            <ul>
                <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                <li><strong>Contact Data:</strong> includes email address.</li>
                <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of products and services you have purchased from us. Note: Payment transactions are processed securely by Stripe; we do not store your full credit card details.</li>
                <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
                <li><strong>Usage Data:</strong> includes information about how you use our website, products, and services, such as the topics you study and articles you generate.</li>
            </ul>

            <h2>3. How We Use Your Personal Data</h2>
            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul>
                <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing the educational content and tracking your progress).</li>
                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                <li>Where we need to comply with a legal obligation.</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.</p>

            <h2>5. Third-Party Links</h2>
            <p>This website may include links to third-party websites, plug-ins and applications. Clicking on those links or enabling those connections may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements.</p>

            <h2>6. Contact Details</h2>
            <p>If you have any questions about this privacy policy or our privacy practices, please contact us at:</p>
            <address>
                <strong>Synesis</strong><br />
                Siyamthanda Kuhlmann<br />
                28 Mafunka Crescent, Cape Town, South Africa<br />
                Email: <a href="mailto:Siyamthanda@synesis.info">Siyamthanda@synesis.info</a><br />
                Phone: +27 68 991 2257
            </address>
        </div>
    );
}
