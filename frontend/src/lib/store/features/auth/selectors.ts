import { RootState } from "../../store";
import { authCookie } from "../../../../utils/authCookie";

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token || authCookie.getToken();
export const selectIsAuthenticated = (state: RootState) => !!(state.auth.token || authCookie.getToken());
