import io from 'socket.io-client';
import { app_url } from '../url';

export const socket = io(app_url);
export default socket;
