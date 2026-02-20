"use client";

import type { MeasurementProfileStatic } from "@/types/measurement";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

const STORAGE_KEY = "desynar_measurement_profiles_static";

type MeasurementProfilesContextValue = {
  profiles: MeasurementProfileStatic[];
  isLoading: boolean;
  addProfile: (
    profile: Omit<MeasurementProfileStatic, "id" | "createdAt" | "updatedAt">,
  ) => MeasurementProfileStatic;
  /** Append a profile returned from the API (e.g. after createFromCapture). */
  addProfileFromServer: (profile: MeasurementProfileStatic) => void;
  /** Replace profiles with API list (e.g. after GET measurement-profiles). Persists to storage. */
  setProfilesFromApi: (profiles: MeasurementProfileStatic[]) => void;
  updateProfile: (
    id: string,
    updates: Partial<MeasurementProfileStatic>,
  ) => void;
  deleteProfile: (id: string) => void;
  getProfile: (id: string) => MeasurementProfileStatic | null;
  refresh: () => Promise<void>;
};

const MeasurementProfilesContext =
  createContext<MeasurementProfilesContextValue | null>(null);

export function MeasurementProfilesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profiles, setProfiles] = useState<MeasurementProfileStatic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MeasurementProfileStatic[];
        setProfiles(Array.isArray(parsed) ? parsed : []);
      } else {
        setProfiles([]);
      }
    } catch {
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (next: MeasurementProfileStatic[]) => {
    setProfiles(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const addProfile = useCallback(
    (
      input: Omit<MeasurementProfileStatic, "id" | "createdAt" | "updatedAt">,
    ): MeasurementProfileStatic => {
      const now = new Date().toISOString();
      const id = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const profile: MeasurementProfileStatic = {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
      };
      persist([...profiles, profile]);
      return profile;
    },
    [profiles, persist],
  );

  const addProfileFromServer = useCallback(
    (profile: MeasurementProfileStatic) => {
      persist([...profiles, profile]);
    },
    [profiles, persist],
  );

  const setProfilesFromApi = useCallback(
    (next: MeasurementProfileStatic[]) => {
      persist(Array.isArray(next) ? next : []);
    },
    [persist],
  );

  const updateProfile = useCallback(
    (id: string, updates: Partial<MeasurementProfileStatic>) => {
      const next = profiles.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : p,
      );
      persist(next);
    },
    [profiles, persist],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      persist(profiles.filter((p) => p.id !== id));
    },
    [profiles, persist],
  );

  const getProfile = useCallback(
    (id: string): MeasurementProfileStatic | null => {
      return profiles.find((p) => p.id === id) ?? null;
    },
    [profiles],
  );

  const value: MeasurementProfilesContextValue = {
    profiles,
    isLoading,
    addProfile,
    addProfileFromServer,
    setProfilesFromApi,
    updateProfile,
    deleteProfile,
    getProfile,
    refresh: load,
  };

  return (
    <MeasurementProfilesContext.Provider value={value}>
      {children}
    </MeasurementProfilesContext.Provider>
  );
}

export function useMeasurementProfiles() {
  const ctx = useContext(MeasurementProfilesContext);
  if (!ctx)
    throw new Error(
      "useMeasurementProfiles must be used within MeasurementProfilesProvider",
    );
  return ctx;
}
