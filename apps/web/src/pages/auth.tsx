import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import { Field, FormError } from '../components/forms';

export function AuthPage({
  setup,
  onSuccess,
}: {
  setup: boolean;
  onSuccess: () => Promise<void>;
}) {
  const token = new URLSearchParams(window.location.search).get('token');
  const invitation = window.location.pathname === '/convite';
  const reset = window.location.pathname === '/redefinir-senha';
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{
    name: string;
    email: string;
    password: string;
    token: string;
  }>();
  const title = setup
    ? 'Configure seu primeiro acesso'
    : invitation
      ? 'Aceitar convite'
      : reset
        ? 'Definir nova senha'
        : forgot
          ? 'Recuperar acesso'
          : 'Bem-vindo ao Obra Estoque';
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <p className="eyebrow">OBRA ESTOQUE</p>
        <h1>Seu estoque conectado a todas as obras.</h1>
        <p>Materiais, movimentações e conferências em um único lugar.</p>
      </section>
      <section className="panel auth-panel">
        <h2>{title}</h2>
        <p className="muted">
          {setup
            ? 'Use a chave SETUP_TOKEN do arquivo .env da instalação.'
            : 'Acesso exclusivo para a equipe da construtora.'}
        </p>
        <form
          className="form-grid"
          onSubmit={handleSubmit(async (values) => {
            setError(null);
            setMessage('');
            try {
              if (setup || invitation) {
                await api(setup ? '/setup' : '/invitations/accept', {
                  method: 'POST',
                  body: { ...values, token: setup ? values.token : token },
                });
                await api('/auth/sign-in/email', {
                  method: 'POST',
                  body: { email: values.email, password: values.password },
                });
                window.history.replaceState({}, '', '/');
                await onSuccess();
              } else if (reset) {
                await api('/auth/reset-password', {
                  method: 'POST',
                  body: { token, newPassword: values.password },
                });
                setMessage('Senha alterada. Você já pode entrar.');
              } else if (forgot) {
                await api('/auth/request-password-reset', {
                  method: 'POST',
                  body: {
                    email: values.email,
                    redirectTo: `${window.location.origin}/redefinir-senha`,
                  },
                });
                setMessage(
                  'Se o e-mail estiver cadastrado, você receberá as instruções.',
                );
              } else {
                await api('/auth/sign-in/email', {
                  method: 'POST',
                  body: { email: values.email, password: values.password },
                });
                await onSuccess();
              }
            } catch (cause) {
              setError(
                cause instanceof Error ? cause : new Error('Falha ao entrar.'),
              );
            }
          })}
        >
          {(setup || invitation) && (
            <Field label="Nome completo">
              <input required autoComplete="name" {...register('name')} />
            </Field>
          )}
          {!reset && (
            <Field label="E-mail">
              <input
                required
                type="email"
                autoComplete="username"
                {...register('email')}
              />
            </Field>
          )}
          {!forgot && (
            <Field label="Senha">
              <input
                required
                type="password"
                minLength={setup || invitation || reset ? 12 : 1}
                autoComplete={
                  setup || invitation || reset
                    ? 'new-password'
                    : 'current-password'
                }
                {...register('password')}
              />
            </Field>
          )}
          {setup && (
            <Field label="Chave de instalação">
              <input
                required
                type="password"
                autoComplete="off"
                {...register('token')}
              />
            </Field>
          )}
          <FormError error={error} />
          {message && <p role="status">{message}</p>}
          <button className="button" disabled={isSubmitting}>
            {isSubmitting
              ? 'Aguarde…'
              : setup
                ? 'Criar administrador'
                : invitation
                  ? 'Ativar meu acesso'
                  : reset
                    ? 'Salvar senha'
                    : forgot
                      ? 'Enviar instruções'
                      : 'Entrar'}
          </button>
        </form>
        {!setup && !invitation && !reset && (
          <button
            className="text-link"
            onClick={() => {
              setForgot(!forgot);
              setMessage('');
            }}
          >
            {forgot ? 'Voltar ao login' : 'Esqueci minha senha'}
          </button>
        )}
        {reset && (
          <a className="text-link" href="/">
            Voltar ao login
          </a>
        )}
      </section>
    </div>
  );
}
