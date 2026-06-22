export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form action="/api/unlock" method="post" className="card w-full max-w-sm p-7">
        <h1 className="text-3xl font-medium tracking-tight">
          Recetas<span className="text-accent">.</span>
        </h1>
        <p className="mt-1 mb-5 text-sm text-muted">Nuestro recetario. Ingresa la contraseña.</p>
        <input name="passphrase" type="password" autoFocus placeholder="Contraseña" className="input" />
        {error ? <p className="mt-2 text-sm text-accent-strong">Contraseña incorrecta.</p> : null}
        <button type="submit" className="btn btn-primary mt-4 w-full">Entrar</button>
      </form>
    </main>
  );
}
