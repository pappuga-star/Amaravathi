import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, Input } from '@amaravathi/shared-ui';
import { api, setToken } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/Logo';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@amaravathi.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const result = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 relative">
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md p-6">
        <Logo
          width={180}
          height={60}
          priority
          className="h-auto w-[180px]"
        />
        <p className="text-sm font-semibold text-emerald-700">
          {t('login.system')}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{t('login.title')}</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <Field label={t('login.email')}>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label={t('login.password')}>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="add" className="h-11">
            <svg
              className="h-4 w-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1"
              />
            </svg>
            <span>{t('login.signIn')}</span>
          </Button>
        </form>
      </Card>
    </main>
  );
}
