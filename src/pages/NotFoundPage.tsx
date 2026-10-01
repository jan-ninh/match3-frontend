import Lottie from 'lottie-react';
import notFoundAnimation from '@/assets/fx/404 Error.json';
import { useNavigate } from 'react-router';
import { CyberButton } from '@/components';
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="w-full min-h-full flex flex-col items-center justify-center gap-6 p-4 text-center">
      <div aria-hidden="true" className="w-full max-w-xs">
        <Lottie animationData={notFoundAnimation} loop autoplay />
      </div>
      <h1 className="text-2xl font-bold text-cyan-200">Page not found</h1>
      <CyberButton label="Back to Home" size="md" onClick={() => navigate('/')} />
    </main>
  );
}
