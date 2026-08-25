const TONE = {
  info: 'var(--m-blue)',
  warn: 'var(--m-orange)',
  danger: 'var(--m-red)',
  success: 'var(--m-green)',
} as const

export function Callout({
  type = 'info',
  children,
}: {
  type?: keyof typeof TONE
  children: React.ReactNode
}) {
  const color = TONE[type] ?? TONE.info
  return (
    <div
      className="rounded-lg border-l-[3px] px-5 py-4 text-[15px] leading-relaxed [&>*+*]:mt-2"
      style={{
        borderColor: color,
        background: `color-mix(in srgb, ${color} 7%, transparent)`,
        borderRadius: '0 8px 8px 0',
      }}
    >
      {children}
    </div>
  )
}
