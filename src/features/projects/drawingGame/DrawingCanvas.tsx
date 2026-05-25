import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

export interface DrawingCanvasHandle {
  exportImage: () => string // returns base64 data URL
  clear: () => void
}

type Tool = 'pen' | 'eraser'

const COLORS = [
  '#1c1c1e',
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
]
const PEN_SIZES = [3, 6, 12]

interface Props {
  disabled?: boolean
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  ({ disabled }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const lastPos = useRef<{ x: number; y: number } | null>(null)

    const [tool, setTool] = useState<Tool>('pen')
    const [color, setColor] = useState(COLORS[0])
    const [penSize, setPenSize] = useState(PEN_SIZES[0])

    useImperativeHandle(ref, () => ({
      exportImage: () => canvasRef.current?.toDataURL('image/png') ?? '',
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      },
    }))

    // White background on mount
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [])

    const getPos = (
      clientX: number,
      clientY: number
    ): { x: number; y: number } => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    }

    const drawLine = (
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = penSize * 4
        ctx.strokeStyle = 'rgba(0,0,0,1)'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = penSize
        ctx.strokeStyle = color
      }
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      // Restore white background under eraser
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    // ── Mouse events ───────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled) return
      drawing.current = true
      lastPos.current = getPos(e.clientX, e.clientY)
    }
    const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing.current || disabled) return
      const pos = getPos(e.clientX, e.clientY)
      if (lastPos.current) drawLine(lastPos.current, pos)
      lastPos.current = pos
    }
    const onMouseUp = () => {
      drawing.current = false
      lastPos.current = null
    }

    // ── Touch events ───────────────────────────────────────────────────
    const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return
      e.preventDefault()
      drawing.current = true
      const t = e.touches[0]
      lastPos.current = getPos(t.clientX, t.clientY)
    }
    const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!drawing.current || disabled) return
      e.preventDefault()
      const t = e.touches[0]
      const pos = getPos(t.clientX, t.clientY)
      if (lastPos.current) drawLine(lastPos.current, pos)
      lastPos.current = pos
    }
    const onTouchEnd = () => {
      drawing.current = false
      lastPos.current = null
    }

    const clearCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    return (
      <div className="flex flex-col gap-2">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className={`w-full rounded-xl border-2 border-gray-200 touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}`}
          style={{ background: '#fff' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tool toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${tool === 'pen' ? 'bg-primary text-theme' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setTool('pen')}
            >
              ✏️ ペン
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${tool === 'eraser' ? 'bg-primary text-theme' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setTool('eraser')}
            >
              🧹 消しゴム
            </button>
          </div>

          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && tool === 'pen' ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                style={{ background: c }}
                onClick={() => {
                  setColor(c)
                  setTool('pen')
                }}
              />
            ))}
          </div>

          {/* Pen size */}
          <div className="flex gap-1">
            {PEN_SIZES.map((s) => (
              <button
                key={s}
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${penSize === s ? 'border-primary bg-primary/10' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setPenSize(s)}
              >
                <div
                  className="rounded-full bg-gray-700"
                  style={{ width: s + 1, height: s + 1 }}
                />
              </button>
            ))}
          </div>

          {/* Clear */}
          <button
            className="ml-auto px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            onClick={clearCanvas}
            disabled={disabled}
          >
            🗑️ 全消し
          </button>
        </div>
      </div>
    )
  }
)

DrawingCanvas.displayName = 'DrawingCanvas'
export default DrawingCanvas
