import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";

export default function TermsPage() {
  const lastUpdated = "December 1, 2024";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-terms-title">
              Terms of Service
            </h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>

          <Card className="border-card-border">
            <CardContent className="p-8 prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing and using BasicsTutor ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
                </p>
                <p className="text-muted-foreground">
                  BasicsTutor reserves the right to update these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
                <p className="text-muted-foreground mb-4">
                  BasicsTutor is an AI-powered educational platform that provides:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>AI-generated learning content based on first principles methodology</li>
                  <li>Interactive quizzes to test understanding</li>
                  <li>Progress tracking and learning analytics</li>
                  <li>Personalized learning paths</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
                <p className="text-muted-foreground mb-4">
                  To access certain features of the Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide accurate and complete information when creating your account</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">4. Subscription and Payments</h2>
                <p className="text-muted-foreground mb-4">
                  BasicsTutor offers the following payment options:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Free Plan:</strong> Access to one complete topic at no cost</li>
                  <li><strong>Pay-per-topic:</strong> One-time payment of $1.99 per topic with lifetime access</li>
                  <li><strong>Pro Subscription:</strong> Monthly subscription at $9.99/month for unlimited access</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  For subscriptions, billing occurs on a monthly basis. You may cancel your subscription at any time, and you will continue to have access until the end of your current billing period.
                </p>
                <p className="text-muted-foreground">
                  All payments are processed securely through Stripe. We do not store your payment card details on our servers.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">5. Refund Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We want you to be satisfied with your purchase:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Individual topic purchases may be refunded within 24 hours if you have not started learning the topic</li>
                  <li>Pro subscriptions may be refunded within 7 days of your first charge</li>
                  <li>To request a refund, contact us at support@basicstutor.com</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>
                <p className="text-muted-foreground mb-4">
                  The Service and its original content (excluding user-generated content), features, and functionality are owned by BasicsTutor and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p className="text-muted-foreground">
                  AI-generated content on the platform is provided for educational purposes. You may use this content for personal learning but may not redistribute, sell, or commercially exploit it without our written permission.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">7. Acceptable Use</h2>
                <p className="text-muted-foreground mb-4">
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Generate content that is illegal, harmful, or offensive</li>
                  <li>Attempt to gain unauthorized access to the Service or its systems</li>
                  <li>Use automated means to access the Service without our permission</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground mb-4">
                  The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>The Service will be uninterrupted or error-free</li>
                  <li>AI-generated content will be completely accurate or comprehensive</li>
                  <li>The Service will meet your specific learning requirements</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  BasicsTutor is an educational tool and should not be considered a substitute for professional advice, education, or training in any field.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, BasicsTutor shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
                <p className="text-muted-foreground">
                  We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
                </p>
              </section>

              <Separator className="my-8" />

              <section>
                <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms, please contact us:
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
