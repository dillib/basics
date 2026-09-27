import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

// Written in plain language on purpose. Pricing is intentionally not
// described: everything is free while paid plans are undecided -- see
// section 3, which commits to notice + explicit agreement before any charge.
export default function TermsPage() {
  const lastUpdated = "September 27, 2026";

  return (
    <div className="min-h-screen bg-background">
      <LegalLayout title="Terms of Service" lastUpdated={lastUpdated} titleTestId="text-terms-title">
        <div className="mb-10 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <p className="mb-2 font-semibold text-foreground">The short version</p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>BasicsTutor is free to use right now.</li>
            <li>Lessons are AI-generated for learning. They can contain mistakes and are not professional advice.</li>
            <li>Use it respectfully and lawfully, and don&apos;t try to break or copy the service.</li>
            <li>We won&apos;t charge you for anything without telling you first and getting your explicit agreement.</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">This summary is for convenience. The full terms below are what apply.</p>
        </div>

        <section>
          <h2 className="mb-4">1. Agreeing to these terms</h2>
          <p className="text-muted-foreground mb-4">
            These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and BasicsTutor (&ldquo;BasicsTutor,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) covering your use of basicstutor.com and its related services (the &ldquo;Service&rdquo;).
          </p>
          <p className="text-muted-foreground">
            By using the Service, you agree to these Terms and to our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>. If you don&apos;t agree, please don&apos;t use the Service.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">2. Who can use BasicsTutor</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>You must be at least 13 years old to create an account.</li>
            <li>If you are under 18, you may use the Service only with the permission of a parent or guardian.</li>
            <li>Children under 13 must not create an account. Our Kids-level lessons are designed to be used together with a parent, guardian, or teacher.</li>
          </ul>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">3. The Service is free</h2>
          <p className="text-muted-foreground mb-4">
            BasicsTutor is currently free to use, and we do not ask for payment details.
          </p>
          <p className="text-muted-foreground mb-4">
            We may introduce optional paid features in the future. If we do, we will announce them in advance and describe the price and terms clearly. You will never be charged unless you explicitly choose to buy something and agree to its terms at that time.
          </p>
          <p className="text-muted-foreground">
            We may add, change, limit, or discontinue features of the Service at any time, including usage limits that keep the Service fair and available for everyone.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">4. AI-generated content</h2>
          <p className="text-muted-foreground mb-4">
            Lessons, explanations, visuals, quizzes, and tutor responses on BasicsTutor are generated with the help of artificial intelligence. We work to make them accurate and useful, but they can contain errors, omissions, or outdated information.
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>The Service is for general education only.</li>
            <li>Nothing on BasicsTutor is professional advice, including medical, legal, financial, tax, or safety advice.</li>
            <li>Check important information with a qualified professional or a reliable primary source before relying on it.</li>
            <li>You are responsible for how you use what you learn here.</li>
          </ul>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">5. Your account</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Provide accurate information and keep your account secure.</li>
            <li>You are responsible for activity that happens under your account.</li>
            <li>Tell us promptly at support@basicstutor.com if you believe your account has been used without your permission.</li>
            <li>You can stop using the Service or ask us to delete your account at any time.</li>
          </ul>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">6. Acceptable use</h2>
          <p className="text-muted-foreground mb-4">When using BasicsTutor, you agree not to:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Break the law or use the Service to harm, harass, or deceive others.</li>
            <li>Request or generate content that is illegal, hateful, sexually explicit, or dangerous.</li>
            <li>Try to access accounts, systems, or data you aren&apos;t authorized to access, or interfere with the Service.</li>
            <li>Scrape, copy, or bulk-download content, or access the Service by automated means, without our written permission.</li>
            <li>Resell, republish, or commercially exploit the Service or its content.</li>
            <li>Circumvent usage limits or other protections.</li>
          </ul>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">7. Content and ownership</h2>
          <p className="text-muted-foreground mb-4">
            The Service, including its design, software, and lesson content, belongs to BasicsTutor and is protected by law. We give you a personal, non-transferable permission to use the Service and its content for learning and teaching. You may print or share reference sheets and certificates for personal or classroom use.
          </p>
          <p className="text-muted-foreground">
            You keep ownership of what you submit, such as topic requests, questions, and messages. You give us permission to use that material to operate, maintain, and improve the Service.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">8. Disclaimers</h2>
          <p className="text-muted-foreground">
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent allowed by law, we make no warranties of any kind, whether express or implied, including that the Service will be accurate, complete, uninterrupted, secure, or error-free, or fit for a particular purpose.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">9. Limitation of liability</h2>
          <p className="text-muted-foreground mb-4">
            To the fullest extent allowed by law, BasicsTutor will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or opportunities, arising from your use of, or inability to use, the Service or its content.
          </p>
          <p className="text-muted-foreground mb-4">
            To the fullest extent allowed by law, our total liability for any claim relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim or US $50.
          </p>
          <p className="text-muted-foreground">
            You agree to cover any claims, losses, and costs, including reasonable legal fees, that arise from your misuse of the Service or your breach of these Terms.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">10. Suspension and termination</h2>
          <p className="text-muted-foreground">
            We may suspend or end your access to the Service if you break these Terms, if your use creates risk or legal exposure for us or others, or if we discontinue the Service. You may stop using the Service at any time.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">11. Changes to these terms</h2>
          <p className="text-muted-foreground">
            We may update these Terms from time to time. When we do, we will post the new version here and update the date at the top. For significant changes, we will give additional notice, such as a notice on the site. If you keep using the Service after changes take effect, you accept the updated Terms.
          </p>
        </section>

        <Separator className="my-8" />

        <section>
          <h2 className="mb-4">12. Contact us</h2>
          <p className="text-muted-foreground mb-4">Questions about these Terms? Reach us at:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Email: support@basicstutor.com</li>
            <li>Contact form: <a href="/contact" className="text-primary hover:underline">Contact page</a></li>
          </ul>
        </section>
      </LegalLayout>
      <Footer />
    </div>
  );
}
