import { ArrowLeft, Eye, KeyRound, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, PrimaryButton } from "@/components/PrimaryButton";

export default function LoginPage() {
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
          <p className="mt-2 text-center text-muted">Area do Associado</p>

          <form className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-deep">Email</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4">
                <Mail size={18} className="text-muted" />
                <input
                  type="email"
                  defaultValue="fabio@nakai.com"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Email"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-deep">Senha</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4">
                <KeyRound size={18} className="text-muted" />
                <input
                  type="password"
                  defaultValue="canoa123"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Senha"
                />
                <Eye size={18} className="text-muted" />
              </span>
            </label>

            <ButtonLink href="/associado" className="w-full">
              Entrar
            </ButtonLink>
          </form>

          <div className="mt-6 border-t border-line pt-6">
            <p className="text-center text-sm text-muted">Primeiro acesso?</p>
            <PrimaryButton variant="secondary" className="mt-3 w-full" type="button">
              Ativar minha conta
            </PrimaryButton>
          </div>
        </div>
      </section>
    </main>
  );
}
