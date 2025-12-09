import { Link } from "wouter";
import { Mail } from "lucide-react";
import { SiX, SiDiscord } from "react-icons/si";
import pencilLogo from "@assets/generated_images/smiling_upright_purple_pencil.png";

const footerLinks = {
  product: [
    { label: "Topics", href: "/topics" },
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  support: [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/contact" },
    { label: "Account", href: "/account" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const socialLinks = [
  { icon: SiX, href: "https://twitter.com", label: "X" },
  { icon: SiDiscord, href: "https://discord.com", label: "Discord" },
];

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-16 sm:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 rounded-lg bg-primary/10 dark:bg-primary/20 p-0.5 flex items-center justify-center">
                <img src={pencilLogo} alt="BasicsTutor" className="h-full w-full object-contain rounded-md" />
              </div>
              <span className="text-xl font-semibold" data-testid="text-footer-logo">BasicsTutor.com</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-xs leading-relaxed">
              Learn anything by understanding its fundamental truths. AI-powered education that builds knowledge from the ground up.
            </p>
            
            <div className="flex items-center gap-2 text-muted-foreground mb-6">
              <Mail className="h-4 w-4" />
              <a 
                href="mailto:support@basicstutor.com" 
                className="hover:text-foreground transition-colors"
                data-testid="link-footer-email"
              >
                support@basicstutor.com
              </a>
            </div>

            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label={social.label}
                  data-testid={`link-social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            © {new Date().getFullYear()} BasicsTutor.com. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with curiosity
          </p>
        </div>
      </div>
    </footer>
  );
}
