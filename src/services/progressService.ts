import type { ProgressStore } from './progress/ProgressStore';
import { LocalProgressStore } from './progress/LocalProgressStore';

export const progressStore: ProgressStore = new LocalProgressStore();