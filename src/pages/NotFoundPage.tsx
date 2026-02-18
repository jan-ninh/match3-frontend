import Lottie from 'lottie-react';
import notFoundAnimation from '@/assets/fx/404 Error.json';
import { Link } from 'react-router';
import { CyberButton } from '@/components';

export default function NotFoundPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-4">
      {/* Animation */}
      <div className="w-full max-w-xs">
        <Lottie
          animationData={notFoundAnimation}
          loop={true}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {/* Text Content
      <div className="text-center">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">404</h1>
        <p className="text-white/80 text-lg mb-6">Page Not Found</p>
      </div> */}

      {/* Back Button */}
      <Link to="/">
        <CyberButton label=" Back to Home" type="button" size="md" />
      </Link>
    </div>
  );
}
