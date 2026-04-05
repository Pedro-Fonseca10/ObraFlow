import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FeedbackMessage } from "../components/ui/FeedbackMessage";
import { useAuth } from "../contexts/AuthContext";

interface DevCredential {
  label: string;
  email: string;
  senha: string;
  context: string;
}

// interface OperationalSignal {
//   label: string;
//   detail: string;
//   markerClassName: string;
// }

const DEV_CREDENTIALS: DevCredential[] = [
  {
    label: "Manager",
    email: "gestor@obraflow.com",
    senha: "123456",
    context: "Acesso completo ao painel operacional, cadastros e indicadores.",
  },
  {
    label: "Worker",
    email: "funcionario@obraflow.com",
    senha: "123456",
    context: "Visão da rotina individual para iniciar e concluir atividades.",
  },
];

// const OPERATIONAL_SIGNALS: OperationalSignal[] = [
//   {
//     label: "Atribuições do turno",
//     detail:
//       "Distribua equipes e acompanhe a frente ativa sem sair do mesmo fluxo.",
//     markerClassName: "bg-sky-400",
//   },
//   {
//     label: "Controle de presença",
//     detail: "Registre faltas e ajuste a cobertura operacional em tempo real.",
//     markerClassName: "bg-emerald-400",
//   },
//   {
//     label: "Rotação inicial",
//     detail:
//       "Observe entradas, saídas e pressão de retenção logo no início do dia.",
//     markerClassName: "bg-white",
//   },
// ];

function routeByRole(role: "gestor" | "funcionario"): string {
  return role === "gestor" ? "/gestor/dashboard" : "/funcionario/atividades";
}

function buildCredentialClipboardText(credential: DevCredential): string {
  return `${credential.label}\nEmail: ${credential.email}\nSenha: ${credential.senha}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, login, dataMode } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate(routeByRole(user.perfil), { replace: true });
    }
  }, [loading, user, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !senha.trim()) {
      setErrorMessage("Informe email e senha para entrar.");
      return;
    }

    setErrorMessage("");
    setSubmitting(true);

    try {
      await login({ email, senha });
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao autenticar usuário.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDevQuickLogin(credential: DevCredential) {
    setErrorMessage("");
    setSubmitting(true);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          buildCredentialClipboardText(credential),
        );
      }

      await login({ email: credential.email, senha: credential.senha });
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao autenticar com credenciais Dev.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="login-canvas absolute inset-0" />
      <div className="login-grid absolute inset-0 opacity-30" />
      <div className="animate-glow-drift absolute left-[-12%] top-[-8%] h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="animate-glow-drift absolute bottom-[-14%] right-[-10%] h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="order-2 flex flex-col justify-center px-6 py-8 sm:px-10 lg:order-1 lg:px-14 lg:py-12">
          <div className="animate-rise-in">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              ObraFlow
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
            <div className="max-w-2xl animate-rise-in-delay">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                Acesso Operacional
              </p>
              <h1 className="mt-4 font-heading text-5xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-6xl">
                Gestão de equipe, leitura do turno e resposta rápida.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Entre com o perfil da operação para acompanhar atribuições,
                faltas e ritmo diário da obra no mesmo fluxo.
              </p>
            </div>

            {/* <div className="space-y-3 animate-rise-in-delay-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Ambiente
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {dataMode === "supabase"
                    ? "Supabase ativo"
                    : "Demo local pronta"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Base preparada para leitura diária e lançamento operacional.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Fluxo
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Um acesso por perfil
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Manager acompanha a frente inteira. Worker segue a rotina
                  individual.
                </p>
              </div>
            </div> */}
          </div>

          {/* <div className="mt-10 grid max-w-5xl gap-4 rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm lg:grid-cols-[1.25fr_0.9fr]">
            <div className="animate-sweep rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Núcleo do turno
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    Leitura operacional em uma única entrada.
                  </p>
                </div>

                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                  Turno diário
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {[72, 88, 64].map((value, index) => {
                  const label =
                    index === 0
                      ? "Cobertura de equipe"
                      : index === 1
                        ? "Apontamento de faltas"
                        : "Ritmo de retenção";
                  const barClassName =
                    index === 0
                      ? "bg-sky-400"
                      : index === 1
                        ? "bg-emerald-400"
                        : "bg-white/80";

                  return (
                    <div key={label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>{label}</span>
                        <span>{value}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${barClassName}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 max-w-md text-sm leading-6 text-slate-300">
                A entrada já posiciona o gestor para revisar presença,
                distribuição e pressão operacional antes de abrir o restante do
                sistema.
              </p>
            </div>

            <div className="grid content-start gap-3 animate-rise-in-delay-3">
              {OPERATIONAL_SIGNALS.map((signal) => (
                <article
                  key={signal.label}
                  className="rounded-[26px] border border-white/10 bg-slate-950/40 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${signal.markerClassName}`}
                    />
                    <p className="text-sm font-semibold text-white">
                      {signal.label}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {signal.detail}
                  </p>
                </article>
              ))}
            </div>
          </div> */}
        </section>

        <section className="order-1 flex items-center justify-center border-b border-white/10 bg-white/94 px-6 py-10 text-slate-900 backdrop-blur-xl lg:order-2 lg:border-b-0 lg:border-l lg:border-white/10 lg:px-10">
          <div className="w-full max-w-md animate-rise-in">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Acesso seguro
            </p>
            <h2 className="mt-4 font-heading text-4xl font-black tracking-[-0.04em] text-slate-950">
              Entrar na operação
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use o perfil da equipe para abrir o painel operacional e continuar
              o fluxo do turno.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="voce@obraflow.com"
                  autoComplete="email"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Senha
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="********"
                  autoComplete="current-password"
                />
              </label>

              {errorMessage && (
                <FeedbackMessage type="error" message={errorMessage} />
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Acesso de desenvolvimento
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {dataMode === "supabase"
                      ? "Credenciais rápidas para usuários já criados no Supabase Auth."
                      : "Credenciais rápidas para validação do fluxo."}
                  </p>
                </div>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {dataMode === "supabase" ? "Supabase" : "Local Demo"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {DEV_CREDENTIALS.map((credential) => (
                  <article
                    key={credential.email}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {credential.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {credential.email}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {credential.context}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-200/80">
                        123456
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDevQuickLogin(credential)}
                      disabled={submitting}
                      className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? `Entrando como ${credential.label}...`
                        : `Copiar e entrar como ${credential.label}`}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
