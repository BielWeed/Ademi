
import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile } from './types';
import { supabaseService } from './services/supabaseService';
import UserTable from './components/UserTable';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

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
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'AUTH_TOKEN' && !isInitialized) {
        console.log('AUTH_TOKEN received from parent app.');
        try {
          await supabaseService.initialize(event.data.token);
          console.log('Supabase client initialized.');
          setIsInitialized(true);
          await loadUsers();
        } catch (err) {
           const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
           setError(`Initialization failed: ${errorMessage}`);
           setIsLoading(false);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isInitialized, loadUsers]);

  useEffect(() => {
    const handleLoad = () => {
      console.log('App loaded, sending APP_LOADED message to parent.');
      window.parent.postMessage({ type: 'APP_LOADED' }, '*');
    };

    // Using window.onload to ensure the entire app including scripts is ready
    if(document.readyState === 'complete') {
        handleLoad();
    } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) {
      try {
        await supabaseService.deleteUser(userId);
        console.log(`User ${userId} deleted.`);
        // Notify parent app of successful deletion
        window.parent.postMessage({ type: 'USER_DELETED', payload: { userId } }, '*');
        // Refresh the user list
        await loadUsers();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to delete user: ${errorMessage}`);
        alert(`Error: ${errorMessage}`);
      }
    }
  }, [loadUsers]);

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

    return <UserTable users={users} onDeleteUser={handleDeleteUser} />;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Administração de Usuários</h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default App;
