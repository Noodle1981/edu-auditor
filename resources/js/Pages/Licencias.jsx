import React from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { LicenciasTab } from '../Components/Hub/LicenciasTab';

const Licencias = () => {
  return (
    <SIAMELayout>
      <Head title="Buscar Licencias" />
      <LicenciasTab />
    </SIAMELayout>
  );
};

export default Licencias;
