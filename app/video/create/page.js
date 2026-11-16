import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Create Video',
};

export default function CreateVideoPage() {
  return <StandaloneShell initialTab="video" initialSubTab="create" />;
}
