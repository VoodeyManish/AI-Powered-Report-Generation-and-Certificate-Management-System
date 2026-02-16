
import { User, StoredFile, UserStats } from '../types';

const API_BASE = 'http://localhost:3002/api';

/**
 * Check if database is connected
 */
export const dbIsConnected = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE}/health`);
        return response.ok;
    } catch (error) {
        console.error('❌ Database connection check failed:', error);
        console.error('API_BASE:', API_BASE);
        return false;
    }
};

/**
 * Seeds the database with demo users
 * Backend handles this automatically during initialization
 */
export const dbSeedDemoUsers = () => {
    // Backend seeds demo users automatically, no action needed here
    console.log('Demo users are seeded by backend on initialization');
};

/**
 * Create a new user
 */
export const dbCreateUser = async (user: User): Promise<User> => {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        return response.json();
    } catch (error) {
        console.error('❌ Failed to create user:', error);
        throw error;
    }
};

/**
 * Get user by email
 */
export const dbGetUserByEmail = async (email: string): Promise<User | undefined> => {
    try {
        const response = await fetch(`${API_BASE}/users/email/${encodeURIComponent(email)}`);

        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }

        const user = await response.json();
        return user || undefined;
    } catch (error) {
        console.error('❌ Failed to fetch user:', email, error);
        throw error;
    }
};

/**
 * Save a file to the database
 */
export const dbSaveFile = async (file: Omit<StoredFile, 'id' | 'createdAt' | 'downloadsCount'>): Promise<StoredFile> => {
    const response = await fetch(`${API_BASE}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save file');
    }

    const result = await response.json();
    return {
        ...file,
        id: result.id,
        createdAt: result.createdAt,
        downloadsCount: result.downloadsCount,
    };
};

/**
 * Get files for a user with role-based access control
 */
export const dbGetFilesForUser = async (userId: string): Promise<StoredFile[]> => {
    const response = await fetch(`${API_BASE}/files/user/${encodeURIComponent(userId)}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch files');
    }

    return response.json();
};

/**
 * Get stats for a user
 */
export const dbGetStatsForUser = async (userId: string): Promise<UserStats> => {
    const response = await fetch(`${API_BASE}/stats/${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch stats');
    }

    return response.json();
};

/**
 * Increment download count for a file
 */
export const dbIncrementDownload = async (userId: string, fileId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/files/${fileId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to increment download count');
    }
};

/**
 * Delete a specific file
 */
export const dbDeleteFile = async (fileId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete file');
    }
};

/**
 * Delete all files for a user
 */
export const dbDeleteAllUserFiles = async (userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/files/user/${encodeURIComponent(userId)}/all`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete all files');
    }
};

