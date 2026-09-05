import { useState, useEffect, useCallback } from 'react';
import { Search, Droplet, User, Loader2, MapPin, Clock, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import DonorCard from '../components/features/DonorCard';
import Skeleton from '../components/ui/Skeleton';
import './SearchDonor.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SearchDonor() {
  const [bloodGroup, setBloodGroup] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { showToast } = useToast();
  const { socket, connected } = useSocket();

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (bloodGroup) params.append('blood_group', bloodGroup);
      if (locationFilter) params.append('city', locationFilter);

      const response = await fetch(`${API_BASE}/api/donor/available?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch donors');
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('API Error:', err);
      setError('Unable to connect to the live database.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [bloodGroup, locationFilter]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    
    const handleAvailabilityUpdate = (data) => {
      setResults(prev => {
        // If donor is in list and turns OFF, remove them (or update)
        if (data.availability_status === 'OFF') {
          return prev.filter(d => String(d.user_id) !== String(data.userId));
        }
        // If they turn ON, we might need to re-fetch to see if they match filters
        // but for now, if they are in the list, just keep them ON
        return prev.map(d => 
          String(d.user_id) === String(data.userId) 
            ? { ...d, availability_status: 'ON' } 
            : d
        );
      });
      
      // If the donor isn't in the list but turned ON, we should re-fetch if they match filters
      if (data.availability_status === 'ON' && hasSearched) {
         handleSearch(); 
      }
    };

    const handleProfileUpdateEvent = (data) => {
      setResults(prev => prev.map(d => 
        String(d.user_id) === String(data.userId) 
          ? { ...d, ...data.userData } 
          : d
      ));
    };

    socket.on('availability_updated', handleAvailabilityUpdate);
    socket.on('profile_updated', handleProfileUpdateEvent);
    socket.on('donor_profile_updated', handleSearch);
    socket.on('donor_removed', handleSearch);

    return () => {
      socket.off('availability_updated', handleAvailabilityUpdate);
      socket.off('profile_updated', handleProfileUpdateEvent);
      socket.off('donor_profile_updated', handleSearch);
      socket.off('donor_removed', handleSearch);
    };
  }, [socket, hasSearched, handleSearch]);

  const handleContact = (donorName) => {
    showToast(`Initiating secure real-time contact with ${donorName}...`, 'info');
  };

  return (
    <div className="search-page">
      <header className="page-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
          <Search color="var(--primary)" size={34} />
          Live Donor Search
        </h1>
        <p>Direct access to our TiDB Cloud donor network with millisecond synchronization.</p>
        <div className={`live-sync-indicator ${connected ? 'active' : ''}`} style={{ margin: '1rem auto', width: 'fit-content' }}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Live Data Sync Active' : 'Connecting to Server...'}
        </div>
      </header>

      <div className="search-container">
        <div className="glass-card search-filters-card">
          <form className="search-form" onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
            
            <div className="filter-group">
              <label><Droplet size={14} /> Blood Group</label>
              <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                <option value="">Any Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="filter-group">
              <label><MapPin size={14} /> City / Location</label>
              <input 
                type="text" 
                placeholder="Search city..." 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary search-btn" disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />} Search Live
            </button>
            
          </form>
        </div>

        <div className="search-results-section">
          {error && <div className="no-results glass-card"><h3 style={{color: 'var(--error)'}}>{error}</h3></div>}

          {!loading && !error && hasSearched && (
            <h3 className="results-count">
              Found {results.length} available {results.length === 1 ? 'donor' : 'donors'} match.
            </h3>
          )}

          {loading ? (
            <div className="donor-cards-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="donor-card glass-card">
                   <Skeleton type="avatar" />
                   <Skeleton type="text" style={{ marginTop: '1rem' }} />
                   <Skeleton type="button" style={{ marginTop: '1rem' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="donor-cards-grid">
              {results.map(donor => (
                <DonorCard key={donor.donor_id || donor.user_id} donor={donor} onContact={handleContact} />
              ))}
            </div>
          )}

          {!loading && !error && hasSearched && results.length === 0 && (
            <div className="no-results glass-card">
              <Search size={48} opacity={0.3} />
              <h3>No donors match your search.</h3>
              <p>Try searching for a different blood group or broader city name.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
