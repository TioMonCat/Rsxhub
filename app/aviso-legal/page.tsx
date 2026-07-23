export const metadata = {
  title: 'Legal Notice - RSX',
  description: 'Legal Notice and ownership terms for realsimexperience.com.',
}

export default function LegalNoticePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-20 text-slate-350 space-y-12">
      {/* Title */}
      <div className="border-b border-white/10 pb-6 space-y-2">
        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white">
          Legal Notice
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
            1. Identifying Data
          </h2>
          <p>
            In compliance with Article 10 of Law 34/2002 of July 11 on Information Society Services and Electronic Commerce (LSSICE), the website owner's identifying data is provided below:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 font-medium">
            <li><strong className="text-slate-300">Name:</strong> RSX Real Sim Experience</li>
            <li><strong className="text-slate-300">Website:</strong> <a href="https://realsimexperience.com" className="text-[#1274de] hover:underline" target="_blank" rel="noopener noreferrer">https://realsimexperience.com</a></li>
            <li><strong className="text-slate-300">Email:</strong> realsimxperience@gmail.com</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            2. Object and Scope of Application
          </h2>
          <p>
            This Legal Notice regulates the access and use of the website <strong className="text-white">realsimexperience.com</strong> and the RSX platform, understood as the set of digital services related to the organization and management of sim racing leagues.
          </p>
          <p>
            Accessing and/or using the website attributes the status of <strong className="text-slate-200">User</strong> to the visitor and implies full and unreserved acceptance of these conditions.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            3. Intellectual and Industrial Property
          </h2>
          <p>
            All website content (texts, images, logos, design, source code, and any other elements) is the property of RSX Real Sim Experience or its licensors and is protected by Spanish and international intellectual and industrial property laws.
          </p>
          <p>
            Any reproduction, distribution, public communication, or transformation of this content is prohibited without the express written authorization of the owner, except for personal and non-commercial use.
          </p>
          <p className="text-slate-400">
            Video game names, trademarks, and third-party logos mentioned on the platform (Assetto Corsa, Le Mans Ultimate, Steam, etc.) are the property of their respective owners. RSX has no official affiliation with these brands.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            4. Disclaimer of Warranties and Liability
          </h2>
          <p>
            RSX does not guarantee the continuous and uninterrupted availability of the website or its services. Access may be interrupted for technical reasons, maintenance, or other causes beyond RSX's control.
          </p>
          <p>
            RSX is not responsible for any damages that may arise from using the website, from errors or omissions in the content, or from the conduct of third-party users.
          </p>
          <p className="text-slate-400 italic">
            Results, standings, and statistics published on the platform are for informational purposes only and may be subject to modification by the organizers of each league.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            5. User-Generated Content
          </h2>
          <p>
            Users who publish content on the platform (names, images, comments, incident reports, etc.) are solely responsible for that content. RSX reserves the right to remove any content that violates third-party rights, current legislation, or community guidelines.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            6. Minors
          </h2>
          <p>
            The platform is aimed at users over 16 years of age. Minors under this age must have the consent of their parents or legal guardians to register and use the services.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            7. Applicable Law and Jurisdiction
          </h2>
          <p>
            These conditions are governed by Spanish law. For the resolution of any dispute arising from the use of the website, the parties submit to the competent Courts and Tribunals in accordance with current Spanish regulations.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            8. Amendments to the Legal Notice
          </h2>
          <p>
            RSX reserves the right to modify this Legal Notice at any time. Any modifications will take effect upon their publication on the website.
          </p>
        </section>

      </div>
    </div>
  )
}
