import Image from 'next/image';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-block mb-8">
          <Image src="/logo.svg" alt="Valor" width={80} height={20} className="h-5 w-auto" priority />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-8 mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 7, 2026</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. What We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">
          Valor collects only the minimum data needed to operate:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Telegram user ID and username</strong> — to associate wallets and tips with a Telegram identity.</li>
          <li><strong className="text-foreground">Telegram message text</strong> — sent to Gemini AI for quality evaluation. Messages are not stored beyond the evaluation result (score, reason).</li>
          <li><strong className="text-foreground">Email address</strong> — if you sign up via email magic link, we store your email for authentication.</li>
          <li><strong className="text-foreground">Wallet addresses</strong> — USDC wallet addresses created by or provided to Valor for tipping and withdrawals.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. What We Do NOT Collect</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Private keys, seed phrases, or any cryptographic secrets</li>
          <li>Personal identifying information beyond Telegram identity and email</li>
          <li>Browsing history, cookies for tracking, or analytics data</li>
          <li>Messages from Telegram groups where Valor is not installed</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. How We Use Your Data</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Telegram ID and message text: to evaluate message quality and send tips.</li>
          <li>Email: to send magic link login emails and critical service notifications.</li>
          <li>Wallet addresses: to execute USDC transfers on the Base blockchain.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. AI Evaluation</h2>
        <p className="text-muted-foreground leading-relaxed">
          Message text is sent to Google Gemini 2.5 Flash for quality scoring.
          Gemini processes the text temporarily and returns a score, reason, and tip decision.
          The raw message text is not stored by Valor after evaluation — only the score and reason are saved.
          Google&apos;s <a href="https://cloud.google.com/terms" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">privacy policy</a> governs how Gemini handles data.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. Data Storage</h2>
        <p className="text-muted-foreground leading-relaxed">
          Data is stored in Supabase (PostgreSQL), hosted on Google Cloud Platform (us-east-1).
          We retain evaluation scores, tip records, and wallet addresses for the lifetime of your account.
          You can request data deletion by contacting us.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. Third-Party Services</h2>
        <p className="text-muted-foreground leading-relaxed">
          Valor uses the following third-party services. Each has its own privacy policy:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Supabase</strong> — database and authentication</li>
          <li><strong className="text-foreground">Google Gemini</strong> — AI message evaluation</li>
          <li><strong className="text-foreground">Coinbase CDP</strong> — wallet creation and USDC transfers</li>
          <li><strong className="text-foreground">Upstash QStash</strong> — message queue for async processing</li>
          <li><strong className="text-foreground">Paddle</strong> — payment processing and subscription management</li>
          <li><strong className="text-foreground">Vercel</strong> — hosting and serverless functions</li>
          <li><strong className="text-foreground">Telegram</strong> — messaging platform (your data is subject to Telegram&apos;s privacy policy)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. Your Rights</h2>
        <p className="text-muted-foreground leading-relaxed">
          You have the right to access, correct, or delete your personal data.
          To exercise these rights, contact us at the email below.
          We will respond within 30 days.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          For privacy inquiries: <a href="mailto:hello@valorapp.com" className="text-primary underline-offset-2 hover:underline">hello@valorapp.com</a>
        </p>
      </div>
    </div>
  );
}
