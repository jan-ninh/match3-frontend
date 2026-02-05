import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export default function Loading() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/game-map');
    }, 2000); // 3 seconds

    return () => clearTimeout(timer); // cleanup
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
        <span className="absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0">Loading...</span>
      </div>
    </div>
  );
}
