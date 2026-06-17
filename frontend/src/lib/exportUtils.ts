import { toPng, toSvg } from 'html-to-image'

export const downloadChart = async (
  elementRef: React.RefObject<HTMLElement | null>,
  fileName: string,
  format: 'png' | 'svg' = 'png'
) => {
  if (!elementRef.current) return

  try {

    const options = { backgroundColor: '#ffffff' }
    
    const dataUrl = format === 'png' 
      ? await toPng(elementRef.current, options)
      : await toSvg(elementRef.current, options)

    // Створюємо фейкове посилання для завантаження
    const link = document.createElement('a')
    link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.${format}`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Помилка при експорті графіка:', error)
    throw error
  }
}