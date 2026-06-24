import React from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { DesignacionesTab } from '../Components/Hub/DesignacionesTab';

const Designaciones = () => {
  return (
    <SIAMELayout>
      <Head title="Buscar Designaciones" />
      <DesignacionesTab />
    </SIAMELayout>
  );
};

export default Designaciones;
