import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Audio / LipSync',
};

export default function AudioPage() {
  return <StandaloneShell initialTab="lipsync" initialSubTab="image" />;
}
