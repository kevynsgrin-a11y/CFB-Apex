import type { CurrentMetrics } from "@/lib/cfb-dataset";

export function CurrentMetricsLane({
  metrics,
  finalsSince = 0,
}: {
  metrics: CurrentMetrics;
  /** Finals on the board played after the stats cutoff (not in these totals). */
  finalsSince?: number;
}) {
  return (
    <section className="apex-lane" aria-labelledby="season-leaders-title">
      <h2 id="season-leaders-title" className="font-display">
        Season leaders
      </h2>
      <p className="apex-data-note">
        NCAA FBS season totals through games of {metrics.through_games}.
        {finalsSince > 0
          ? ` ${finalsSince} game${finalsSince === 1 ? "" : "s"} played since then ${finalsSince === 1 ? "is" : "are"} not yet included; leaders refresh when NCAA publishes newer totals.`
          : " Leaders refresh when NCAA publishes newer totals."}
      </p>
      <div className="apex-intelligence-grid">
        {metrics.categories.map((category) => (
          <table className="w-full text-left text-sm" key={category.name}>
            <caption className="py-3 text-left font-bold">
              {category.name}
            </caption>
            <thead>
              <tr>
                <th scope="col">Leader</th>
                <th scope="col">{category.unit}</th>
              </tr>
            </thead>
            <tbody>
              {category.rows.map((row) => (
                <tr key={`${row.name}-${row.team}`}>
                  <th scope="row" className="py-2 font-normal">
                    {row.name}
                    {row.name !== row.team ? ` · ${row.team}` : ""}
                  </th>
                  <td>
                    {row.value.toLocaleString("en-US", {
                      minimumFractionDigits:
                        category.name === "Scoring defense"
                          ? 2
                          : category.name === "Scoring offense"
                            ? 1
                            : 0,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <p className="apex-data-note">
        <a className="underline underline-offset-4" href={metrics.source_url}>
          NCAA source and full leaders
        </a>
      </p>
    </section>
  );
}
