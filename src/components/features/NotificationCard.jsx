import { MapPin } from 'lucide-react';
import Button from '../ui/Button';

export default function NotificationCard({ type = 'info', message, location, time, onRespond }) {
  return (
    <div className={`notification-card ${type}`}>
      <div className="notif-content">
        <h4>{message}</h4>
        <div className="notif-meta">
          <span className="meta-item"><MapPin size={16} /> {location}</span>
          <span className="meta-time">{time}</span>
        </div>
      </div>
      {type === 'urgent' && onRespond && (
        <Button variant="primary" className="small-btn" onClick={onRespond}>Respond Now</Button>
      )}
    </div>
  );
}
