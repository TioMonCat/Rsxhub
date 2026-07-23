export const metadata = {
  title: 'Terms & Conditions - RSX',
  description: 'Terms and Conditions of use for realsimexperience.com.',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-20 text-slate-350 space-y-12">
      {/* Title */}
      <div className="border-b border-white/10 pb-6 space-y-2">
        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white">
          Terms & Conditions
        </h1>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Latest update: April 2025
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-10 text-xs md:text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            1. Acceptance of Terms
          </h2>
          <p>
            By registering and using the RSX Real Sim Experience platform (hereinafter, "RSX" or "the Platform"), you agree to be bound by these Terms and Conditions, the Privacy Policy, and the Cookie Policy. If you do not agree with any of these terms, you must not use the Platform.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            2. Service Description
          </h2>
          <p>
            RSX is a digital platform for the organization, management, and tracking of sim racing leagues. Services include, but are not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Registration and enrollment in sim racing leagues and events.</li>
            <li>Publication of results, standings, and statistics.</li>
            <li>Race incident reporting system.</li>
            <li>Team and driver management.</li>
            <li>Administration tools for league organizers.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            3. User Registration and Account
          </h2>
          <p>
            Access to certain features requires registration through your Steam account. By registering:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>You must be at least 16 years old or have parental authorization.</li>
            <li>You are responsible for maintaining the security of your account.</li>
            <li>You must provide truthful and up-to-date information.</li>
            <li>You may not create accounts with false identities or impersonate others.</li>
            <li>One natural person = one account. Multiple accounts are prohibited.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            4. Rules of Conduct
          </h2>
          <p>
            The use of RSX is subject to the following rules of conduct. It is prohibited to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Engage in harassment, insults, threats, or discrimination against other users.</li>
            <li>Publish illegal, offensive, obscene content, or content that violates third-party rights.</li>
            <li>Attempt unauthorized access to systems, accounts, or data.</li>
            <li>Fraudulently manipulate results, standings, or scoring systems.</li>
            <li>Use cheats or hacks in competitions.</li>
            <li>Spam, advertise third-party services without authorization, or conduct unauthorized commercial activities.</li>
            <li>Interfere with the technical operation of the Platform.</li>
          </ul>
          <p>
            Failure to comply with these rules may result in the temporary or permanent suspension of the account.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            5. Participation in Leagues and Events
          </h2>
          <p>
            Each league may have its own specific regulations, which will prevail over these terms regarding the competition. By signing up for a league:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>You accept the specific regulations of that league.</li>
            <li>You acknowledge that the decisions of the stewards are final in matters of race incidents.</li>
            <li>You understand that participation may be revoked by the organizers for unsportsmanlike conduct.</li>
            <li>Published results may be modified as a consequence of penalties or corrections.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            6. User-Generated Content
          </h2>
          <p>
            By publishing content on the Platform (driver name, images, reports, etc.), you grant RSX a non-exclusive, royalty-free, worldwide license to use, display, and distribute that content in the context of the Platform's services. You are solely responsible for the content you publish and guarantee that you have the necessary rights to do so.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            7. Suspension and Cancellation of Account
          </h2>
          <p>
            RSX reserves the right to suspend or cancel user accounts that violate these terms, without prior notice in case of serious infractions. You may request the cancellation of your account at any time by writing to <a href="mailto:realsimxperience@gmail.com" className="text-[#1274de] hover:underline">realsimxperience@gmail.com</a>.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            8. Limitation of Liability
          </h2>
          <p>
            RSX provides the Platform "as is" and does not guarantee that the service will be uninterrupted, error-free, or meet all user expectations. To the maximum extent permitted by law, RSX will not be liable for indirect, incidental, or consequential damages arising from the use or inability to use the Platform.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            9. Third-Party Services
          </h2>
          <p>
            The Platform uses third-party services such as Steam (authentication), Supabase (database), and Netlify (hosting). The use of these services is subject to their own conditions. RSX is not responsible for the availability or operation of these external services.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            10. Modifications of the Service and Terms
          </h2>
          <p>
            RSX may modify, suspend, or discontinue any aspect of the service at any time. Likewise, it may update these Terms and Conditions, notifying you by posting on the Platform. Continued use of the service after the publication of changes implies acceptance thereof.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            11. Applicable Legislation
          </h2>
          <p>
            These Terms and Conditions are governed by Spanish legislation. Any dispute will be submitted to the competent courts of Spain.
          </p>
        </section>

      </div>
    </div>
  )
}
