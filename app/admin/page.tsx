import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { providerHealth } from "@/lib/fixtures";
import { getProductionGates } from "@/lib/release-readiness";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getChatGPTUser();
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const authorized = Boolean(user && allowlist.includes(user.email.toLowerCase()));
  const productionGates = getProductionGates(process.env);

  if (!authorized) {
    return (
      <main className="simple-status">
        <span aria-hidden="true">⌁</span>
        <h1>Operations console protected.</h1>
        <p>
          {user
            ? "Your authenticated identity is not on the server-side admin allowlist."
            : "Sign in with ChatGPT, then pass the server-side admin allowlist."}
        </p>
        {!user ? (
          <a className="button button--gold" href={chatGPTSignInPath("/admin")}>
            Sign in to continue
          </a>
        ) : null}
        <a className="button button--ghost" href="/data-sources">
          View public provider status
        </a>
      </main>
    );
  }

  return (
    <main className="content-section">
      <header className="page-heading">
        <div>
          <span className="eyebrow">PROTECTED OPERATIONS</span>
          <h1>Provider and release health</h1>
          <p>Authenticated as {user?.displayName}. This surface exposes no secret values.</p>
        </div>
      </header>
      <section className="provider-table content-section">
        {providerHealth.map((provider) => (
          <article key={provider.id}>
            <span className={`provider-state provider-state--${provider.status === "operational" ? "on" : "off"}`}>
              {provider.status.replaceAll("_", " ")}
            </span>
            <div><h2>{provider.label}</h2><p>{provider.note}</p></div>
            <div><span>Mode</span><strong>{provider.mode}</strong></div>
            <div><span>Cadence</span><strong>{provider.cadence}</strong></div>
          </article>
        ))}
      </section>
      <header className="page-heading content-section">
        <div>
          <span className="eyebrow">PUBLIC LIVE LAUNCH</span>
          <h2>Deny-by-default release gates</h2>
          <p>Environment flags record approvals; they do not replace contracts, test evidence, or human review.</p>
        </div>
      </header>
      <section className="provider-table content-section">
        {productionGates.map((gate) => (
          <article key={gate.id}>
            <span className={`provider-state provider-state--${gate.status === "ready" ? "on" : "off"}`}>
              {gate.status}
            </span>
            <div><h2>{gate.label}</h2><p>{gate.status === "blocked" ? gate.blockedReason : "Approval recorded."}</p></div>
            <div><span>Gate</span><strong>{gate.id}</strong></div>
          </article>
        ))}
      </section>
    </main>
  );
}
