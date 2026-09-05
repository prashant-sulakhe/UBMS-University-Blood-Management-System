import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  onClick, 
  disabled, 
  loading = false,
  className = '',
  style = {}
}) {
  const baseClass = variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
  const opacityStyle = loading ? { opacity: 0.7 } : {};
  
  return (
    <button 
      type={type} 
      className={`${baseClass} ${className}`.trim()} 
      onClick={onClick} 
      disabled={disabled || loading}
      style={{ ...opacityStyle, ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
    >
      {loading ? <><Loader2 size={18} className="spin" /> Processing...</> : children}
    </button>
  );
}
