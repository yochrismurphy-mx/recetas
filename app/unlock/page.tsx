export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="relative min-h-screen overflow-hidden">
      <img
        src="/img/home-hero.jpg"
        alt="Cocinando en casa"
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/65 via-ink/30 to-ink/65" />
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-7 px-6 py-12">
        <h1 className="text-center font-display text-4xl font-medium leading-tight tracking-tight text-paper drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-6xl">
          La cocina de<br className="sm:hidden" /> Norma y Chris<span className="text-accent">.</span>
        </h1>
        <form
          action="/api/unlock"
          method="post"
          className="w-full max-w-sm rounded-2xl border border-white/15 bg-card/95 p-6 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)] backdrop-blur"
        >
          <p className="mb-3 text-sm text-muted">Ingresa la contraseña.</p>
          <input name="passphrase" type="password" autoFocus placeholder="Contraseña" className="input" />
          {error ? <p className="mt-2 text-sm text-accent-strong">Contraseña incorrecta.</p> : null}
          <button type="submit" className="btn btn-primary mt-4 w-full">Entrar</button>
        </form>
      </div>
    </main>
  );
}
