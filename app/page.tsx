"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig'; // Ajuste o caminho
import { collection, getDocs, query, orderBy, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const getSemanaId = () => {
  const agora = new Date();
  const primeiroDiaAno = new Date(agora.getFullYear(), 0, 1);
  const dias = Math.floor((agora.getTime() - primeiroDiaAno.getTime()) / 86400000);
  const semana = Math.ceil((dias + primeiroDiaAno.getDay() + 1) / 7);
  return `${agora.getFullYear()}-W${semana}`; 
};

export default function Dashboard() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const router = useRouter();
  const semanaAtual = getSemanaId();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        // Verificação de segurança: O usuário logado é admin no banco?
        try {
          const adminRef = doc(db, "Adm", user.email?.toLowerCase() || "");
          const adminSnap = await getDoc(adminRef);
          
          if (adminSnap.exists() && adminSnap.data().role === 'admin') {
            fetchPacientes();
          } else {
            await signOut(auth);
            router.replace('/login');
          }
        } catch (e) {
          router.replace('/login');
        }
      }
    });
    return () => unsub();
  }, []);

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "pacientes"), 
        where("emailVerificado", "==", true),
        orderBy("nome", "asc")
      );
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        respondido_hoje: d.data().ultima_semana_respondida === semanaAtual 
      }));
      setPacientes(lista);
    } catch (e) { 
      console.error("Erro ao buscar pacientes:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const verDetalhes = async (paciente: any) => {
    setSelectedPaciente(paciente);
    try {
      const q = query(collection(db, "pacientes", paciente.id, "checkins"), orderBy("data_envio", "desc"));
      const snap = await getDocs(q);
      setHistorico(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error(error); }
  };

  const toggleConquista = async (pacienteId: string, campo: string, valorAtual: boolean) => {
    try {
      await updateDoc(doc(db, "pacientes", pacienteId), { [campo]: !valorAtual });
      setPacientes(prev => prev.map(p => p.id === pacienteId ? { ...p, [campo]: !valorAtual } : p));
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="min-h-screen bg-[#F0F7F5] flex items-center justify-center font-bold text-[#00392D]">Carregando Painel...</div>;

  return (
    <main className="min-h-screen bg-[#F0F7F5] p-10 font-sans text-black">
      <header className="max-w-7xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#00392D]">Dashboard Gabs 🌿</h1>
          <p className="text-teal-600 font-bold uppercase text-xs tracking-widest">Semana: {semanaAtual}</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-xs font-bold text-red-400 hover:text-red-600 uppercase">Sair do Painel</button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {pacientes.map(p => (
          <div key={p.id} className={`bg-white p-6 rounded-[35px] border-2 transition-all ${p.respondido_hoje ? 'border-green-200 shadow-lg' : 'border-transparent opacity-80'}`}>
            <div className="flex justify-between mb-4">
              <img src={p.avatar} className="w-12 h-12 rounded-full bg-gray-100 border-2 border-teal-100 object-cover" />
              <span className={`flex items-center text-[9px] font-black px-3 rounded-xl shadow-sm border ${p.respondido_hoje ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                {p.respondido_hoje ? '✓ RESPONDIDO' : '○ PENDENTE'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">{p.nome}</h3>
            <p className="text-[10px] text-gray-400 mb-4">@{p.username}</p>
            
            <div className="flex gap-2 my-4">
              <button onClick={() => toggleConquista(p.id, 'conquista_estrela', p.conquista_estrela)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${p.conquista_estrela ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-50 text-gray-300'}`}>⭐ ESTRELA</button>
              <button onClick={() => toggleConquista(p.id, 'conquista_coracao', p.conquista_coracao)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${p.conquista_coracao ? 'bg-red-400 text-white shadow-md' : 'bg-gray-50 text-gray-300'}`}>❤️ FOCO</button>
            </div>
            <button onClick={() => verDetalhes(p)} className="w-full bg-[#00392D] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#002b22] transition-colors">Analisar Respostas</button>
          </div>
        ))}
      </div>

      {selectedPaciente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[40px] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-black text-[#00392D]">Histórico: {selectedPaciente.nome}</h2>
              <button onClick={() => setSelectedPaciente(null)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
              {historico.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold">Nenhum check-in enviado ainda.</div>
              ) : (
                historico.map((c) => (
                  <div key={c.id} className="bg-white rounded-[30px] p-8 shadow-sm border border-teal-50 flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-48">
                      <p className="text-[10px] font-black text-teal-600 uppercase mb-3">Foto da Semana</p>
                      {c.foto_livre ? (
                        <img src={c.foto_livre} className="w-full aspect-square object-cover rounded-2xl shadow-md border-4 border-white" />
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                          <p className="text-gray-400 text-[10px] font-bold">Sem foto</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="bg-teal-50 text-teal-700 px-4 py-1 rounded-full text-[10px] font-black uppercase inline-block mb-4">Semana: {c.semana}</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-teal-50/50 p-4 rounded-2xl border border-white">
                          <p className="text-[8px] text-teal-600 font-bold uppercase">Nota Dieta</p>
                          <p className="text-xl font-black text-[#00392D]">{c.nota_alimento}/10</p>
                        </div>
                        <div className="bg-teal-50/50 p-4 rounded-2xl border border-white">
                          <p className="text-[8px] text-teal-600 font-bold uppercase">Água Diária</p>
                          <p className="text-xl font-black text-[#00392D]">{c.agua_litros}L</p>
                        </div>
                        <div className="bg-teal-50/50 p-4 rounded-2xl border border-white">
                          <p className="text-[8px] text-teal-600 font-bold uppercase">Treinos</p>
                          <p className="text-xl font-black text-[#00392D]">{c.dias_treino}d</p>
                        </div>
                        <div className="bg-teal-50/50 p-4 rounded-2xl border border-white">
                          <p className="text-[8px] text-teal-600 font-bold uppercase">No Plano</p>
                          <p className="text-xl font-black text-[#00392D]">{c.dias_plano}d</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-50">
                          <p className="text-[9px] font-black text-red-500 uppercase">Furo no plano:</p>
                          <p className="text-sm">{c.furo_plano || 'Nenhum'}</p>
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                          <p className="text-[9px] font-black text-blue-500 uppercase">Humor & Energia:</p>
                          <p className="text-sm">{c.humor || 'Ok'} / {c.energia || 'Média'}</p>
                        </div>
                      </div>
                      <div className="bg-[#00392D] p-6 rounded-[30px] shadow-lg">
                        <p className="text-teal-400 text-[10px] font-black uppercase mb-1">Mensagem do Paciente:</p>
                        <p className="text-white text-sm italic">"{c.extra || 'Sem recado...'}"</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}