import type { Provenance } from "@/lib/types";

export function SourceMeta({
  provenance,
  compact = false,
}: {
  provenance: Provenance;
  compact?: boolean;
}) {
  return (
    <details className="source-details">
      <summary>
        <span className="data-dot" aria-hidden="true" />
        {compact ? "Source" : "Source & freshness"}
      </summary>
      <div className="source-details__body">
        <div>
          <span>Provider</span>
          <strong>{provenance.provider}</strong>
        </div>
        <div>
          <span>As of</span>
          <strong>{new Date(provenance.sourceAsOf).toLocaleString("en-US", { timeZone: "UTC" })} UTC</strong>
        </div>
        <div>
          <span>Verification</span>
          <strong>{provenance.verificationStatus.replaceAll("_", " ")}</strong>
        </div>
        <div>
          <span>Rights</span>
          <strong>{provenance.licenseClass}</strong>
        </div>
        {provenance.modelVersion ? (
          <div>
            <span>Model</span>
            <strong>{provenance.modelVersion}</strong>
          </div>
        ) : null}
        <p>
          Demonstration records are deterministic, fictional, and isolated from any production
          provider.
        </p>
      </div>
    </details>
  );
}
