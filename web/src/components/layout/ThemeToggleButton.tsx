import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/format';

export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn('rounded-xl p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg', className)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
