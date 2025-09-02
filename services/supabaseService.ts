
import type { UserProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mock database
let mockProfiles: UserProfile[] = [
  { id: uuidv4(), username: 'alice@example.com' },
  { id: uuidv4(), username: 'bob@example.com' },
  { id: uuidv4(), username: 'charlie@example.com' },
  { id: uuidv4(), username: 'diana@example.com' },
  { id: uuidv4(), username: 'edward@example.com' },
];

class SupabaseService {
  private isInitialized = false;

  public initialize(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (token) {
          this.isInitialized = true;
          resolve();
        } else {
          reject(new Error('Authentication token is missing.'));
        }
      }, 500); // Simulate network delay
    });
  }

  public getUsers(): Promise<UserProfile[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.isInitialized) {
          return reject(new Error('Supabase client not initialized.'));
        }
        // Return a copy to prevent direct mutation of the mock db
        resolve([...mockProfiles]);
      }, 800); // Simulate network delay
    });
  }

  public deleteUser(userId: string): Promise<{ success: true }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.isInitialized) {
          return reject(new Error('Supabase client not initialized.'));
        }
        
        const initialLength = mockProfiles.length;
        mockProfiles = mockProfiles.filter(p => p.id !== userId);

        if (mockProfiles.length < initialLength) {
          resolve({ success: true });
        } else {
          reject(new Error(`User with ID ${userId} not found.`));
        }
      }, 600); // Simulate network delay
    });
  }
}

// Export a singleton instance
export const supabaseService = new SupabaseService();
