import { createStore } from 'zustand/vanilla';

export const store = createStore(() => ({
    usersWhoChattedThisMinute: new Map<string, Set<string>>(),
    usersInVC: new Map<string, Set<string>>(),
}));
