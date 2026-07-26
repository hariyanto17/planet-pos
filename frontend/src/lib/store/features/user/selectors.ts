import { RootState } from "../../store";

export const selectSelectedUserId = (state: RootState) => state.user.selectedUserId;
