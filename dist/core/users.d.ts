import { User } from "../types/core";
export declare const getUserById: (userId: string) => Promise<User | null>;
export declare const getUserByEmail: (email: string) => Promise<User | null>;
