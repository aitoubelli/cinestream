export function Footer() {
  return (
    <footer className="relative mt-20 px-4 md:px-8 py-8 border-t border-cyan-500/20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-cyan-100/50 text-sm">
          © 2025 Cinestream.
        </p>
        <div className="flex items-center gap-2 text-sm text-cyan-100/50">
          <span>Powered by</span>
          <span className="px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            TMDB
          </span>
        </div>
      </div>
    </footer>
  );
}
