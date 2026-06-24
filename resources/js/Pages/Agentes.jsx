import React from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { AgentesTab } from '../Components/Hub/AgentesTab';

const Agentes = () => {
  return (
    <SIAMELayout>
      <Head title="Buscar Agentes" />
      <AgentesTab />
    </SIAMELayout>
  );
};

export default Agentes;
