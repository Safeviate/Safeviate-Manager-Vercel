'use client';

import { useRouter } from 'next/navigation';
import { AircraftForm } from '../aircraft-form';

export default function NewAircraftPage() {
  const router = useRouter();
  
  const handleSave = () => {
    router.push('/assets/aircraft');
  };

  const handleCancel = () => {
    router.back();
  };

  return <AircraftForm onSave={handleSave} onCancel={handleCancel} />;
}
