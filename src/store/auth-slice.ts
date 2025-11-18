'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/lib/auth/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  accessToken: null,
  refreshToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setTokens(
      state,
      action: PayloadAction<{ accessToken?: string | null; refreshToken?: string | null }>
    ) {
      if (action.payload.accessToken !== undefined) {
        state.accessToken = action.payload.accessToken;
      }
      if (action.payload.refreshToken !== undefined) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
    clearUser(state) {
      state.user = null;
      state.loading = false;
      state.accessToken = null;
      state.refreshToken = null;
    },
  },
});

export const { setUser, setLoading, setTokens, clearUser } = authSlice.actions;
export const authReducer = authSlice.reducer;

