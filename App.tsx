import React, { useState, useCallback } from 'react';
import { UserRole, View, Doente, PNPrescription } from './types';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import PatientDetails from './views/PatientDetails';
import NewPrescription from './views/NewPrescription';
import Formulary from './views/Formulary';
import { initialDoentes } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.Pharmacist);
  const [doentes, setDoentes] = useState<Doente[]>(initialDoentes);
  const [prepCounter, setPrepCounter] = useState(100);

  const navigate = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const savePrescription = (doenteId: string, prescription: Omit<PNPrescription, 'id' | 'preparationNumber' | 'createdAt' | 'updatedAt' | 'status' | 'createdBy'>, editingId?: string) => {
    setDoentes(prevDoentes => {
        const newDoentes = prevDoentes.map(p => {
            if (p.id === doenteId) {
                if (editingId) {
                    // Update existing prescription
                    const updatedPrescriptions = p.prescriptions.map(presc => {
                        if (presc.id === editingId) {
                            return {
                                ...presc,
                                ...prescription,
                                updatedAt: new Date().toISOString(),
                                status: 'Pendente' as 'Pendente',
                            };
                        }
                        return presc;
                    });
                    return { ...p, prescriptions: updatedPrescriptions };
                } else {
                    // Add new prescription
                    const newPrescription: PNPrescription = {
                        ...prescription,
                        id: `presc_${Date.now()}`,
                        preparationNumber: prepCounter,
                        status: 'Pendente',
                        verifiedBy: undefined,
                        createdBy: currentUserRole,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    setPrepCounter(prev => prev + 1);
                    return { ...p, prescriptions: [...p.prescriptions, newPrescription] };
                }
            }
            return p;
        });
        return newDoentes;
    });
    navigate({ name: 'patientDetails', doenteId });
};


  const updatePrescriptionStatus = (doenteId: string, prescriptionId: string, status: 'Verificada' | 'Cancelada') => {
      setDoentes(prevDoentes =>
          prevDoentes.map(p => {
              if (p.id === doenteId) {
                  return {
                      ...p,
                      prescriptions: p.prescriptions.map(presc =>
                          presc.id === prescriptionId ? { ...presc, status, verifiedBy: currentUserRole, updatedAt: new Date().toISOString() } : presc
                      )
                  };
              }
              return p;
          })
      );
  };

  const deletePrescription = (doenteId: string, prescriptionId: string) => {
    setDoentes(prevDoentes =>
      prevDoentes.map(p =>
        p.id === doenteId
          ? { ...p, prescriptions: p.prescriptions.filter(presc => presc.id !== prescriptionId) }
          : p
      )
    );
  };

  const renderView = () => {
    switch (view.name) {
      case 'dashboard':
        return <Dashboard doentes={doentes} navigate={navigate} />;
      case 'patientDetails':
        const doente = doentes.find(p => p.id === view.doenteId);
        if (doente) {
          return <PatientDetails 
            doente={doente} 
            navigate={navigate} 
            currentUserRole={currentUserRole}
            updatePrescriptionStatus={updatePrescriptionStatus} 
            deletePrescription={deletePrescription}
          />;
        }
        navigate({name: 'dashboard'});
        return null;
      case 'newPrescription':
        const prescriptionDoente = doentes.find(p => p.id === view.doenteId);
        const editingPrescription = prescriptionDoente?.prescriptions.find(p => p.id === view.editingPrescriptionId);
        if (prescriptionDoente) {
          return <NewPrescription 
            doente={prescriptionDoente} 
            editingPrescription={editingPrescription}
            navigate={navigate} 
            savePrescription={savePrescription} 
          />;
        }
        navigate({name: 'dashboard'});
        return null;
      case 'formulary':
        return <Formulary />;
      default:
        return <Dashboard doentes={doentes} navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-main font-sans text-gray-800">
      <Header 
        userRole={currentUserRole} 
        onRoleChange={setCurrentUserRole}
        navigate={navigate}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderView()}
      </main>
    </div>
  );
};

export default App;