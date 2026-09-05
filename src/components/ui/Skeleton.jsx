import './Skeleton.css';

export default function Skeleton({ className = '', style = {}, type = 'text', count = 1 }) {
  const elements = Array.from({ length: count }, (_, i) => (
    <div 
      key={i} 
      className={`skeleton skeleton-${type} ${className}`} 
      style={style}
    />
  ));

  return count === 1 ? elements[0] : <>{elements}</>;
}
