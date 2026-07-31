export default function NotFound() {
  return (
    <main className="simple-status">
      <span aria-hidden="true">404</span>
      <h1>That route is not in the field.</h1>
      <p>The record may be unknown, incomplete, expired, or intentionally unavailable.</p>
      <a className="button button--gold" href="/scores">Return to scores</a>
    </main>
  );
}
