export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="text-sm font-semibold">Catalift</span>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
