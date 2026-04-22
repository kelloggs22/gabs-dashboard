"use client";
import { useState } from 'react';
import { auth, db } from '../../firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginGabs() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      
      const adminRef = doc(db, "Adm", email.toLowerCase().trim());
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists() && adminSnap.data().role === 'admin') {
        router.push('/dashboard');
      } else {
        await auth.signOut();
        alert("Acesso restrito: Você não é um administrador.");
      }
    } catch (error: any) {
      alert("Erro ao entrar. Verifique seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async () => {
    if (!email) return alert("Digite seu e-mail primeiro.");
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      alert("E-mail de recuperação enviado para " + email);
    } catch (e) {
      alert("Erro ao enviar link de recuperação.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F5] flex items-center justify-center p-6 text-black">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-black text-[#00392D] text-center mb-10">Gabs Admin</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="E-mail Admin" 
            className="w-full p-4 rounded-2xl bg-gray-50 border outline-none focus:border-teal-500 text-black placeholder:text-gray-800"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Senha" 
            className="w-full p-4 rounded-2xl bg-gray-50 border outline-none focus:border-teal-500 text-black placeholder:text-black"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#00392D] text-white py-5 rounded-2xl font-bold hover:opacity-95"
          >
            {loading ? "Entrando..." : "ENTRAR"}
          </button>
        </form>
        <button onClick={handleRecuperarSenha} className="w-full mt-8 text-sm font-bold text-teal-600 hover:underline">
          Esqueci minha senha admin
        </button>
      </div>
    </div>
  );
}