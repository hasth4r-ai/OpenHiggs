import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Image Studio',
};

export default function ImagePage() {
  return <StandaloneShell initialTab="image" initialSubTab="t2i" />;
}
