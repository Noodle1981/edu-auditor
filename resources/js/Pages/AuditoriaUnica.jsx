import React from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '@/Layouts/SIAMELayout';
import { AuditoriaUnicaTab } from '../Components/Hub/AuditoriaUnicaTab';

export default function AuditoriaUnica() {
  return (
    <SIAMELayout>
      <Head title="Auditoría Única por DNI" />
      <AuditoriaUnicaTab />
    </SIAMELayout>
  );
}
