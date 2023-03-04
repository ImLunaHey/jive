import { createStore } from 'zustand/vanilla';

export const store = createStore(() => ({
    usersWhoChattedThisMinute: new Set<string>(),
    usersInVC: new Set<string>(),
}));
