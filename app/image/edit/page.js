import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'OpenHiggs · Edit Image',
};

export default function EditImagePage() {
  return <StandaloneShell initialTab="image" initialSubTab="edit" />;
}
