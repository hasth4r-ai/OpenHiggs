import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Text to Image',
};

export default function TextToImagePage() {
  return <StandaloneShell initialTab="image" initialSubTab="t2i" />;
}
