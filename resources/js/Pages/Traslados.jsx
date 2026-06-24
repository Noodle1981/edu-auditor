import React from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { TrasladosTab } from '../Components/Hub/TrasladosTab';

const Traslados = () => {
  return (
    <SIAMELayout>
      <Head title="Traslados y Distancias" />
      <TrasladosTab />
    </SIAMELayout>
  );
};

export default Traslados;
