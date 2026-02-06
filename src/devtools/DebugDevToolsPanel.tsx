type ToggleItem = {
  kind: 'toggle';
  label: string;
  value: boolean;
  onToggle?: () => void;
};

type ActionItem = {
  kind: 'action';
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

type Meta = {
  levelId: number;
  width: number;
  height: number;
  seed: number;
};

type Props = {
  locked: boolean;
  meta?: Meta;
  items: ToggleItem[];
  actions?: ActionItem[];
};

export default function DebugDevToolsPanel({ locked, meta, items, actions = [] }: Props) {
  return (
    <div className="w-[260px] shrink-0 rounded-2xl border border-white/10 bg-black/30 p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-white/90 font-semibold">Dev tools</div>
        <div className="text-white/50 text-xs">dev</div>
      </div>

      
      {meta ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
          <div className="text-[11px] font-semibold text-white/70">session</div>
          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] leading-snug">
            <div className="text-white/55">level</div>
            <div className="font-mono text-white/85">LEVEL {meta.levelId}</div>

            <div className="text-white/55">board</div>
            <div className="font-mono text-white/85">
              {meta.width}x{meta.height}
            </div>

            <div className="text-white/55">seed</div>
            <div className="font-mono text-white/85">{meta.seed}</div>
          </div>
        </div>
      ) : null}<div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] leading-snug">
        <div className="text-white/55">locked</div>
        <div className="font-mono text-white/85">{String(locked)}</div>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const disabled = !item.onToggle;

          const cls = [
            'w-full px-3 py-2 rounded-lg text-left',
            'border border-white/10',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10',
            item.value ? 'bg-white/15 text-white' : 'bg-black/20 text-white/80',
          ].join(' ');

          return (
            <button key={item.label} type="button" className={cls} onClick={() => item.onToggle?.()} disabled={disabled}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs">{item.label}</div>
                <div
                  className={[
                    'font-mono text-[10px] px-1.5 py-0.5 rounded-md border',
                    item.value ? 'border-white/20 text-white/90' : 'border-white/10 text-white/60',
                  ].join(' ')}
                >
                  {item.value ? 'ON' : 'OFF'}
                </div>
              </div>
            </button>
          );
        })}

        {actions.length ? <div className="h-px bg-white/10" /> : null}

        {actions.map((a) => {
          const disabled = !!a.disabled || !a.onPress;

          const cls = [
            'w-full px-3 py-2 rounded-lg text-left',
            'border border-white/10',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10',
            'bg-black/20 text-white/80',
          ].join(' ');

          return (
            <button key={a.label} type="button" className={cls} onClick={() => a.onPress?.()} disabled={disabled}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs">{a.label}</div>
                <div className="font-mono text-[10px] px-1.5 py-0.5 rounded-md border border-white/10 text-white/60">RUN</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
