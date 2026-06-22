export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action="/api/unlock"
        method="post"
        className="w-full max-w-sm rounded-xl border border-neutral-200 p-6"
      >
        <h1 className="text-xl font-medium">Recetas</h1>
        <p className="mt-1 mb-4 text-sm text-neutral-500">
          Ingresa la contraseña para entrar.
        </p>
        <input
          name="passphrase"
          type="password"
          autoFocus
          placeholder="Contraseña"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        />
        {error ? (
          <p className="mt-2 text-sm text-red-600">Contraseña incorrecta.</p>
        ) : null}
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-neutral-900 px-3 py-2 text-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
