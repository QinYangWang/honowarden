import { create } from "zustand";

export interface CipherItem {
  id: string;
  organizationId: string | null;
  folderId: string | null;
  type: number;
  name: string;
  notes: string | null;
  favorite: boolean;
  login?: {
    username?: string;
    password?: string;
    uris?: { uri: string }[];
    totp?: string;
  };
  card?: Record<string, string>;
  identity?: Record<string, string>;
  secureNote?: Record<string, unknown>;
  fields?: { name: string; value: string; type: number }[];
  revisionDate?: string;
  deletedDate?: string | null;
}

export interface FolderItem {
  id: string;
  name: string;
  revisionDate?: string;
}

interface VaultState {
  ciphers: CipherItem[];
  folders: FolderItem[];
  selectedCipherId: string | null;
  searchQuery: string;
  setCiphers: (ciphers: CipherItem[]) => void;
  setFolders: (folders: FolderItem[]) => void;
  selectCipher: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  updateCipher: (cipher: CipherItem) => void;
  removeCipher: (id: string) => void;
  addCipher: (cipher: CipherItem) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  ciphers: [],
  folders: [],
  selectedCipherId: null,
  searchQuery: "",

  setCiphers: (ciphers) => set({ ciphers }),
  setFolders: (folders) => set({ folders }),
  selectCipher: (id) => set({ selectedCipherId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  updateCipher: (cipher) =>
    set((state) => ({
      ciphers: state.ciphers.map((c) => (c.id === cipher.id ? cipher : c)),
    })),

  removeCipher: (id) =>
    set((state) => ({
      ciphers: state.ciphers.filter((c) => c.id !== id),
      selectedCipherId: state.selectedCipherId === id ? null : state.selectedCipherId,
    })),

  addCipher: (cipher) =>
    set((state) => ({
      ciphers: [...state.ciphers, cipher],
    })),
}));
