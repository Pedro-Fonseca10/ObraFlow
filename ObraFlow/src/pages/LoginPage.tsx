import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FeedbackMessage } from "../components/ui/FeedbackMessage";
import { useAuth } from "../contexts/AuthContext";

const DEV_CREDENTIALS = {
  email: "gestor@obraflow.com",
  senha: "123456",
};

function routeByRole(role: "gestor" | "funcionario"): string {
  return role === "gestor" ? "/gestor/dashboard" : "/funcionario/atividades";
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

  async function handleDevQuickLogin() {
    setErrorMessage("");
    setSubmitting(true);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          `Gestor Dev\nEmail: ${DEV_CREDENTIALS.email}\nSenha: ${DEV_CREDENTIALS.senha}`,
        );
      }

      await login(DEV_CREDENTIALS);
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_40%),radial-gradient(circle_at_bottom_left,#dcfce7,transparent_35%),#f8fafc] px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="font-heading text-4xl font-black uppercase tracking-wider text-slate-900">
            ObraFlow
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Login por perfil para gestão operacional da obra.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1 block text-sm font-semibold text-slate-700"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="voce@obraflow.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-slate-700"
              htmlFor="senha"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="********"
              autoComplete="current-password"
            />
          </div>

          {errorMessage && (
            <FeedbackMessage type="error" message={errorMessage} />
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <p className="font-semibold uppercase tracking-wide text-slate-800">
            Dev Credencial
          </p>
          <p>Gestor: gestor@obraflow.com / 123456</p>
          <p>Funcionário: funcionario@obraflow.com / 123456</p>
          <p>
            Modo de dados:{" "}
            {dataMode === "supabase" ? "Supabase" : "Local (seed)"}
          </p>
          <button
            type="button"
            onClick={() => void handleDevQuickLogin()}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Entrando com Dev..."
              : "Copiar e Entrar com Dev Credencials"}
          </button>
        </div>
      </section>
    </div>
  );
}
