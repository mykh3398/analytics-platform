import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string | null>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Недійсне посилання для підтвердження (відсутній токен).');
            return;
        }

        // Захист від подвійного рендеру в React Strict Mode
        if (hasFetched.current) return;
        hasFetched.current = true;

        authApi.verifyEmail(token)
            .then((res) => {
                setStatus('success');
                setMessage(res.message);
            })
            .catch((err: any) => {
                setStatus('error');
                setMessage(err.response?.data?.error || err.response?.data?.message || 'Помилка підтвердження. Можливо, посилання застаріло.');
            });
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full bg-card border border-border p-8 rounded-xl shadow-sm text-center">
                
                {status === 'loading' && (
                    <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <h2 className="text-xl font-bold text-foreground">Підтвердження...</h2>
                        <p className="text-muted-foreground text-sm">Будь ласка, зачекайте, перевіряємо ваші дані.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center space-y-4">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <h2 className="text-xl font-bold text-foreground">Успіх!</h2>
                        <p className="text-muted-foreground text-sm">{message}</p>
                        <Link 
                            to="/login" 
                            className="mt-4 inline-flex items-center justify-center h-10 px-6 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 transition-opacity"
                        >
                            Увійти в систему
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center space-y-4">
                        <XCircle className="w-16 h-16 text-destructive" />
                        <h2 className="text-xl font-bold text-foreground">Помилка</h2>
                        <p className="text-muted-foreground text-sm">{message}</p>
                        <Link 
                            to="/register" 
                            className="mt-4 inline-flex items-center justify-center h-10 px-6 border border-input bg-transparent text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors"
                        >
                            Спробувати знову
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}