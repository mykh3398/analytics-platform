import { useState, useEffect, Component } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Save, Brain, Building2,
  CheckCircle2, AlertCircle, RefreshCw, Trash2,
  Info, ExternalLink, Cpu, Globe
} from 'lucide-react'
import { workspaceApi } from '@/api/workspace'
import { workspacesApi } from '@/api/workspaces'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/lib/permissions'
import type { WorkspaceSettings } from '@/types'
import { cn } from '@/lib/utils'
import { ApiKeysSettings } from '@/pages/settings/ApiKeysSettings' 
import { OnboardingWidget } from '@/components/widgets/OnboardingWidget'

// ── Model Format Info Widget ──────────────────────────────────────────
function ModelFormatInfo() {
  return (
    <div className="mt-4 overflow-hidden bg-secondary/30 border border-border rounded-lg animate-in fade-in slide-in-from-top-1">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-secondary/50 border-b border-border">
        <Info className="w-4 h-4 text-blue-500" />
        <h4 className="text-sm font-medium">Які моделі підтримуються?</h4>
      </div>

      <div className="p-4 space-y-4">
        {/* Recommended Models Section */}
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Рекомендовані (Багатомовні)
          </h5>
          <ul className="space-y-2">
            <li className="text-sm">
              <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground">joeddav/xlm-roberta-large-xnli</code>
              <p className="text-xs text-muted-foreground mt-0.5">Класичний вибір. Розуміє понад 100 мов, висока точність. Великий розмір — перевіряйте доступну пам'ять.</p>
            </li>
            <li className="text-sm">
              <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground">MoritzLaurer/mDeBERTa-v3-base-mnli-xnli</code>
              <p className="text-xs text-muted-foreground mt-0.5">Оптимізована та легша модель. Часто перевершує RoBERTa; хороший баланс точності та ресурсів.</p>
            </li>
            <li className="text-sm">
              <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground">symanto/xlm-roberta-base-snli-mnli-anli-xnli</code>
              <p className="text-xs text-muted-foreground mt-0.5">Базова версія, донавчена на кількох NLI датасетах. Швидка, економна — ідеальний баланс між швидкістю та ресурсоємністю.</p>
            </li>
            <li className="text-sm">
              <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground">roberta-large-mnli</code>
              <p className="text-xs text-muted-foreground mt-0.5">Висока точність для англомовних задач. Якщо ваш простір орієнтований лише на англійську — це сильний вибір; проте модель велика, не підходить для багатомовних сценаріїв без додаткового донавчання.</p>
            </li>
          </ul>
        </div>

        <div className="w-full h-px bg-border/50" />

        {/* Technical Requirements Section */}
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> Вимоги до кастомних моделей
          </h5>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 marker:text-muted-foreground/50">
            <li>
              <strong>Завдання:</strong> Модель має бути донавчена на задачах логічного виведення (<span className="text-foreground">NLI, MNLI, XNLI</span>).
            </li>
            <li>
              <strong>Архітектура:</strong> Підтримуються лише моделі типу <span className="text-foreground">Encoder-only</span> (BERT, RoBERTa, DeBERTa). Генератори (GPT, LLaMA) не працюватимуть.
            </li>
            <li>
              <strong>Розмір:</strong> Уникайте моделей більших за <span className="text-foreground">1.5 - 2 ГБ</span>, щоб запобігти помилці переповнення пам'яті (OOM).
            </li>
          </ul>
        </div>

        {/* External Link */}
        <div className="pt-1">
          <a
            href="https://huggingface.co/models?pipeline_tag=zero-shot-classification&language=uk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
          >
            Знайти сумісні моделі на Hugging Face <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Radio option ──────────────────────────────────────────────────────
function ModelOption({ value, current, label, description, onChange, disabled }: {
  value: WorkspaceSettings['modelType']
  current: WorkspaceSettings['modelType']
  label: string
  description: string
  onChange: (v: WorkspaceSettings['modelType']) => void
  disabled?: boolean
}) {
  const isSelected = value === current
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(value)}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 rounded-lg border text-left transition-all',
        isSelected ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
        isSelected ? 'border-foreground' : 'border-muted-foreground'
      )}>
        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-foreground" />}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{description}</p>
      </div>
    </button>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

// ── Error boundary ────────────────────────────────────────────────────
class SectionErrorBoundary extends Component<
  { children: React.ReactNode; title: string },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode; title: string }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Секція «{this.props.title}» недоступна
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {this.state.message}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2"
              >
                <RefreshCw className="w-3 h-3" /> Спробувати знову
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Workspace settings section ────────────────────────────────────────
function WorkspaceSection() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { currentWorkspaceId, switchWorkspace } = useAuthStore()
  
  // Отримуємо права доступу для поточного користувача
  const { canManageWorkspace, canManageModel, canManageApiKeys, isOwner } = usePermissions()

  const [form, setForm] = useState<WorkspaceSettings>({
    workspaceName: '',
    modelType: 'DEFAULT',
    customModelId: '',
  })
  const [saved, setSaved] = useState(false)

  // Стани для модалок
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [isModelChangeModalOpen, setIsModelChangeModalOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: workspaceApi.getSettings,
    retry: 1,
    retryDelay: 2000,
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const { mutate, isPending, isError: isSaveError, error: saveError } = useMutation({
    mutationFn: workspaceApi.updateSettings,
    onSuccess: (updated) => {
      qc.setQueryData(['workspace-settings'], updated)
      qc.invalidateQueries({ queryKey: ['model-status'] })
      qc.invalidateQueries({ queryKey: ['workspaces'] }) // Оновлення сайдбару
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const getErrorMessage = () => {
    if (!saveError) return '';
    const err = saveError as any;
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    return 'Невідома помилка збереження.';
  };

  const handleSaveClick = () => {
    const isModelChanged =
      form.modelType !== data?.modelType ||
      (form.modelType === 'CUSTOM' && form.customModelId !== data?.customModelId);

    if (isModelChanged) {
      setIsModelChangeModalOpen(true);
    } else {
      mutate(form);
    }
  };

  // Мутація видалення простору
  const { mutate: deleteWorkspaceMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => workspacesApi.delete(id),
    onSuccess: () => {
      qc.clear()
      switchWorkspace('')
      setIsDeleteModalOpen(false)
      navigate('/dashboard')
    },
  })

  if (isLoading) {
    return (
      <>
        <Section title="Простір" icon={Building2}>
          <div className="h-10 bg-secondary animate-pulse rounded-md" />
        </Section>
        <Section title="Модель класифікації" icon={Brain}>
          <div className="h-24 bg-secondary animate-pulse rounded-md" />
        </Section>
      </>
    )
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const isMissing = status === 404 || status === 500
    return (
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              {isMissing ? 'Налаштування workspace ще не доступні' : 'Не вдалося завантажити налаштування'}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {isMissing
                ? 'Бекенд-ендпоінт /api/workspace/settings ще не реалізований.'
                : `Помилка: ${(error as Error)?.message ?? 'невідома'}`}
            </p>
            {!isMissing && (
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2"
              >
                <RefreshCw className="w-3 h-3" /> Спробувати знову
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const canAnyChanges = canManageWorkspace || canManageModel;

  return (
    <>
      <Section title="Простір" icon={Building2}>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Назва workspace
          </label>
          <input
            type="text"
            disabled={!canManageWorkspace}
            className={cn(
              "w-full h-10 px-3 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all",
              !canManageWorkspace ? "bg-secondary/40 text-muted-foreground cursor-not-allowed" : "bg-secondary"
            )}
            placeholder="Назва вашої компанії або проєкту"
            value={form.workspaceName}
            onChange={(e) => setForm((p: WorkspaceSettings) => ({ ...p, workspaceName: e.target.value }))}
          />
        </div>
      </Section>

      <Section title="Модель класифікації" icon={Brain}>
        <div className="space-y-2">
          <ModelOption
            value="DEFAULT" current={form.modelType}
            label="Стандартна модель (Zero-shot)"
            description="joeddav/xlm-roberta-large-xnli — багатомовна, не потребує навчання"
            disabled={!canManageModel}
            onChange={(v) => setForm((p: WorkspaceSettings) => ({ ...p, modelType: v }))}
          />
          <ModelOption
            value="CUSTOM" current={form.modelType}
            label="Власна модель (Hugging Face)"
            description="Вкажіть Model ID з Hugging Face Hub"
            disabled={!canManageModel}
            onChange={(v) => setForm((p: WorkspaceSettings) => ({ ...p, modelType: v, customModelId: p.customModelId || 'joeddav/xlm-roberta-large-xnli' }))}
          />
        </div>

        {form.modelType === 'CUSTOM' && (
          <div className="pt-1 animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Hugging Face Model ID
            </label>
            <input
              type="text"
              disabled={!canManageModel}
              className={cn(
                "w-full h-10 px-3 rounded-md border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                !canManageModel ? "bg-secondary/40 text-muted-foreground cursor-not-allowed" : "bg-secondary"
              )}
              placeholder="username/my-custom-model"
              value={form.customModelId ?? ''}
              onChange={(e) => setForm((p: WorkspaceSettings) => ({ ...p, customModelId: e.target.value }))}
              autoFocus={canManageModel}
            />
            <p className="text-xs text-muted-foreground font-mono mt-1.5">
              Приклад: <span className="text-foreground">joeddav/xlm-roberta-large-xnli</span>
            </p>
            {canManageModel && !form.customModelId && (
              <p className="text-xs text-amber-600 font-mono mt-1">
                ⚠ Вкажіть Model ID щоб зберегти налаштування
              </p>
            )}

            <ModelFormatInfo />

          </div>
        )}
      </Section>

      <div className="flex flex-col gap-2 mb-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveClick}
            disabled={isPending || !canAnyChanges || (form.modelType === 'CUSTOM' && !form.customModelId)}
            className="flex items-center gap-2 h-9 px-5 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved ? <CheckCircle2 className="w-4 h-4" />
                : <Save className="w-4 h-4" />}
            {saved ? 'Збережено' : 'Зберегти зміни'}
          </button>
        </div>

        {isSaveError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-mono leading-relaxed">
              {getErrorMessage()}
            </p>
          </div>
        )}
      </div>

      <div className="mb-10">
        {/* Передаємо права керування ключами (OWNER = false, EDITOR = true) */}
        <ApiKeysSettings readOnly={!canManageApiKeys} /> 
      </div>

      {/* Блок видалення простору - isOwner */}
      {isOwner && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-destructive">Видалити простір</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">
                Після видалення всі дані, включаючи категорії, повідомлення та налаштування, будуть втрачені назавжди. Цю дію неможливо скасувати.
              </p>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md text-xs font-medium transition-colors"
              >
                Видалити цей простір
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПІДТВЕРДЖЕННЯ ЗМІНИ МОДЕЛІ */}
      {isModelChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isPending && setIsModelChangeModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1.5">Зміна базової моделі</h2>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  Ви змінюєте NLP-модель простору. Це призведе до <strong>повного скидання поточного k-NN індексу</strong>.
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1.5 marker:text-muted-foreground/50 mb-6">
                  <li>Система автоматично розпочне фонове перенавчання на новій моделі.</li>
                  <li>Усі ваші існуючі категорії та розмічені повідомлення <strong className="text-foreground">будуть збережені</strong>.</li>
                  <li>До завершення перенавчання (зазвичай до 1 хвилини), класифікація працюватиме через повільніший Zero-Shot метод.</li>
                </ul>
                <div className="flex gap-2">
                  <button
                    disabled={isPending}
                    onClick={() => setIsModelChangeModalOpen(false)}
                    className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    Скасувати
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      setIsModelChangeModalOpen(false);
                      mutate(form);
                    }}
                    className="flex-1 h-9 bg-amber-500 text-white rounded-md text-sm font-medium hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Продовжити
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПІДТВЕРДЖЕННЯ ВИДАЛЕННЯ */}
      {isDeleteModalOpen && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setIsDeleteModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-5">
            <h2 className="text-lg font-bold text-destructive mb-2">Видалити простір?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Введіть <strong className="text-foreground select-all">{data?.workspaceName}</strong> для підтвердження.
            </p>

            <input
              autoFocus
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-destructive mb-5"
              placeholder="Введіть назву простору..."
            />

            <div className="flex gap-2">
              <button
                disabled={isDeleting}
                onClick={() => { setIsDeleteModalOpen(false); setConfirmName('') }}
                className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
              >
                Скасувати
              </button>
              <button
                disabled={confirmName !== data?.workspaceName || isDeleting}
                onClick={() => currentWorkspaceId && deleteWorkspaceMutate(Number(currentWorkspaceId))}
                className="flex-1 h-9 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-medium tracking-tight">Налаштування</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">
          Конфігурація простору та NLP-моделі
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start max-w-6xl">
        <div className="w-full min-w-0">
          <SectionErrorBoundary title="Налаштування workspace">
            <WorkspaceSection />
          </SectionErrorBoundary>
        </div>
        <div className="sticky top-6 w-full hidden lg:block">
          <OnboardingWidget />
        </div>
      </div>
    </div>
  )
}