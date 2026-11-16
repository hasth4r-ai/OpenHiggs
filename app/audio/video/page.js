import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Video LipSync',
};

export default function AudioVideoPage() {
  return <StandaloneShell initialTab="lipsync" initialSubTab="video" />;
}
