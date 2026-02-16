
import { User, UserRole, StaffDesignation } from '../types';
import { dbCreateUser, dbGetUserByEmail } from './databaseService';

const SESSION_KEY = 'repocerti_session';

// --- Public API ---

/**
 * Registers a new user.
 */
export const registerUser = async (
    username: string, 
    email: string, 
    password_DO_NOT_STORE_PLAINTEXT: string, 
    role: UserRole,
    designation?: StaffDesignation
): Promise<User> => {
    
    const normalizedEmail = email.toLowerCase();

    const newUser: User = {
        id: Date.now().toString(),
        username,
        email: normalizedEmail,
        password_DO_NOT_STORE_PLAINTEXT,
        role,
        designation: role === 'staff' ? designation : undefined
    };

    try {
        await dbCreateUser(newUser);
    } catch (e: any) {
        throw new Error(e.message || 'Registration failed');
    }

    // Store user in sessionStorage (not localStorage) - cleared on browser close
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));

    return newUser;
};

/**
 * Logs a user in.
 */
export const loginUser = async (email: string, password_DO_NOT_STORE_PLAINTEXT: string): Promise<User> => {
    const normalizedEmail = email.toLowerCase();
    const user = await dbGetUserByEmail(normalizedEmail);

    // In a real app, you would compare password hashes here.
    if (user && user.password_DO_NOT_STORE_PLAINTEXT === password_DO_NOT_STORE_PLAINTEXT) {
        // Store user in sessionStorage (not localStorage) - cleared on browser close
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    }

    throw new Error('Invalid email or password.');
};

/**
 * Logs the current user out.
 */
export const logoutUser = (): void => {
    sessionStorage.removeItem(SESSION_KEY);
};

/**
 * Retrieves the currently logged-in user from the session.
 */
export const getCurrentUser = (): User | null => {
    try {
        const sessionJson = sessionStorage.getItem(SESSION_KEY);
        return sessionJson ? JSON.parse(sessionJson) : null;
    } catch (e) {
        console.error("Failed to parse session from sessionStorage", e);
        return null;
    }
};
