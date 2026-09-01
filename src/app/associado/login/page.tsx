"use client";

import { ArrowLeft, Eye, KeyRound, Loader2, Mail } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");

  if (!next?.startsWith("/") || next.startsWith("//")) {
    return "/associado";
  }

  return next;
}

export default function LoginPage() {
  const [email, setEmail] = useState("admin@ilheus.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (response?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    const session = await getSession();
    window.location.href = session?.user.role === "admin" ? "/admin" : getSafeNextPath();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <section className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ocean">
          <ArrowLeft size={18} />
          Voltar ao site
        </Link>

        <div className="rounded-[28px] border border-line bg-white p-6 deep-shadow">
          <Image
            src="/brand/ilheus-canoe-vaa-logo.png"
            alt="Logo ILHÉUS CANOE VA'A"
            width={88}
            height={88}
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
          <h1 className="mt-5 text-center font-display text-3xl font-bold text-deep">ILHÉUS CANOE VA&apos;A</h1>
          <p className="mt-2 text-center text-muted">Acesso administrativo e associado</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-bold text-deep">E-mail</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4">
                <Mail size={18} className="text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="E-mail"
                  autoComplete="email"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-deep">Senha</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4">
                <KeyRound size={18} className="text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Senha"
                  autoComplete="current-password"
                />
                <Eye size={18} className="text-muted" />
              </span>
            </label>

            {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

            <PrimaryButton type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Entrar
            </PrimaryButton>
          </form>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            Admin de desenvolvimento: <strong className="text-deep">admin@ilheus.local</strong> /{" "}
            <strong className="text-deep">admin123</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
