import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Motion Control',
};

export default function MotionControlPage() {
  return <StandaloneShell initialTab="video" initialSubTab="motioncontrol" />;
}
