export default function Footer() {
  return (
    <footer className="bg-mapsa-panel border-t border-mapsa-border px-6 py-4 text-center font-garamond text-xs text-mapsa-muted italic">
      MAPSA does not present automated decipherments. All interpretations
      are attributed, versioned, and subject to revision.
      <br />
      <span className="text-[0.625rem] tracking-wider not-italic">
        © {new Date().getFullYear()} Monte Albán Heritage Center · MAPSA
      </span>
    </footer>
  );
}
