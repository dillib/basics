import { describe, it, expect, afterEach } from 'vitest';
import { emailFooter, marketingEmailBlocker } from '../email-footer';

/**
 * CAN-SPAM: every marketing email needs a working unsubscribe link and the
 * sender's valid physical postal address (a PO box or registered mailbox is fine).
 */
describe('marketing email footer', () => {
  const saved = process.env.MAILING_ADDRESS;
  afterEach(() => { if (saved === undefined) delete process.env.MAILING_ADDRESS; else process.env.MAILING_ADDRESS = saved; });

  it('includes the postal address and the unsubscribe link', () => {
    process.env.MAILING_ADDRESS = 'BasicsTutor, PO Box 123, Austin, TX 78701, USA';
    const html = emailFooter({ unsubscribeUrl: 'https://www.basicstutor.com/api/unsubscribe?t=abc', reason: 'learning on BasicsTutor', unsubscribeLabel: 'Unsubscribe from review reminders' });
    expect(html).toContain('PO Box 123, Austin, TX 78701, USA');
    expect(html).toContain('href="https://www.basicstutor.com/api/unsubscribe?t=abc"');
    expect(html).toContain('Unsubscribe from review reminders');
  });

  it('escapes the address so it cannot break the email', () => {
    process.env.MAILING_ADDRESS = 'A <b>& Co</b>';
    expect(emailFooter({ unsubscribeUrl: 'https://x/u', reason: 'r', unsubscribeLabel: 'u' })).toContain('A &lt;b&gt;&amp; Co&lt;/b&gt;');
  });

  it('refuses marketing email until a postal address is set', () => {
    delete process.env.MAILING_ADDRESS;
    expect(marketingEmailBlocker()).toMatch(/MAILING_ADDRESS/);
    process.env.MAILING_ADDRESS = '   ';
    expect(marketingEmailBlocker()).toMatch(/MAILING_ADDRESS/);
    process.env.MAILING_ADDRESS = 'PO Box 1, Town, ST 00000';
    expect(marketingEmailBlocker()).toBeNull();
  });

  it('review reminders use the footer and check for the address', () => {
    const src = read('server/send-review-reminders.ts');
    expect(src).toContain('emailFooter(');
    expect(src).toContain('marketingEmailBlocker()');
  });
});
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

/**
 * GDPR: loading Google Fonts from Google's servers sends every visitor's IP
 * to Google (LG München, 2022). Fonts are bundled and served from our domain.
 */
describe('fonts are self-hosted', () => {
  it('index.html never loads fonts from Google', () => {
    expect(read('client/index.html')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('the security policy no longer allows Google font hosts', () => {
    expect(read('server/security.ts')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('the app bundles the three brand fonts', () => {
    const main = read('client/src/main.tsx');
    for (const pkg of ['@fontsource-variable/fraunces', '@fontsource-variable/jost', '@fontsource-variable/jetbrains-mono']) {
      expect(main).toContain(pkg);
    }
  });
});
