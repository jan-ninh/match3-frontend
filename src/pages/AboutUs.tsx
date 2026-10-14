import { useNavigate } from 'react-router';
import { CyberButton, CyberTitle } from '@/components';

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-full p-6 flex items-center justify-center">
      <section className="w-full max-w-xl rounded-[28px] border border-cyan-400/20 bg-slate-950/45 px-5 py-7 sm:px-8 sm:py-10 text-center backdrop-blur-md shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_0_24px_rgba(34,211,238,0.08),0_0_40px_rgba(168,85,247,0.12),0_24px_60px_rgba(2,6,23,0.55)]">
        <div className="flex flex-col items-center gap-6">
          <CyberTitle size="md">About Match-3</CyberTitle>

          <div className="flex max-w-md flex-col items-center gap-4">
            <p className="text-cyan-100/85">
              Cyberpunk Match-3 campaign with 11 stages. Complete the campaign to unlock Sandbox.
            </p>

            <p className="font-semibold text-cyan-600/90">No account required.</p>

            <p className="text-cyan-100/80">
              Create an account to save progress and access the leaderboard.
            </p>
          </div>

          <CyberButton size="md" label="Back" onClick={() => navigate('/')} />
        </div>
      </section>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 select-none text-sm font-normal tracking-wide text-cyan-100/65">
        © 2026 Jan Ninh
      </p>
    </main>
  );
}
