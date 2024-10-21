import React, { useState, useEffect } from 'react';
import { UserMinus, Search, Clock, Calendar, Activity } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

interface Patient {
  mrn: string;
  patient_name: string;
  admission_date: string;
  admission_time: string;
  patient_status: string;
  specialty: string;
}

interface Consultation {
  mrn: string;
  patient_name: string;
  created_at: string;
  status: string;
  consultation_specialty: string;
}

const specialtiesList = [
  'General Internal Medicine',
  'Respiratory Medicine',
  'Infectious Diseases',
  'Neurology',
  'Gastroenterology',
  'Rheumatology',
  'Hematology',
  'Thrombosis Medicine',
  'Immunology & Allergy',
  'Safety Admission',
  'Medical Consultations'
];

const PatientDischarge: React.FC = () => {
  const [patients, setPatients] = useState<(Patient | Consultation)[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | Consultation | null>(null);
  const [dischargeDate, setDischargeDate] = useState('');
  const [dischargeTime, setDischargeTime] = useState('');
  const [dischargeNote, setDischargeNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  useEffect(() => {
    fetchActivePatients();
  }, []);

  const fetchActivePatients = async () => {
    try {
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          mrn,
          patient_name,
          admission_date,
          admission_time,
          patient_status,
          specialty
        `)
        .eq('patient_status', 'Active')
        .order('admission_date', { ascending: false });

      const { data: consultationsData, error: consultationsError } = await supabase
        .from('consultations')
        .select(`
          mrn,
          patient_name,
          created_at,
          status,
          consultation_specialty
        `)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;
      if (consultationsError) throw consultationsError;

      const formattedPatientsData = patientsData.map((patient: any) => ({
        ...patient,
        admission_date: new Date(patient.admission_date).toLocaleDateString(),
        type: 'patient'
      }));

      const formattedConsultationsData = consultationsData.map((consultation: any) => ({
        ...consultation,
        admission_date: new Date(consultation.created_at).toLocaleDateString(),
        admission_time: new Date(consultation.created_at).toLocaleTimeString(),
        patient_status: consultation.status,
        specialty: consultation.consultation_specialty,
        type: 'consultation'
      }));

      setPatients([...formattedPatientsData, ...formattedConsultationsData]);
    } catch (error) {
      console.error('Error fetching active patients and consultations:', error);
      toast.error('Failed to fetch active patients and consultations');
    }
  };

  const handlePatientSelect = (patient: Patient | Consultation) => {
    setSelectedPatient(patient);
    setDischargeDate(new Date().toISOString().split('T')[0]);
    setDischargeTime(new Date().toTimeString().split(' ')[0].slice(0, 5));
    setDischargeNote('');
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !dischargeDate || !dischargeTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const isConsultation = (selectedPatient as any).type === 'consultation';
      const table = isConsultation ? 'consultations' : 'patients';
      const statusField = isConsultation ? 'status' : 'patient_status';

      const { error } = await supabase
        .from(table)
        .update({ 
          [statusField]: isConsultation ? 'Completed' : 'Discharged',
          updated_at: new Date().toISOString(),
          discharge_note: dischargeNote,
          discharge_date: `${dischargeDate}T${dischargeTime}:00`
        })
        .eq('mrn', selectedPatient.mrn);

      if (error) throw error;

      toast.success(`${isConsultation ? 'Consultation' : 'Patient'} ${selectedPatient.patient_name} has been successfully discharged.`);
      setPatients(patients.filter(patient => patient.mrn !== selectedPatient.mrn));
      setSelectedPatient(null);
      setDischargeDate('');
      setDischargeTime('');
      setDischargeNote('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to discharge patient');
    }
  };

  const filteredPatients = patients.filter(patient =>
    (patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     patient.mrn.includes(searchTerm)) &&
    (selectedSpecialty ? patient.specialty === selectedSpecialty : true)
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Patient Discharge</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Active Patients and Consultations</h2>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Filter by Specialty</label>
              <select
                id="specialty"
                name="specialty"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="">All Specialties</option>
                {specialtiesList.map((specialty) => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
          </div>
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredPatients.map((patient) => (
              <li
                key={patient.mrn}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => handlePatientSelect(patient)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600 truncate">{patient.patient_name}</p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {(patient as any).type === 'consultation' ? 'Consultation' : 'Admission'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      MRN: {patient.mrn}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    <p>
                      {(patient as any).type === 'consultation' ? 'Created' : 'Admitted'}: {patient.admission_date} {patient.admission_time}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    <Activity className="inline-block mr-1.5 h-5 w-5 text-gray-400" />
                    Specialty: {patient.specialty}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {selectedPatient && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Discharge {(selectedPatient as any).type === 'consultation' ? 'Consultation' : 'Patient'}: {selectedPatient.patient_name}
              </h3>
              <form onSubmit={handleDischarge} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="dischargeDate" className="block text-sm font-medium text-gray-700">
                    Discharge Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="dischargeDate"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      value={dischargeDate}
                      onChange={(e) => setDischargeDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="dischargeTime" className="block text-sm font-medium text-gray-700">
                    Discharge Time
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="dischargeTime"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      value={dischargeTime}
                      onChange={(e) => setDischargeTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="dischargeNote" className="block text-sm font-medium text-gray-700">
                    Discharge Note
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="dischargeNote"
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={dischargeNote}
                      onChange={(e) => setDischargeNote(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <UserMinus className="h-5 w-5 mr-2" />
                    Discharge {(selectedPatient as any).type === 'consultation' ? 'Consultation' : 'Patient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDischarge;