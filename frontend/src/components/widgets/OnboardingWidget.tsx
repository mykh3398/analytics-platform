import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
    CheckCircle2, Circle, MessageSquare, Tags,
    MousePointerClick, BrainCircuit, ArrowRight, Trophy
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { categoriesApi } from '@/api/categories'
import { analyticsApi } from '@/api/analytics'
import { workspaceApi } from '@/api/workspace'

import api from '@/lib/axios'

export function OnboardingWidget() {
    const wsId = useAuthStore((s) => s.currentWorkspaceId)
    const navigate = useNavigate()

    // 1. Джерела
    // 🚀 ВИПРАВЛЕНО: Огорнуто в стрілочну функцію
    const { data: sources = [] } = useQuery({
        queryKey: ['source-distribution', wsId],
        queryFn: () => analyticsApi.sourceDistribution(), 
        enabled: !!wsId
    })

    // 2. Категорії
    const { data: categories = [] } = useQuery({
        queryKey: ['categories', wsId],
        queryFn: () => categoriesApi.getAll(), 
        enabled: !!wsId
    })

    // 3. Статус простору
    const { data: settings } = useQuery<any>({
        queryKey: ['workspace-settings', wsId],
        queryFn: () => workspaceApi.getSettings(),
        enabled: !!wsId
    })

    // 4. Живий статус моделі
    const { data: modelStatus } = useQuery<any>({
        queryKey: ['model-status', wsId],
        queryFn: async () => {
            const response = await api.get('/training/history');
            return response.data;
        },
        enabled: !!wsId
    })

    const hasSource = sources.length > 0;
    const hasCategories = categories.length >= 2;

    const examplesCount =
        modelStatus?.totalElements ??
        (Array.isArray(modelStatus?.content) ? modelStatus.content.length : 0) ??
        (Array.isArray(modelStatus) ? modelStatus.length : 0) ?? 0;

    const hasEnoughData = examplesCount >= 10;

    const isTrained = (settings?.lastAccuracy != null) || (settings?.last_accuracy != null) || hasEnoughData;

    const isDoneStep3 = hasEnoughData;
    const isDoneStep4 = isTrained;

    // 3. Тепер, коли все розраховано, створюємо масив кроків
    const steps = [
        {
            id: 1,
            title: 'Підключити джерело',
            description: 'Додайте Telegram, Viber або Meta',
            isDone: hasSource,
            icon: MessageSquare,
            link: '/sources'
        },
        {
            id: 2,
            title: 'Створити категорії',
            description: 'Мінімум 2 (напр. Лід, Спам)',
            isDone: hasCategories,
            icon: Tags,
            link: '/categories'
        },
        {
            id: 3,
            title: 'Розмітити дані',
            description: 'Анотуйте мінімум 10 повідомлень',
            isDone: isDoneStep3,
            icon: MousePointerClick,
            link: '/training'
        },
        {
            id: 4,
            title: 'Перенавчити модель',
            description: 'Запустіть процес машинного навчання',
            isDone: isDoneStep4,
            icon: BrainCircuit,
            link: '/training'
        }
    ]

    const completedSteps = steps.filter(s => s.isDone).length
    const progressPct = (completedSteps / steps.length) * 100
    const isFullyCompleted = completedSteps === steps.length

    if (isFullyCompleted) {
        return (
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-5 text-center animate-in fade-in zoom-in-95">
                <Trophy className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Система готова!</h3>
                <p className="text-xs text-green-600/80 dark:text-green-500/80 mt-1">
                    NLP-модель налаштована та успішно обробляє ваші повідомлення.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold">Швидкий старт</h2>
                    <span className="text-xs font-mono font-medium text-primary">
                        {completedSteps} / {steps.length}
                    </span>
                </div>

                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-700 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
                <div className="space-y-1">
                    {steps.map((step, index) => {
                        const isCurrent = !step.isDone && (index === 0 || steps[index - 1].isDone)
                        const Icon = step.icon

                        return (
                            <button
                                key={step.id}
                                onClick={() => navigate(step.link)}
                                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-all border ${step.isDone
                                    ? 'border-transparent opacity-60 hover:opacity-100 hover:bg-secondary/40'
                                    : isCurrent
                                        ? 'border-border bg-background shadow-sm hover:border-primary/40 cursor-pointer'
                                        : 'border-transparent opacity-40 pointer-events-none'
                                    }`}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {step.isDone ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : isCurrent ? (
                                        <Circle className="w-4 h-4 text-primary fill-primary/10 animate-pulse" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className={`flex items-center gap-1.5 text-sm font-medium ${step.isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        <Icon className="w-3.5 h-3.5 opacity-70" />
                                        {step.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>

                                {isCurrent && (
                                    <ArrowRight className="w-4 h-4 text-primary shrink-0 self-center opacity-50" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}