import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { UserPlus, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

function PasswordRequirement({
  met,
  children,
}: {
  met: boolean;
  children: ReactNode;
}) {
  return (
    <li className={`flex items-center gap-2 text-sm ${met ? 'text-green-400' : 'text-stone-400'}`}>
      {met ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4 text-stone-500" />
      )}
      {children}
    </li>
  );
}

function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    try {
      await register({ email, password, name: name || undefined });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-stone-800/50 backdrop-blur-sm border border-stone-700/50 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
              <UserPlus className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-stone-100">
              Create an account
            </h1>
            <p className="text-stone-400 mt-2">
              Start organizing your historical knowledge
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-stone-300 mb-2"
              >
                Name{' '}
                <span className="text-stone-500 font-normal">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-600/50 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-300 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-600/50 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 bg-stone-900/50 border border-stone-600/50 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {password && (
                <ul className="mt-3 space-y-1">
                  <PasswordRequirement met={passwordValidation.minLength}>
                    At least 8 characters
                  </PasswordRequirement>
                  <PasswordRequirement met={passwordValidation.hasUppercase}>
                    One uppercase letter
                  </PasswordRequirement>
                  <PasswordRequirement met={passwordValidation.hasLowercase}>
                    One lowercase letter
                  </PasswordRequirement>
                  <PasswordRequirement met={passwordValidation.hasNumber}>
                    One number
                  </PasswordRequirement>
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-stone-900"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-stone-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { RegisterPage };
export default RegisterPage;
