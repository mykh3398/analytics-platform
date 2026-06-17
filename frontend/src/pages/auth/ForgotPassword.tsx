import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/auth'; 

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    // Явно вказуємо TypeScript, що тут може бути рядок АБО null
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Типізуємо подію форми
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        setIsLoading(true);

        try {
            // Звертаємося через об'єкт authApi
            const res = await authApi.requestPasswordReset(email);
            setMessage(res.message || "Посилання для відновлення відправлено на вашу пошту.");
            setEmail('');
        } catch (e) {
            // Приводимо до типу any, щоб TypeScript не сварився на .response
            const err = e as any;
            setError(err.response?.data?.error || "Сталася помилка. Спробуйте ще раз.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Відновлення пароля
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Введіть ваш email, і ми надішлемо вам посилання для скидання пароля.
                    </p>
                </div>
                
                {message && (
                    <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                        {message}
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email-address" className="sr-only">Email адреса</label>
                        <input
                            id="email-address"
                            name="email"
                            type="email"
                            required
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Email адреса"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                        >
                            {isLoading ? 'Відправка...' : 'Надіслати посилання'}
                        </button>
                    </div>
                </form>

                <div className="text-center mt-4">
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 text-sm">
                        Повернутися до входу
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;