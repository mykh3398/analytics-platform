import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, CheckCircle2, AlertCircle, Trash2, Loader2, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { apiKeysApi } from '@/api/workspace' 
import { toast } from '@/store/toast'

export function ApiKeysSettings({ readOnly = false }: { readOnly?: boolean }) {
  const wsId = useAuthStore((s) => s.currentWorkspaceId)
  const qc = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 1. Отримання списку ключів
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys', wsId],
    queryFn: () => apiKeysApi.getKeys(Number(wsId)),
    enabled: !!wsId
  })

  // 2. Мутація для створення
  const createMutation = useMutation({
    mutationFn: (name: string) => apiKeysApi.createKey(Number(wsId), name),
    onSuccess: (newKey) => {
      setGeneratedKey(newKey)
      qc.invalidateQueries({ queryKey: ['api-keys', wsId] })
      toast.success('Ключ успішно створено')
    },
    onError: () => toast.error('Помилка при створенні ключа')
  })

  // 3. Мутація для видалення 
  const deleteMutation = useMutation({
    mutationFn: (keyId: number) => apiKeysApi.deleteKey(Number(wsId), keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys', wsId] })
      toast.success('Ключ видалено')
    }
  })

  const handleCreate = () => {
    if (!newKeyName.trim()) return
    createMutation.mutate(newKeyName.trim())
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setNewKeyName('')
    setGeneratedKey(null)
    setCopied(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-medium flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            API Ключі
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Використовуйте ці ключі для інтеграції аналітики у ваші власні системи або CRM.
          </p>
        </div>
        
        {/* Сховати кнопку створення, якщо readOnly */}
        {!readOnly && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 bg-foreground text-background rounded-md text-xs font-medium hover:opacity-85 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Створити ключ
          </button>
        )}
      </div>

      {/* Список існуючих ключів */}
      {isLoading ? (
        <div className="h-20 bg-secondary/50 animate-pulse rounded-lg" />
      ) : keys.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-8 text-center flex flex-col items-center">
          <Key className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">У вас ще немає активних API ключів</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/20">
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {key.keyValue}
                  </code>
                  <span className="text-[10px] text-muted-foreground">
                    Створено: {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {/* Блокуємо видалення, якщо readOnly */}
              <div className="flex items-center gap-2">
                 <button
                    onClick={() => handleCopy(key.keyValue)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                    title="Скопіювати ключ"
                 >
                    <Copy className="w-4 h-4" />
                 </button>
                 {!readOnly && (
                    <button
                        onClick={() => deleteMutation.mutate(key.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Видалити ключ"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка створення ключа */}
      {isModalOpen && !readOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6">
            <button onClick={closeModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>

            {!generatedKey ? (
              <>
                <h3 className="text-lg font-medium mb-1">Новий API ключ</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Введіть назву, щоб легко розпізнавати цей ключ у майбутньому.
                </p>

                <input
                  type="text"
                  placeholder="Наприклад: Зв'язок із CRM"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-ring mb-4"
                  autoFocus
                />

                <button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  className="w-full h-10 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Згенерувати
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="text-lg font-medium text-foreground">Ключ створено!</h3>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Будь ласка, скопіюйте цей ключ зараз. З міркувань безпеки, ви <b>більше ніколи не зможете побачити його повністю</b>.
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <code className="flex-1 p-3 bg-secondary rounded-lg text-sm font-mono break-all border border-border">
                    {generatedKey}
                  </code>
                  <button
                    onClick={() => handleCopy(generatedKey)}
                    className="h-11 px-4 bg-secondary border border-border hover:border-foreground/30 rounded-lg text-foreground flex items-center gap-2 transition-colors shrink-0"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full h-10 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 transition-opacity"
                >
                  Я зберіг ключ
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}