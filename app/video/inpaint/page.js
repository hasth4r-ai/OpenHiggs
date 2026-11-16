import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Video Inpaint',
};

export default function VideoInpaintPage() {
  return <StandaloneShell initialTab="video" initialSubTab="inpaint" />;
}
