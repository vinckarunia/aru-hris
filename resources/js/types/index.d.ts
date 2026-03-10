import { Config } from 'ziggy-js';

export interface User {
    id: string;
    name: string;
    email: string;
    email_verified_at?: string;
    role: 'SUPER_ADMIN' | 'ADMIN_ARU' | 'PIC' | 'WORKER';
    worker_id?: string | null;
    pic?: any; // Profil PIC
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    ziggy: Config & { location: string };
};
