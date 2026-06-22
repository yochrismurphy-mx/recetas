export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-card shadow-[0_24px_60px_-24px_rgba(33,28,22,0.4)]">
        <div className="relative h-48">
          <img
            src="/img/home-hero.jpg"
            alt="Cocinando en casa"
            className="absolute inset-0 h-full w-full object-cover object-[center_26%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/5" />
          <h1 className="absolute inset-x-0 bottom-0 p-5 font-display text-2xl font-medium leading-tight tracking-tight text-paper">
            La cocina de Norma y Chris<span className="text-accent">.</span>
          </h1>
        </div>
        <form action="/api/unlock" method="post" className="p-6">
          <p className="mb-4 text-sm text-muted">Ingresa la contraseña.</p>
          <input name="passphrase" type="password" autoFocus placeholder="Contraseña" className="input" />
          {error ? <p className="mt-2 text-sm text-accent-strong">Contraseña incorrecta.</p> : null}
          <button type="submit" className="btn btn-primary mt-4 w-full">Entrar</button>
        </form>
      </div>
    </main>
  );
}
