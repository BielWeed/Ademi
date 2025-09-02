import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile } from './types';
import { supabaseService } from './services/supabaseService';
import UserTable from './components/UserTable';
import Spinner from './components/Spinner';
import SearchInput from './components/SearchInput';
import ConfirmationModal from './components/ConfirmationModal';
import Toast from './components/Toast';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

const App: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await supabaseService.getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to load users: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let initTimeout: number;

    const initializeApp = async (token: string) => {
      // Prevent re-initialization if a token arrives after the timeout has already fired
      if (isInitialized) {
        return;
      }

      try {
        await supabaseService.initialize(token);
        console.log('Supabase client initialized.');
        setIsInitialized(true);
        await loadUsers();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Initialization failed: ${errorMessage}`);
        setIsLoading(false);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'AUTH_TOKEN') {
        console.log('AUTH_TOKEN received from parent app.');
        clearTimeout(initTimeout); // Cancel the dev mode fallback
        initializeApp(event.data.token);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent app that the micro-app has loaded.
    // This helps the parent app know when it can send the token.
    if (window.self !== window.top) {
      console.log('App loaded, sending APP_LOADED message to parent.');
      window.parent.postMessage({ type: 'APP_LOADED' }, '*');
    }
    
    // Fallback to initialize in dev mode if no token is received after a short delay.
    // This allows development even if the app is inside a dev iframe without a real parent.
    initTimeout = window.setTimeout(() => {
      if (!isInitialized) {
        console.warn('No token received, initializing in dev mode as a fallback.');
        initializeApp('dev-mock-token');
      }
    }, 1500);

    // Cleanup function runs when the component unmounts or before the effect re-runs.
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(initTimeout);
    };
  }, [isInitialized, loadUsers]);

  const handleDeleteRequest = useCallback((user: UserProfile) => {
    setUserToDelete(user);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return;

    try {
      await supabaseService.deleteUser(userToDelete.id);
      console.log(`User ${userToDelete.id} deleted.`);
      // Also notify parent app upon successful deletion
      if (window.self !== window.top) {
        window.parent.postMessage({ type: 'USER_DELETED', payload: { userId: userToDelete.id } }, '*');
      }
      setToast({ message: 'Usuário deletado com sucesso!', type: 'success' });
      setUserToDelete(null); // Close modal
      await loadUsers(); // Refresh the user list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setToast({ message: `Falha ao deletar usuário: ${errorMessage}`, type: 'error' });
      console.error(`Failed to delete user: ${errorMessage}`);
      setUserToDelete(null); // Close modal
    }
  }, [userToDelete, loadUsers]);

  const filteredUsers = useMemo(() => 
    users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  const renderContent = () => {
    if (!isInitialized && isLoading) {
      return (
        <div className="text-center p-8">
          <Spinner />
          <p className="mt-4 text-gray-600">Aguardando autorização do aplicativo principal...</p>
        </div>
      );
    }
    
    if (isLoading) {
      return (
         <div className="text-center p-8">
          <Spinner />
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      );
    }

    if (error) {
      return <div className="text-center p-8 text-red-600 bg-red-100 rounded-lg">{error}</div>;
    }

    if (users.length === 0) {
      return <div className="text-center p-8 text-gray-500">Nenhum usuário encontrado.</div>;
    }

    return (
        <>
            <div className="mb-6">
                <SearchInput 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por email..."
                />
            </div>
            {filteredUsers.length > 0 ? (
                <UserTable users={filteredUsers} onDeleteUser={handleDeleteRequest} />
            ) : (
                <div className="text-center p-8 text-gray-500">Nenhum usuário corresponde à sua busca.</div>
            )}
        </>
    );
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
      >
        Tem certeza que deseja deletar o usuário <strong>{userToDelete?.username}</strong>? Esta ação não pode ser desfeita.
      </ConfirmationModal>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Administração de Usuários</h2>
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default App;