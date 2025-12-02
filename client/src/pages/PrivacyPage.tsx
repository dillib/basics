import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  const lastUpdated = "December 1, 2024";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-privacy-title">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>

          <Card className="border-card-border">
            <CardContent className="p-8 prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-muted-foreground mb-4">
                  Welcome to BasicsTutor. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
                </p>
                <p className="text-muted-foreground">
                  By using BasicsTutor, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
                
                <h3 className="text-lg font-medium mb-3">2.1 Personal Information</h3>
                <p className="text-muted-foreground mb-4">
                  When you create an account, we collect:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Name (from your authentication provider)</li>
                  <li>Email address</li>
                  <li>Profile picture (if provided by authentication provider)</li>
                  <li>Account preferences and settings</li>
                </ul>

                <h3 className="text-lg font-medium mb-3">2.2 Usage Information</h3>
                <p className="text-muted-foreground mb-4">
                  We automatically collect:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Topics you view and generate</li>
                  <li>Learning progress and completion data</li>
                  <li>Quiz scores and performance</li>
                  <li>Device and browser information</li>
                  <li>IP address and general location data</li>
                </ul>

                <h3 className="text-lg font-medium mb-3">2.3 Payment Information</h3>
                <p className="text-muted-foreground">
                  Payment processing is handled by Stripe. We do not store your credit card details. We only receive confirmation of payment status and transaction IDs.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use your information to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide and maintain the Service</li>
                  <li>Process your transactions and manage your subscription</li>
                  <li>Track your learning progress across sessions and devices</li>
                  <li>Personalize your learning experience</li>
                  <li>Send you important service updates and notifications</li>
                  <li>Respond to your support requests</li>
                  <li>Analyze usage patterns to improve the Service</li>
                  <li>Prevent fraud and abuse</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal information. We may share your data with:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Service Providers:</strong> Third parties that help us operate the Service (e.g., Stripe for payments, hosting providers)</li>
                  <li><strong>AI Providers:</strong> We send topic queries to Google's Gemini AI to generate content. These queries do not include personally identifiable information</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Encrypted data transmission (HTTPS/TLS)</li>
                  <li>Secure authentication through OAuth/OpenID Connect</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls limiting who can access your data</li>
                  <li>Secure database storage with encryption at rest</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
                <p className="text-muted-foreground mb-4">
                  We retain your data for as long as your account is active or as needed to provide you services:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Account data:</strong> Until you request deletion</li>
                  <li><strong>Learning progress:</strong> Until you request deletion</li>
                  <li><strong>Payment records:</strong> As required by law (typically 7 years)</li>
                  <li><strong>Usage logs:</strong> 90 days for security and debugging purposes</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                  <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                  <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise these rights, contact us at support@basicstutor.com.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">8. Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar technologies for:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Essential cookies:</strong> Required for authentication and basic functionality</li>
                  <li><strong>Preference cookies:</strong> Remember your settings (e.g., theme preference)</li>
                  <li><strong>Analytics cookies:</strong> Help us understand how you use the Service</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You can control cookies through your browser settings. Disabling essential cookies may affect your ability to use the Service.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">9. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  BasicsTutor is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">10. International Data Transfers</h2>
                <p className="text-muted-foreground">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable law.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <Separator className="my-8" />

              <section>
                <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions about this Privacy Policy or our data practices, contact us:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Email: support@basicstutor.com</li>
                  <li>Contact form: <a href="/contact" className="text-primary hover:underline">Contact Page</a></li>
                </ul>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
