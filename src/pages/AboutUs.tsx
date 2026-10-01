import { useNavigate } from 'react-router';
import { CyberButton, CyberTitle } from '@/components';
export default function AboutUs() {
  const navigate = useNavigate();
  return (
    <main className="p-6 flex flex-col items-center justify-center min-h-full text-center gap-6">
      <CyberTitle size="md">About Match-3</CyberTitle>
      <p className="max-w-md text-cyan-100/80">
        A cyberpunk puzzle campaign with 11 stages, changing objectives and three powers. Complete the campaign to unlock the optional sandbox.
      </p>
      <p className="max-w-md text-cyan-100/80">Play Demo without signup. An optional account saves your progress and ranks completed campaigns.</p>
      <CyberButton size="md" label="Back to Home" onClick={() => navigate('/')} />
    </main>
  );
}
